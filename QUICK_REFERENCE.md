# Provider V2 Quick Reference

## Using the V2 Store

### Import
```typescript
import { useProvidersV2Store } from 'src/stores/providers-v2'

const providersStore = useProvidersV2Store()
```

## Common Operations

### Get All Providers
```typescript
// All providers (system + custom)
const all = providersStore.allProviders

// Only enabled
const enabled = providersStore.enabledProviders

// Only custom
const custom = providersStore.customProviders

// Only system
const system = providersStore.systemProviders
```

### Get Provider by ID
```typescript
const provider = providersStore.getProviderById('openai')
const name = providersStore.getProviderName('openai')
```

### Models
```typescript
// All models
const all = providersStore.allModels

// Models from enabled providers
const available = providersStore.availableModels

// Model autocomplete options
const options = providersStore.modelOptions

// Get specific model
const model = providersStore.getModelByUniqId('openai:gpt-4')

// Get display name
const name = providersStore.getModelDisplayName('openai:gpt-4')

// Get by provider
const models = providersStore.getModelsByProvider('openai')

// Search
const results = providersStore.searchModels('gpt')
```

### CRUD Operations

#### Create Custom Provider
```typescript
const id = await providersStore.addCustomProvider({
  name: 'My Provider',
  type: 'openai-compatible',
  apiHost: 'https://api.example.com',
  apiKey: 'sk-...',
  avatar: {
    type: 'icon',
    icon: 'sym_o_cloud',
    hue: 180
  }
})
```

#### Update Provider
```typescript
await providersStore.updateCustomProvider('provider-id', {
  apiKey: 'new-key',
  enabled: true
})
```

#### Delete Provider
```typescript
await providersStore.deleteCustomProvider('provider-id')
```

### Fetch Models from Provider
```typescript
const { models, source, error } = await providersStore.fetchProviderModels('openai')
// source is 'remote' | 'static' | 'cached'
// models is string[] of model IDs
// error (optional) contains remote error message when falling back to static
```

## Notes on Legacy APIs

- V2 store has no `providerTypes` and no legacy `providers` collection.
- Use `providersStore.fetchProviderModels(providerId)` or `ProviderService.listModels(provider)` for model discovery.

## Model Service

### Import
```typescript
import { ModelService } from 'src/services/ModelService'
```

### Usage
```typescript
// Get unique ID
const uniqId = ModelService.getModelUniqId(model)  // "openai:gpt-4"

// Parse unique ID
const parsed = ModelService.parseModelId('openai:gpt-4')
// { providerId: 'openai', modelId: 'gpt-4' }

// Get model by unique ID
const model = ModelService.getModelByUniqId('openai:gpt-4')

// Grouping and search
const grouped = ModelService.getGroupedModels()
const results = ModelService.searchModels('gpt')
```

## Provider Service

### Import
```typescript
import { ProviderService } from 'src/services/ProviderService'
```

### Usage
```typescript
// Get all providers
const providers = await ProviderService.getAllProviders()

// Get provider by ID
const provider = await ProviderService.getProviderById('openai')

// Validate provider
const result = await ProviderService.validateProvider(provider)
// { valid: true } or { valid: false, error: 'message' }

// List models from API
const models = await ProviderService.listModels(provider)

// Check features
const supportsVision = ProviderService.isSupportVision(provider)
const supportsArrayContent = ProviderService.isSupportArrayContent(provider)
```

## Legacy Converter

### Import
```typescript
import { 
  convertLegacyCustomProvider,
  convertToLegacyCustomProvider,
  extractModelMappings
} from 'src/services/LegacyProviderConverter'
```

### Convert Old to New
```typescript
const legacyProvider: CustomProvider = {
  id: 'my-provider',
  name: 'My Provider',
  subproviders: [...],
  fallbackProvider: {...}
}

const v2Providers: CustomProviderV2[] = convertLegacyCustomProvider(legacyProvider)
// Returns array - each subprovider becomes a separate provider
```

### Convert New to Old
```typescript
const v2Providers: CustomProviderV2[] = [...]

const legacy = convertToLegacyCustomProvider(v2Providers)
```

### Extract Model Mappings
```typescript
const mappings = extractModelMappings(legacyProvider)
// { 'model-id': 'mapped-model-id', ... }
```

## Tips

### Model Unique IDs
Always use the format `provider:modelId`:
```typescript
✅ 'openai:gpt-4'
✅ 'anthropic:claude-3-opus'
❌ 'gpt-4'  // Missing provider
❌ 'openai-gpt-4'  // Wrong separator
```

### Custom Provider Types
Custom providers are identified as `custom:${id}`:
```typescript
const type = `custom:${provider.id}`
```

### Settings Preservation
Legacy data is preserved in `settings._legacy`:
```typescript
const legacyData = provider.settings._legacy
// { parentId, subproviderId, modelMap, isFallback }
```

## Migration Notes

### What Changed
- Import path: `stores/providers` → `stores/providers-v2`
- That's it! API is 100% compatible.

### What Stayed Same
- All method names
- All property names
- All return types
- All behaviors

### New Features
- Typed provider IDs
- Better model management
- Automatic legacy conversion
- Cherry Studio alignment

---

For complete details, see MIGRATION_COMPLETE.md
