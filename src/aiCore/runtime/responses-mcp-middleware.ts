/**
 * OpenAI Responses API + MCP middleware
 *
 * Goals:
 * 1) Handle OpenAI Responses API intermittent bug with previous_response_id (GitHub issue #2255)
 *    Solution: Omit previous_response_id, let chain continue via function_call_output
 * 2) Ensure function_call_output.output is a string (JSON-stringify non-strings)
 * 3) Use store=false with tools to avoid item_reference issues
 * 4) Remove reasoning items from input when using tools with store=false to prevent
 *    "function_call was provided without its required reasoning item" errors
 * 
 * Based on official recommendation (2025-08): Skip previous_response_id to avoid
 * "Previous response not found" errors in default tier environments.
 * 
 * Note: Reasoning items are output-only and should not be included in input when
 * store=false is used with tools.
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

      // Scrub reasoning items when using store=false
      // When store=false, reasoning items should not be included in input
      const scrubReasoning = (list: any[]) => list.map((message: CoreMessage) => {
        if (message.role === 'assistant') {
          const content = (message as any).content
          if (Array.isArray(content)) {
            // When hasTools and store=false, remove ALL reasoning items from input
            if (hasTools) {
              const transformed = content.filter((part: any) => {
                // Remove reasoning items entirely when store=false
                if (part?.type === 'reasoning') {
                  console.log('[AIaW][MCP-MW] Removing reasoning item to prevent "required reasoning" error')
                  return false
                }
                return true
              })
              return { ...(message as any), content: transformed }
            } else {
              // Original logic for non-tool scenarios
              const transformed = content.map((part: any) => {
                if (part?.type === 'reasoning') {
                  const po = part?.providerOptions?.openai
                  if (!lastResponseId && (po?.itemId || po?.reasoningEncryptedContent)) {
                    const { providerOptions, ...rest } = part
                    // remove openai meta to prevent server-side verification step
                    return { ...rest, providerOptions: { ...(providerOptions || {}), openai: undefined } }
                  }
                }
                return part
              })
              return { ...(message as any), content: transformed }
            }
          }
        }
        return message
      })


      if (Array.isArray(p.messages)) return { ...(params as any), messages: scrubReasoning(normalize(p.messages)) } as any
      if (Array.isArray(p.prompt)) return { ...(params as any), prompt: scrubReasoning(normalize(p.prompt)) } as any

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
