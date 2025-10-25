/**
 * OpenAI Responses API + MCP middleware
 *
 * Goals:
 * 1) Handle OpenAI Responses API intermittent bug with previous_response_id (GitHub issue #2255)
 *    Solution: Omit previous_response_id, let chain continue via function_call_output
 * 2) Ensure function_call_output.output is a string (JSON-stringify non-strings)
 * 3) Use store=false with tools to avoid item_reference issues
 * 4) Handle reasoning + function_call pairing requirements:
 *    - Every function_call MUST be preceded by a reasoning item
 *    - If streaming causes missing reasoning items, synthesize them
 *    - Ensure proper ordering: reasoning -> function_call -> other content
 * 
 * Based on official recommendation (2025-08): Skip previous_response_id to avoid
 * "Previous response not found" errors in default tier environments.
 * 
 * Note: The "function_call was provided without its required reasoning item" error
 * occurs when streaming responses lose the reasoning item due to network issues
 * or Tauri's SSE handling (sequence_number gaps).
 */

import type { LanguageModelV2Middleware } from '@ai-sdk/provider'
import type { CoreMessage } from 'ai'

// Global link-state across middleware instances, keyed by conversationKey
const getGlobalLinkMap = (): Map<string, string> => {
  try {
    const g = window as any
    g.__AIAW_RESP_LINKS = g.__AIAW_RESP_LINKS || new Map<string, string>()
    return g.__AIAW_RESP_LINKS
  } catch {
    // Non-browser fallback
    ;(getGlobalLinkMap as any)._m = (getGlobalLinkMap as any)._m || new Map<string, string>()
    return (getGlobalLinkMap as any)._m
  }
}

export function createOpenAIResponsesMCPMiddleware(): LanguageModelV2Middleware {
  let lastResponseId: string | undefined
  let lastItemId: string | undefined
  let conversationKey: string | undefined

  return {
    transformParams: async ({ params }) => {
      const p: any = params

      // Identify conversationKey (stable per dialog/thread)
      const providerOptions = p.providerOptions ?? {}
      const openaiBase = providerOptions.openai ?? {}
      conversationKey = openaiBase.conversationKey || conversationKey

      // Load lastResponseId from global map if available
      if (!lastResponseId && conversationKey) {
        const map = getGlobalLinkMap()
        const linked = map.get(conversationKey)
        if (linked) lastResponseId = linked
      }

      // Prefer to avoid server-side item_reference when tools are involved and we cannot chain
      const hasTools = !!(p?.tools || p?.toolChoice)

      // Build/merge provider options once to avoid duplication across branches
      // 基于官方推荐（OpenAI Codex GitHub issue #2255, 2025-08）：
      // 省略 previous_response_id 避免 intermittent bug（ID 链不匹配或存储临时失效）
      const openaiOptions = {
        ...openaiBase,
        // 官方推荐：省略 previousResponseId，让链通过 function_call_output 自然延续
        // ...(lastResponseId ? { previousResponseId: lastResponseId } : {}), // REMOVED
        // 使用 store=false 避免 item_reference 相关问题
        ...(hasTools ? { store: false } : {})
      }

      if (hasTools) {
        params = { ...p, providerOptions: { ...providerOptions, openai: openaiOptions } } as any
        try {
          console.log('[AIaW][MCP-MW] Official fix: omit previous_response_id, use store=false with tools')
        } catch {}
      }

      // Normalization helper to coerce tool outputs to string
      const normalize = (list: any[]) => list.map((message: CoreMessage) => {
        if (message.role === 'tool') {
          const content = (message as any).content
          if (Array.isArray(content)) {
            const transformed = content.map((part: any) => {
              if (part?.type === 'tool-result' && part.output) {
                const out = part.output
                let outputStr: string | undefined
                if (out.type === 'text' || out.type === 'error-text') outputStr = String(out.value ?? '')
                else if (out.type === 'json' || out.type === 'error-json') { try { outputStr = JSON.stringify(out.value) } catch { outputStr = String(out?.value) } }
                else if (out.type === 'execution-denied') outputStr = out.reason ?? 'Tool execution denied.'
                else if (out.type === 'content') { try { outputStr = JSON.stringify(out.value) } catch { outputStr = '[unserializable content]' } }

                if (outputStr !== undefined) return { ...part, output: { type: 'text', value: outputStr }, type: 'tool-result' }
              }
              return part
            })
            return { ...message, content: transformed } as CoreMessage
          }
        }
        return message
      })

      // Process messages to handle reasoning + function_call pairing
      const processMessages = (list: any[]) => {
        // First, collect all items to analyze the entire conversation
        const allItems: any[] = []
        const messageItems: any[] = []
        
        list.forEach((item: any) => {
          if (item.role === 'assistant') {
            // Extract items from assistant messages
            const content = (item as any).content
            if (Array.isArray(content)) {
              content.forEach((part: any) => {
                allItems.push(part)
              })
            }
            messageItems.push(item)
          } else if (item.type === 'function_call' || item.type === 'reasoning') {
            // Top-level function_call or reasoning items
            allItems.push(item)
          } else {
            // Other messages (user, system, etc.)
            messageItems.push(item)
          }
        })
        
        // Analyze all items for orphaned function_calls
        const reasoningItems = allItems.filter(item => item?.type === 'reasoning')
        const functionCalls = allItems.filter(item => item?.type === 'function_call')
        
        // If we have orphaned function_calls, synthesize reasoning
        if (functionCalls.length > 0 && reasoningItems.length < functionCalls.length && hasTools) {
          console.log(`[AIaW][MCP-MW] Found ${functionCalls.length} function_calls but only ${reasoningItems.length} reasoning items`)
          
          // Create a map of existing reasoning IDs
          const existingReasoningIds = new Set(reasoningItems.map(r => r.id))
          
          // Synthesize missing reasoning items
          functionCalls.forEach((fc) => {
            const expectedReasoningId = fc.id?.replace('fc_', 'rs_')
            if (expectedReasoningId && !existingReasoningIds.has(expectedReasoningId)) {
              const syntheticReasoning = {
                type: 'reasoning',
                text: `Using ${fc.name} tool for: ${fc.arguments ? JSON.parse(fc.arguments).query || 'request' : 'request'}`,
                id: expectedReasoningId || `rs_synthetic_${Date.now()}`,
                // 关键：必须包含 providerOptions 让 SDK 识别为 OpenAI reasoning
                providerOptions: {
                  openai: {
                    itemId: expectedReasoningId || `rs_synthetic_${Date.now()}`
                  }
                }
              }
              console.log(`[AIaW][MCP-MW] Synthesizing reasoning: ${syntheticReasoning.id}`)
              allItems.unshift(syntheticReasoning) // Add at beginning
            }
          })
        }
        
        // Now reconstruct the messages with proper ordering
        return list.map((item: any) => {
          if (item.role === 'assistant') {
            const content = (item as any).content
            if (Array.isArray(content)) {
              // Re-categorize with synthetic reasoning included
              const updatedReasoning: any[] = []
              const updatedFunctionCalls: any[] = []
              const otherItems: any[] = []
              
              // Include all items (original + synthetic)
              allItems.forEach((part: any) => {
                if (part?.type === 'reasoning') {
                  updatedReasoning.push(part)
                } else if (part?.type === 'function_call' && content.some((c: any) => c.id === part.id)) {
                  updatedFunctionCalls.push(part)
                } else if (content.some((c: any) => c === part)) {
                  otherItems.push(part)
                }
              })
              
              // Ensure proper ordering: reasoning -> function_call -> other
              const orderedContent = [...updatedReasoning, ...updatedFunctionCalls, ...otherItems]
              
              // Clean metadata - 但保留合成的 reasoning 的 providerOptions
              const transformed = orderedContent.map((part: any) => {
                if (part?.type === 'reasoning' && !lastResponseId) {
                  const po = part?.providerOptions?.openai
                  // 只清理有 encryptedContent 的，保留只有 itemId 的（合成的）
                  if (po?.reasoningEncryptedContent) {
                    const { providerOptions, ...rest } = part
                    return { ...rest, providerOptions: { ...(providerOptions || {}), openai: { itemId: po.itemId } } }
                  }
                }
                return part
              })
              
              return { ...(item as any), content: transformed }
            }
          } else if (item.type === 'reasoning' && hasTools) {
            // Top-level reasoning - check if we need to inject it before a function_call
            const matchingFc = functionCalls.find(fc => fc.id?.replace('fc_', 'rs_') === item.id)
            if (matchingFc) {
              // This reasoning should be injected before its function_call
              return item
            }
          }
          
          return item
        })
      }


      if (Array.isArray(p.messages)) return { ...(params as any), messages: processMessages(normalize(p.messages)) } as any
      if (Array.isArray(p.prompt)) return { ...(params as any), prompt: processMessages(normalize(p.prompt)) } as any

      return params as any
    },

    wrapGenerate: async ({ doGenerate }) => {
      const result = await doGenerate()

      // Track response metadata for follow-up tool outputs
      const meta = (result as any)?.providerMetadata?.openai as any
      if (meta) {
        if (meta.responseId) lastResponseId = meta.responseId
        if (meta.itemId) lastItemId = meta.itemId
        // Persist globally by conversationKey if present
        if (conversationKey && lastResponseId) {
          getGlobalLinkMap().set(conversationKey, lastResponseId)
        }
      }

      return result
    },

    wrapStream: async ({ doStream }) => {
      const stream: any = await doStream()

      // Case 1: Web ReadableStream
      if (stream && typeof stream.getReader === 'function') {
        const reader = stream.getReader()
        return new ReadableStream({
          async start(controller) {
            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                try {
                  // Provider metadata path
                  const metadata = (value as any)?.providerMetadata?.openai
                  if (metadata?.responseId) lastResponseId = metadata.responseId
                  if (metadata?.itemId) lastItemId = metadata.itemId

                  // Generic Responses API SSE shapes
                  if ((value as any)?.response?.id) lastResponseId = (value as any).response.id
                  if ((value as any)?.id && (value as any)?.object === 'response') lastResponseId = (value as any).id

                  if (conversationKey && lastResponseId) {
                    getGlobalLinkMap().set(conversationKey, lastResponseId)
                  }
                } catch {}
                controller.enqueue(value)
              }
            } finally {
              controller.close()
            }
          }
        })
      }

      // Case 2: AsyncIterable (common in AI SDK stream parts)
      if (stream && typeof stream[Symbol.asyncIterator] === 'function') {
        async function* iter() {
          for await (const value of stream) {
            try {
              const metadata = (value as any)?.providerMetadata?.openai
              if (metadata?.responseId) lastResponseId = metadata.responseId
              if (metadata?.itemId) lastItemId = metadata.itemId
              if ((value as any)?.response?.id) lastResponseId = (value as any).response.id
              if ((value as any)?.id && (value as any)?.object === 'response') lastResponseId = (value as any).id

              if (conversationKey && lastResponseId) {
                getGlobalLinkMap().set(conversationKey, lastResponseId)
              }
            } catch {}
            yield value
          }
        }
        return iter()
      }

      // Fallback: pass-through
      return stream
    }
  }
}
