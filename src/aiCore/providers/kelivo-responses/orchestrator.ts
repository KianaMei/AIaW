import type { LanguageModelV2Middleware } from '@ai-sdk/provider'

type ToolMap = Record<string, {
  description?: string
  inputSchema?: any
  execute: (args: any) => Promise<any>
  toModelOutput?: (result: any) => any
}>

type FirstRoundResult = {
  foundCall: boolean
  callId?: string
  callName?: string
  argsText?: string
  hadTextOutput?: boolean
}

function parseEventForFunctionCall(event: any, acc: FirstRoundResult): void {
  try {
    if (!event || typeof event !== 'object') return
    const t = event.type
    if (t === 'response.output_text.delta' || t === 'response.output_text.done') {
      acc.hadTextOutput = true
    }
    if (t === 'response.output_item.added' && event.item?.type === 'function_call') {
      acc.foundCall = true
      acc.callId = event.item?.id || acc.callId
      acc.callName = event.item?.name || acc.callName
    }
    if (t === 'response.function_call_arguments.delta') {
      const callId = event.call_id || event.callId || acc.callId
      if (callId && !acc.callId) acc.callId = callId
      const delta = event.delta ?? event.arguments_delta ?? event.arguments || ''
      acc.argsText = (acc.argsText || '') + String(delta || '')
    }
    if (t === 'response.function_call_arguments.done') {
      const callId = event.call_id || event.callId || acc.callId
      if (callId && !acc.callId) acc.callId = callId
      const args = event.arguments ?? ''
      if (args) acc.argsText = String(args)
    }
    if (t === 'response.output_item.delta' && event.item?.type === 'function_call') {
      const delta = event.delta?.arguments || ''
      acc.argsText = (acc.argsText || '') + String(delta || '')
      acc.callId = event.item?.id || acc.callId
      acc.callName = event.item?.name || acc.callName
    }
  } catch {}
}

export function createKelivoResponsesOrchestratorMiddleware(): LanguageModelV2Middleware {
  return {
    async wrapGenerate({ doGenerate, doStream, params }) {
      const p: any = params || {}
      const tools: ToolMap | undefined = p.tools

      if (!tools || Object.keys(tools).length === 0) {
        return doGenerate()
      }

      // Use streaming API to discover function_call in first round
      const first = await doStream()
      const acc: FirstRoundResult = { foundCall: false, hadTextOutput: false }

      // Drain completely to detect function call
      const iter = (first as any)?.[Symbol.asyncIterator] ? (first as AsyncIterable<any>) : null
      if (iter) {
        for await (const ev of iter) parseEventForFunctionCall(ev, acc)
      } else if (typeof (first as any)?.getReader === 'function') {
        const reader = (first as any).getReader()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          parseEventForFunctionCall(value, acc)
        }
      }

      if (!acc.foundCall || acc.hadTextOutput) {
        // No tool call; return normal generate
        return doGenerate()
      }

      const toolName = acc.callName || ''
      const tool = tools[toolName]
      if (!tool) return doGenerate()

      let toolArgs: any = {}
      try { toolArgs = acc.argsText ? JSON.parse(acc.argsText) : {} } catch { toolArgs = {} }

      let toolOutput: any
      try {
        const res = await tool.execute(toolArgs)
        toolOutput = tool.toModelOutput ? tool.toModelOutput(res) : { type: 'text', value: String(res) }
      } catch (e: any) {
        const errText = e?.message ? String(e.message) : 'Tool execution failed.'
        toolOutput = { type: 'error-text', value: errText }
      }

      const toolCallId = acc.callId || `${Date.now()}`
      const followMessages = Array.isArray(p.messages) ? [...p.messages] : (Array.isArray(p.prompt) ? [...p.prompt] : [])
      followMessages.push({
        role: 'tool',
        content: [{ type: 'tool-result', toolName, toolCallId, output: toolOutput }]
      })

      // Second round: stream and aggregate text/reasoning
      const second = await doStream({ ...p, messages: followMessages })
      let text = ''
      let reasoning = ''
      const iter2 = (second as any)?.[Symbol.asyncIterator] ? (second as AsyncIterable<any>) : null
      if (iter2) {
        for await (const ev of iter2) {
          if (ev?.type === 'text-delta') text += ev.text || ''
          else if (ev?.type === 'reasoning-delta') reasoning += ev.text || ''
          else if (ev?.type === 'error') throw ev.error
        }
      } else if (typeof (second as any)?.getReader === 'function') {
        const reader = (second as any).getReader()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          if (value?.type === 'text-delta') text += value.text || ''
          else if (value?.type === 'reasoning-delta') reasoning += value.text || ''
          else if (value?.type === 'error') throw value.error
        }
      }

      return { text, reasoningText: reasoning }
    },
    async wrapStream({ doStream, params }) {
      const p: any = params || {}
      const tools: ToolMap | undefined = p.tools

      if (!tools || Object.keys(tools).length === 0) {
        return doStream()
      }

      const first = await doStream()
      const acc: FirstRoundResult = { foundCall: false, hadTextOutput: false }

      async function drainFirstRound(): Promise<void> {
        const iter = (first as any)?.[Symbol.asyncIterator]
          ? first as AsyncIterable<any>
          : null
        if (iter) {
          for await (const ev of iter) {
            parseEventForFunctionCall(ev, acc)
          }
          return
        }
        if (typeof (first as any)?.getReader === 'function') {
          const reader = (first as any).getReader()
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            parseEventForFunctionCall(value, acc)
          }
          return
        }
      }

      await drainFirstRound()

      if (!acc.foundCall || acc.hadTextOutput) {
        return doStream()
      }

      const toolName = acc.callName || ''
      const tool = tools[toolName]
      if (!tool) {
        return doStream()
      }

      let toolArgs: any = {}
      try {
        toolArgs = acc.argsText ? JSON.parse(acc.argsText) : {}
      } catch {
        toolArgs = {}
      }

      let toolOutput: any
      try {
        const res = await tool.execute(toolArgs)
        toolOutput = tool.toModelOutput ? tool.toModelOutput(res) : { type: 'text', value: String(res) }
      } catch (e: any) {
        const errText = e?.message ? String(e.message) : 'Tool execution failed.'
        toolOutput = { type: 'error-text', value: errText }
      }

      const toolCallId = acc.callId || `${Date.now()}`
      const followMessages = Array.isArray(p.messages) ? [...p.messages] : (Array.isArray(p.prompt) ? [...p.prompt] : [])
      followMessages.push({
        role: 'tool',
        content: [{
          type: 'tool-result',
          toolName,
          toolCallId,
          output: toolOutput
        }]
      })

      const second = await doStream({ ...p, messages: followMessages })
      return second
    }
  }
}
