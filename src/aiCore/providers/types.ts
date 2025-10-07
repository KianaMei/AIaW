import type {
  AnthropicProviderSettings,
  AzureOpenAIProviderSettings,
  DeepSeekProviderSettings,
  GoogleGenerativeAIProviderSettings,
  OpenAICompatibleProviderSettings,
  OpenAIProviderSettings,
  XaiProviderSettings,
  EmbeddingModelV2 as EmbeddingModel,
  ImageModelV2 as ImageModel,
  LanguageModelV2 as LanguageModel,
  ProviderV2,
  SpeechModelV2 as SpeechModel,
  TranscriptionModelV2 as TranscriptionModel
} from '@ai-sdk/provider'

// Extensible provider settings map (can be augmented with dynamic providers)
export interface ExtensibleProviderSettingsMap {
  openai: OpenAIProviderSettings
  'openai-chat': OpenAIProviderSettings
  'openai-compatible': OpenAICompatibleProviderSettings
  anthropic: AnthropicProviderSettings
  google: GoogleGenerativeAIProviderSettings
  xai: XaiProviderSettings
  azure: AzureOpenAIProviderSettings
  deepseek: DeepSeekProviderSettings
}

export interface DynamicProviderRegistry {
  [key: string]: any
}

export type ProviderSettingsMap = ExtensibleProviderSettingsMap & DynamicProviderRegistry

export class ProviderError extends Error {
  constructor(
    message: string,
    public providerId: string,
    public code?: string,
    public cause?: Error
  ) {
    super(message)
    this.name = 'ProviderError'
  }
}

export type AiSdkModel = LanguageModel | ImageModel | EmbeddingModel<string> | TranscriptionModel | SpeechModel

export type AiSdkModelType = 'text' | 'image' | 'embedding' | 'transcription' | 'speech'

export const METHOD_MAP = {
  text: 'languageModel',
  image: 'imageModel',
  embedding: 'textEmbeddingModel',
  transcription: 'transcriptionModel',
  speech: 'speechModel'
} as const satisfies Record<AiSdkModelType, keyof ProviderV2>

export type AiSdkModelMethodMap = Record<AiSdkModelType, keyof ProviderV2>

export type AiSdkModelReturnMap = {
  text: LanguageModel
  image: ImageModel
  embedding: EmbeddingModel<string>
  transcription: TranscriptionModel
  speech: SpeechModel
}

export type AiSdkMethodName<T extends AiSdkModelType> = (typeof METHOD_MAP)[T]

export type AiSdkModelReturn<T extends AiSdkModelType> = AiSdkModelReturnMap[T]
