/**
 * OpenAI Responses API + MCP 工具调用修复中间件
 * 
 * 解决 Vercel AI SDK 在 Responses API 模式下工具响应格式不正确的问题
 * 参考 Cherry Studio 的实现，但适配 AIaW 架构
 */

import type { LanguageModelV2Middleware } from '@ai-sdk/provider'
import type { CoreMessage, ToolResultPart } from 'ai'

interface ResponsesAPIState {
  isResponsesMode: boolean
  previousResponseId?: string
  toolCallMap: Map<string, {
    toolName: string
    toolCallId: string
    itemId?: string
  }>
}

/**
 * 创建 OpenAI Responses API + MCP 修复中间件
 */
export function createOpenAIResponsesMCPMiddleware(): LanguageModelV2Middleware {
  const state: ResponsesAPIState = {
    isResponsesMode: false,
    toolCallMap: new Map()
  }

  return {
    transformParams: async ({ params, model }) => {
      // 检测是否为 OpenAI Responses API
      const provider = model.provider || ''
      state.isResponsesMode = 
        provider.includes('responses') || 
        provider.includes('openai-response')

      if (!state.isResponsesMode || !params.prompt) {
        return params
      }

      // 转换消息格式，特别处理工具响应
      const transformedPrompt = await transformMessages(params.prompt, state)
      
      return {
        ...params,
        prompt: transformedPrompt
      }
    },

    wrapGenerate: async ({ doGenerate }) => {
      const result = await doGenerate()
      
      // 保存响应 ID
      if (state.isResponsesMode && result.providerMetadata?.openai) {
        const metadata = result.providerMetadata.openai as any
        if (metadata.responseId) {
          state.previousResponseId = metadata.responseId
        }
        
        // 提取工具调用信息
        if (result.toolCalls) {
          for (const toolCall of result.toolCalls) {
            state.toolCallMap.set(toolCall.toolCallId, {
              toolName: toolCall.toolName,
              toolCallId: toolCall.toolCallId,
              itemId: metadata.itemId
            })
          }
        }
      }
      
      return result
    },

    wrapStream: async ({ doStream }) => {
      const stream = await doStream()
      
      if (!state.isResponsesMode) {
        return stream
      }
      
      // 创建转换流来处理响应
      const reader = stream.getReader()
      const transformedStream = new ReadableStream({
        async start(controller) {
          let currentToolCalls: any[] = []
          
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              
              // 处理不同类型的 chunk
              if (value.type === 'response-metadata') {
                // 保存响应 ID
                if (value.providerMetadata?.openai?.responseId) {
                  state.previousResponseId = value.providerMetadata.openai.responseId
                }
              } else if (value.type === 'tool-calls') {
                // 收集工具调用信息
                currentToolCalls = value.toolCalls || []
                for (const toolCall of currentToolCalls) {
                  state.toolCallMap.set(toolCall.toolCallId, {
                    toolName: toolCall.toolName,
                    toolCallId: toolCall.toolCallId
                  })
                }
              }
              
              controller.enqueue(value)
            }
          } finally {
            controller.close()
          }
        }
      })
      
      return transformedStream
    }
  }
}

/**
 * 转换消息格式
 */
async function transformMessages(
  messages: CoreMessage[],
  state: ResponsesAPIState
): Promise<CoreMessage[]> {
  const transformed: CoreMessage[] = []
  
  for (const message of messages) {
    if (message.role === 'tool') {
      // 转换工具响应消息
      const toolMessages = await transformToolMessage(message, state)
      transformed.push(...toolMessages)
    } else {
      // 处理其他消息类型
      if (message.role === 'assistant' && message.content) {
        // 检查是否有工具调用
        const toolCallParts = message.content.filter(
          (part): part is any => part.type === 'tool-call'
        )
        
        // 记录工具调用信息
        for (const toolCall of toolCallParts) {
          if (toolCall.providerMetadata?.openai?.itemId) {
            state.toolCallMap.set(toolCall.toolCallId, {
              toolName: toolCall.toolName,
              toolCallId: toolCall.toolCallId,
              itemId: toolCall.providerMetadata.openai.itemId
            })
          }
        }
      }
      
      transformed.push(message)
    }
  }
  
  return transformed
}

/**
 * 转换工具响应消息
 * 参考 Cherry Studio 的实现，避免直接使用 function_call_output
 */
async function transformToolMessage(
  message: CoreMessage,
  state: ResponsesAPIState
): Promise<CoreMessage[]> {
  const result: CoreMessage[] = []
  
  // 从 message.content 中提取工具响应
  const toolResults = message.content.filter(
    (part): part is ToolResultPart => part.type === 'tool-result'
  )
  
  for (const toolResult of toolResults) {
    const toolInfo = state.toolCallMap.get(toolResult.toolCallId)
    
    if (toolInfo) {
      // 将工具响应包装为 assistant 消息，避免格式冲突
      result.push({
        role: 'assistant',
        content: [{
          type: 'text',
          text: formatToolResponse(toolResult)
        }],
        providerMetadata: {
          openai: {
            isToolResponse: true,
            toolCallId: toolResult.toolCallId,
            toolName: toolInfo.toolName,
            originalFormat: 'function_call_output'
          }
        }
      } as any)
    } else {
      // 如果没有找到工具信息，保持原格式
      result.push(message)
    }
  }
  
  return result.length > 0 ? result : [message]
}

/**
 * 格式化工具响应内容
 */
function formatToolResponse(toolResult: ToolResultPart): string {
  try {
    if (toolResult.result) {
      if (typeof toolResult.result === 'string') {
        return toolResult.result
      } else {
        return JSON.stringify(toolResult.result, null, 2)
      }
    }
    
    if (toolResult.isError) {
      return `[Tool Error]: ${toolResult.result || 'Unknown error'}`
    }
    
    return '[Tool Response: Empty]'
  } catch (error) {
    return `[Tool Response Format Error]: ${error}`
  }
}