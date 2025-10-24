/**
 * OpenAI Responses API + MCP middleware
 *
 * Goals:
 * 1) Preserve rs_* response linkage across tool calls by setting previous_response_id.
 * 2) Ensure function_call_output.output is a string (JSON-stringify non-strings).
 */

import type { LanguageModelV2Middleware } from '@ai-sdk/provider'
import type { CoreMessage } from 'ai'

export function createOpenAIResponsesMCPMiddleware(): LanguageModelV2Middleware {
  let lastResponseId: string | undefined
  let lastItemId: string | undefined

  return {
    transformParams: async ({ params }) => {
      const p: any = params

      // Prefer to avoid server-side item_reference when tools are involved to prevent
      // missing item errors if previous_response_id is not reliably attached.
      const hasTools = !!(p?.tools || p?.toolChoice)

      // Build/merge provider options once to avoid duplication across branches
      const providerOptions = p.providerOptions ?? {}
      const openaiBase = providerOptions.openai ?? {}
      const openaiOptions = {
        ...openaiBase,
        ...(lastResponseId ? { previousResponseId: lastResponseId } : {}),
        ...(hasTools ? { store: false } : {})
      }

      if (lastResponseId || hasTools) {
        params = { ...p, providerOptions: { ...providerOptions, openai: openaiOptions } } as any
        try {
          if (lastResponseId) console.log('[AIaW][MCP-MW] Set previousResponseId =', lastResponseId)
          if (hasTools) console.log('[AIaW][MCP-MW] Forced store=false when tools are present')
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


      if (Array.isArray(p.messages)) return { ...(params as any), messages: normalize(p.messages) } as any
      if (Array.isArray(p.prompt)) return { ...(params as any), prompt: normalize(p.prompt) } as any

      return params as any
    },

    wrapGenerate: async ({ doGenerate }) => {
      const result = await doGenerate()

      // Track response metadata for follow-up tool outputs
      const meta = (result as any)?.providerMetadata?.openai as any
      if (meta) {
        if (meta.responseId) lastResponseId = meta.responseId
        if (meta.itemId) lastItemId = meta.itemId
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
