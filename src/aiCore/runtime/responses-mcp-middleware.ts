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
      // If we are replying with tool outputs, attach previous_response_id
      // so OpenAI Responses API can link function_call_output to the prior response (rs_*)
      try {
        const hasToolReply = Array.isArray((params as any).prompt)
          && (params as any).prompt.some((m: any) => m?.role === 'tool')

        if (hasToolReply && lastResponseId) {
          const providerOptions = (params as any).providerOptions ?? {}
          const openaiOptions = { ...(providerOptions.openai ?? {}), previousResponseId: lastResponseId, store: true }
          params = { ...(params as any), providerOptions: { ...providerOptions, openai: openaiOptions } } as any
          try { console.log('[AIaW][MCP-MW] Set previousResponseId =', lastResponseId) } catch {}
        }
      } catch {}

      // Normalize tool outputs within prompt (ensure output becomes string)
      if ((params as any).prompt) {
        const transformedMessages = (params as any).prompt.map((message: CoreMessage) => {
          if (message.role === 'tool') {
            const content = (message as any).content
            if (Array.isArray(content)) {
              const transformed = content.map((part: any) => {
                if (part?.type === 'tool-result' && part.output) {
                  const out = part.output
                  let outputStr: string | undefined
                  // Coerce any tool output to a plain string
                  if (out.type === 'text' || out.type === 'error-text') {
                    outputStr = String(out.value ?? '')
                  } else if (out.type === 'json' || out.type === 'error-json') {
                    try { outputStr = JSON.stringify(out.value) } catch { outputStr = String(out?.value) }
                  } else if (out.type === 'execution-denied') {
                    outputStr = out.reason ?? 'Tool execution denied.'
                  } else if (out.type === 'content') {
                    try { outputStr = JSON.stringify(out.value) } catch { outputStr = '[unserializable content]'}
                  }

                  if (outputStr !== undefined) {
                    return {
                      ...part,
                      output: { type: 'text', value: outputStr },
                      type: 'tool-result'
                    }
                  }
                }
                return part
              })

              return {
                ...message,
                content: transformed
              } as CoreMessage
            }
          }
          return message
        })

        return {
          ...params,
          prompt: transformedMessages
        }
      }

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
      const stream = await doStream()
      const reader = stream.getReader()

      return new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              // Capture response-metadata events with rs_* id
              if ((value as any)?.type === 'response-metadata') {
                const metadata = (value as any).providerMetadata?.openai
                if (metadata?.responseId) lastResponseId = metadata.responseId
                if (metadata?.itemId) lastItemId = metadata.itemId
              }

              controller.enqueue(value)
            }
          } finally {
            controller.close()
          }
        }
      })
    }
  }
}
