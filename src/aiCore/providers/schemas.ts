import { z } from 'zod'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createAzure } from '@ai-sdk/azure'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { createXai } from '@ai-sdk/xai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { Provider } from 'ai'

export const baseProviderIds = [
  'openai',
  'openai-chat',
  'openai-compatible',
  'anthropic',
  'google',
  'xai',
  'azure',
  'deepseek',
  'openrouter'
] as const

export const baseProviderIdSchema = z.enum(baseProviderIds)
export type BaseProviderId = z.infer<typeof baseProviderIdSchema>

type BaseProvider = {
  id: BaseProviderId
  name: string
  creator: (options: any) => Provider
  supportsImageGeneration: boolean
}

export const baseProviders: BaseProvider[] = [
  { id: 'openai', name: 'OpenAI', creator: createOpenAI, supportsImageGeneration: true },
  { id: 'openai-chat', name: 'OpenAI Chat', creator: createOpenAI, supportsImageGeneration: true },
  { id: 'openai-compatible', name: 'OpenAI Compatible', creator: createOpenAICompatible, supportsImageGeneration: true },
  { id: 'anthropic', name: 'Anthropic', creator: createAnthropic, supportsImageGeneration: false },
  { id: 'google', name: 'Google Generative AI', creator: createGoogleGenerativeAI, supportsImageGeneration: true },
  { id: 'xai', name: 'xAI (Grok)', creator: createXai, supportsImageGeneration: true },
  { id: 'azure', name: 'Azure OpenAI', creator: createAzure, supportsImageGeneration: true },
  { id: 'deepseek', name: 'DeepSeek', creator: createDeepSeek, supportsImageGeneration: false },
  { id: 'openrouter', name: 'OpenRouter', creator: createOpenRouter as any, supportsImageGeneration: true }
]

export const customProviderIdSchema = z
  .string()
  .min(1)
  .refine((id) => !baseProviderIds.includes(id as any), {
    message: 'Custom provider ID cannot conflict with base provider IDs'
  })

export const providerIdSchema = z.union([baseProviderIdSchema, customProviderIdSchema])

export const providerConfigSchema = z
  .object({
    id: customProviderIdSchema,
    name: z.string().min(1),
    creator: z
      .function({
        input: z.any(),
        output: z.any()
      })
      .optional(),
    import: z.function().optional(),
    creatorFunctionName: z.string().optional(),
    supportsImageGeneration: z.boolean().default(false),
    imageCreator: z.function().optional(),
    validateOptions: z.function().optional(),
    aliases: z.array(z.string()).optional()
  })
  .refine((data) => data.creator || (data.import && data.creatorFunctionName), {
    message: 'Must provide either creator function or import configuration'
  })

export type ProviderConfig = z.infer<typeof providerConfigSchema>