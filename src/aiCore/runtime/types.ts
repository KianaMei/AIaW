export type generateTextParams = Parameters<(typeof import('ai'))['generateText']>[0]
export type streamTextParams = Parameters<(typeof import('ai'))['streamText']>[0]
export type generateObjectParams = Parameters<(typeof import('ai'))['generateObject']>[0]
export type streamObjectParams = Parameters<(typeof import('ai'))['streamObject']>[0]
export type generateImageParams = Parameters<(typeof import('ai'))['experimental_generateImage']>[0]

export type RuntimeConfig<T extends string = string> = {
  providerId: T
  providerSettings: any
  plugins?: any[]
}

export type AiRequestContext = {
  executor?: any
}

export type AiPlugin = {
  name: string
  enforce?: 'pre' | 'post'
  resolveModel?: (modelId: string) => Promise<any>
  configureContext?: (context: AiRequestContext) => Promise<void>
}
