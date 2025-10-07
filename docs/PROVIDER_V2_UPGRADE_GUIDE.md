# AIaW Provider V2 升级指南

## 概述

AIaW 已完成供应商（Provider）系统的重大架构升级，全面对标 Cherry Studio 的设计理念。本次升级带来了：

- ✅ **扁平化数据结构**：彻底移除嵌套的 subproviders 和 fallbackProvider
- ✅ **二级模型选择器**：先选择供应商，再选择该供应商的模型
- ✅ **增强的错误处理**：listModels 失败时自动降级到静态模型
- ✅ **供应商验证**：一键验证 API 凭据有效性
- ✅ **能力矩阵**：智能识别不同供应商支持的功能

## 重要变更

### 1. 数据结构变更

#### 旧版本（废弃）
```typescript
interface OldProvider {
  id: string
  name: string
  subproviders?: SubProvider[]  // ❌ 已移除
  fallbackProvider?: string      // ❌ 已移除
}
```

#### 新版本（V2）
```typescript
interface ProviderV2 {
  id: string
  name: string
  type: string                    // 'openai', 'anthropic', 'google', etc.
  apiHost?: string
  apiKey?: string
  models: string[]                // 扁平的模型ID列表
  enabled: boolean
  settings: Record<string, any>
  avatar?: Avatar
  isSystem: boolean
}
```

### 2. 模型选择方式变更

#### 旧版本
```vue
<!-- 单一选择器，格式：provider:model -->
<model-selector v-model="modelUniqId" />
```

#### 新版本
```vue
<!-- 二级选择器：先选供应商，再选模型 -->
<provider-model-selector
  v-model:provider-id="providerId"
  v-model:model-id="modelId"
/>
```

## 数据迁移

### 自动迁移

应用启动时会自动执行数据迁移（v8 migration）：

1. **扁平化旧数据**：自动将嵌套的 subproviders 展开为独立的 ProviderV2
2. **清理废弃字段**：移除 fallbackProvider、subproviders 等字段
3. **保留历史会话**：现有对话中的 `provider:model` 格式仍可正常使用

### 手动检查

如果遇到迁移问题，可以：

1. 打开浏览器开发者工具
2. 查看 Console 中的迁移日志
3. 检查 IndexedDB 中的 `providers` 表

```javascript
// 在浏览器 Console 中运行
const db = await window.indexedDB.open('aiaw-db')
const providers = await db.transaction('providers').objectStore('providers').getAll()
console.log('Providers:', providers)
```

## 使用指南

### 创建自定义供应商

1. 进入 **设置 → 供应商列表**
2. 点击 **添加自定义供应商**
3. 填写必填信息：
   - **名称**：供应商显示名称
   - **类型**：API 协议类型（如 openai-compatible）
   - **API 地址**：例如 `https://api.example.com`
   - **API 密钥**：你的 API Key
4. 点击 **验证供应商** 测试配置
5. 点击 **从服务商获取模型** 自动拉取模型列表
6. 保存配置

### 在对话中使用

1. 打开对话页面
2. 点击模型选择区域
3. **第一步**：选择供应商（显示已启用的供应商）
4. **第二步**：选择该供应商的模型
5. 开始对话

### 验证供应商配置

在供应商设置页面：

1. 配置完 API Host 和 API Key 后
2. 点击 **验证供应商** 按钮
3. 系统会尝试连接 API 并列出模型
4. 查看验证结果徽章：
   - 🟢 **有效**：配置正确，可以正常使用
   - 🔴 **无效**：配置有误，hover 查看错误详情

### 获取模型列表

#### 方式一：自动获取（推荐）
1. 点击模型列表旁的 **刷新图标**
2. 系统自动从供应商 API 拉取模型列表
3. 查看通知：
   - ✅ 成功：显示获取的模型数量
   - ⚠️ 降级：API 失败，使用静态模型
   - ℹ️ 静态：使用预置的模型列表

#### 方式二：手动输入
1. 在模型列表输入框中
2. 直接输入模型 ID（如 `gpt-4`, `claude-3-opus`）
3. 按 Enter 添加

## 功能特性

### 能力矩阵

系统自动识别供应商支持的功能：

- ✅ **数组内容（Array Content）**：支持多图片/文件输入
- ✅ **开发者角色（Developer Role）**：Anthropic 专用
- ✅ **服务等级（Service Tier）**：OpenAI scale tier
- ✅ **视觉能力（Vision）**：图片理解
- ✅ **URL 上下文（URL Context）**：Gemini 原生网页搜索

UI 会根据能力矩阵自动启用/禁用相关功能。

### 错误降级

当 listModels API 调用失败时：

1. **自动降级**：使用预置的静态模型列表
2. **用户提示**：通知显示失败原因和使用的备用方案
3. **不中断流程**：仍可正常使用静态模型

### 历史兼容

- **会话记录**：旧的 `provider:model` 格式仍可正常加载
- **二级回填**：打开历史会话时，自动拆分为供应商+模型
- **无缝切换**：新旧会话可以混用

## 常见问题

### Q1: 迁移后找不到我的自定义供应商？

**A**: 检查以下几点：
1. 自定义供应商是否被禁用？进入设置启用
2. 是否在 V8 迁移中被扁平化？检查是否多出了几个独立供应商
3. 查看浏览器 Console 的迁移日志

### Q2: listModels 总是失败？

**A**: 可能原因：
1. **API Host 不正确**：确保包含协议（https://）
2. **API Key 无效**：检查密钥是否过期或拼写错误
3. **网络问题**：检查代理或防火墙设置
4. **供应商类型错误**：确认选择了正确的 type

**解决方案**：
- 使用 **验证供应商** 功能诊断问题
- 查看错误提示的具体原因
- 降级使用静态模型列表

### Q3: 如何恢复到旧版本？

**A**: V2 设计不支持回退到旧版本，因为：
1. 数据已扁平化，无法恢复嵌套结构
2. 新功能（验证、能力矩阵）依赖 V2 架构

如果遇到严重问题，请：
1. 导出数据备份
2. 在 GitHub 提交 Issue
3. 临时使用系统内置供应商

### Q4: 二级选择器太繁琐？

**A**: 二级选择器的优势：
- **清晰的模型归属**：明确知道模型来自哪个供应商
- **避免冲突**：不同供应商的同名模型不会混淆
- **更好的 UX**：大量模型时，按供应商分组更易查找

首次选择后，系统会记住你的选择，切换模型很方便。

### Q5: 能力矩阵如何工作？

**A**: 系统维护了一个能力配置表（`provider-capabilities.ts`）：

```typescript
// 示例
isSupportArrayContent(provider) {
  return ['openai', 'anthropic', 'google'].includes(provider.type)
}
```

UI 组件会查询这个矩阵来决定是否显示某些功能。如果发现能力矩阵有误，请提交 Issue 反馈。

## 技术细节

### 数据库 Schema

```typescript
// Dexie stores
db.providers: CustomProviderV2[]
// 所有自定义供应商都存储为扁平的 V2 格式
// 系统供应商从配置文件加载，不存储在 DB
```

### API 格式

#### provider:model 格式（仍然支持）
- **存储格式**：`"openai:gpt-4"`
- **解析方式**：`split(':')` → `[provider, model]`
- **使用场景**：对话历史、AI SDK 注册

#### 分离格式（推荐）
- **存储格式**：`{ providerId: 'openai', modelId: 'gpt-4' }`
- **使用场景**：新建对话、模型选择器

### 代码示例

#### 获取模型

```typescript
import { useProvidersV2Store } from 'src/stores/providers-v2'

const store = useProvidersV2Store()

// 获取所有可用模型
const models = store.availableModels

// 按供应商筛选
const openaiModels = store.getModelsByProvider('openai')

// 动态拉取
const result = await store.fetchProviderModels('custom-provider-id')
if (result.source === 'remote') {
  console.log('获取成功:', result.models)
} else {
  console.warn('降级到静态:', result.error)
}
```

#### 验证供应商

```typescript
import { ProviderService } from 'src/services/ProviderService'

const result = await ProviderService.validateProvider(provider)
if (result.valid) {
  console.log('验证成功')
} else {
  console.error('验证失败:', result.error)
}
```

#### 能力检测

```typescript
import { ProviderService } from 'src/services/ProviderService'

const provider = store.getProviderById('anthropic')

if (ProviderService.isSupportArrayContent(provider)) {
  // 启用多图片上传
}

if (ProviderService.isSupportDeveloperRole(provider)) {
  // 显示 developer role 选项
}
```

## 反馈与支持

如果在升级过程中遇到问题：

1. **查看日志**：浏览器 Console 中的迁移日志
2. **GitHub Issue**：[提交问题](https://github.com/your-repo/issues)
3. **讨论区**：[参与讨论](https://github.com/your-repo/discussions)

## 变更日志

### v2.0.0 (2025-01-XX)

**重大变更**
- 🔄 供应商数据结构扁平化（移除嵌套）
- 🆕 二级模型选择器（Provider → Model）
- 🆕 供应商验证功能
- 🆕 能力矩阵系统

**改进**
- ⚡ listModels 增强（超时控制、错误降级）
- 🎨 更好的错误提示和用户反馈
- 📝 完善的 i18n 翻译（中英繁体）

**修复**
- 🐛 修复模型列表数据格式错误
- 🐛 修复 ProviderModelSelector 绑定问题
- 🐛 修复 dialog.modelIdOverride 归一化逻辑

---

欢迎使用 AIaW Provider V2！🎉
