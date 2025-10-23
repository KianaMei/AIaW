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

      // Always attach previous_response_id if we have one, because the SDK may emit item_reference
      // (e.g., reasoning references) even when there is no explicit tool result in this turn.
      if (lastResponseId) {
        const providerOptions = p.providerOptions ?? {}
        const openaiOptions = { ...(providerOptions.openai ?? {}), previousResponseId: lastResponseId, store: true }
        params = { ...p, providerOptions: { ...providerOptions, openai: openaiOptions } } as any
        try { console.log('[AIaW][MCP-MW] Set previousResponseId =', lastResponseId) } catch {}
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

      if (Array.isArray(p.messages)) return { ...params, messages: normalize(p.messages) }
      if (Array.isArray(p.prompt)) return { ...params, prompt: normalize(p.prompt) }

      return params
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
