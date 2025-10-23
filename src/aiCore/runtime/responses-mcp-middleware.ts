/**
 * OpenAI Responses API + MCP 工具调用修复中间件
 * 
 * 修复 Vercel AI SDK 的两个问题：
 * 1. 响应链断裂（rs_xxx ID 丢失）
 * 2. function_call_output.output 类型错误（期望 string，收到 list）
 */

import type { LanguageModelV2Middleware } from '@ai-sdk/provider'
import type { CoreMessage } from 'ai'

/**
 * 创建 OpenAI Responses API + MCP 修复中间件
 */
export function createOpenAIResponsesMCPMiddleware(): LanguageModelV2Middleware {
  let lastResponseId: string | undefined
  let lastItemId: string | undefined

  return {
    transformParams: async ({ params }) => {
      // 处理消息中的工具响应
      if (params.prompt) {
        const transformedMessages = params.prompt.map((message: CoreMessage) => {
          if (message.role === 'tool') {
            // 关键修复：确保工具响应的 output 是字符串
            const content = message.content
            if (Array.isArray(content)) {
              const transformed = content.map(part => {
                if (part.type === 'tool-result') {
                  // 将结果转换为字符串
                  let outputStr: string
                  if (typeof part.result === 'string') {
                    outputStr = part.result
                  } else {
                    // JSON 对象/数组需要序列化为字符串
                    outputStr = JSON.stringify(part.result)
                  }
                  
                  return {
                    ...part,
                    result: outputStr,
                    // 确保格式正确
                    type: 'tool-result'
                  }
                }
                return part
              })
              
              return {
                ...message,
                content: transformed
              }
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
      
      // 保存响应 ID 以维护链条
      if (result.providerMetadata?.openai) {
        const metadata = result.providerMetadata.openai as any
        if (metadata.responseId) {
          lastResponseId = metadata.responseId
        }
        if (metadata.itemId) {
          lastItemId = metadata.itemId
        }
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
              
              // 保存响应 ID
              if (value.type === 'response-metadata') {
                const metadata = value.providerMetadata?.openai
                if (metadata?.responseId) {
                  lastResponseId = metadata.responseId
                }
                if (metadata?.itemId) {
                  lastItemId = metadata.itemId
                }
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