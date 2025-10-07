# Release Notes - Provider V2

## 版本信息

**版本号**：v2.0.0
**发布日期**：2025-01-XX
**重要程度**：🔴 Major Release（重大更新）

---

## 🎯 概述

AIaW 完成了供应商（Provider）系统的架构重构，全面对标 **Cherry Studio** 的设计理念。本次更新带来了更清晰的数据结构、更直观的用户界面，以及更强大的功能。

### 核心改进

- 🏗️ **扁平化架构**：移除复杂的嵌套结构，数据更清晰
- 🎛️ **二级选择器**：供应商 → 模型，选择更直观
- ✅ **供应商验证**：一键测试 API 配置有效性
- 🔄 **智能降级**：API 失败自动使用静态模型
- 🧩 **能力矩阵**：自动识别供应商支持的功能

---

## ✨ 新功能

### 1. 二级模型选择器

选择模型的新方式：先选供应商，再选该供应商的模型。

**优势**：
- 清晰的模型归属关系
- 避免同名模型混淆
- 更易于管理大量模型

**使用方法**：
1. 打开对话页
2. 点击模型选择
3. 第一步：选择供应商
4. 第二步：选择模型

![二级选择器演示](./images/two-level-selector.png)

---

### 2. 供应商验证

在配置供应商后，可以一键验证配置是否正确。

**功能**：
- ✅ 测试 API 连接性
- ✅ 验证 API 密钥有效性
- ✅ 尝试列出可用模型
- ✅ 实时显示验证结果

**使用方法**：
1. 进入供应商设置页
2. 配置 API Host 和 API Key
3. 点击"验证供应商"按钮
4. 查看徽章显示的结果
   - 🟢 **有效**：配置正确
   - 🔴 **无效**：查看错误详情

---

### 3. 智能模型拉取与降级

从供应商 API 动态获取模型列表，失败时自动降级。

**三种模式**：

1. **远程拉取成功** 🟢
   - 显示："成功从服务商获取 X 个模型"
   - 使用最新的模型列表

2. **远程拉取失败** 🟡
   - 显示："获取失败（原因），使用 X 个静态模型"
   - 自动降级到预置模型

3. **静态模型** 🔵
   - 显示："已加载 X 个静态模型"
   - 使用内置的模型列表

**使用方法**：
1. 进入供应商设置
2. 点击模型列表旁的刷新图标
3. 等待拉取完成
4. 查看通知了解拉取结果

---

### 4. 能力矩阵

系统自动识别不同供应商支持的功能，UI 相应调整。

**支持的能力检测**：

- **数组内容（Array Content）**
  - 支持：OpenAI, Anthropic, Google
  - 功能：多图片/文件上传

- **开发者角色（Developer Role）**
  - 支持：Anthropic
  - 功能：System 消息的特殊处理

- **服务等级（Service Tier）**
  - 支持：OpenAI
  - 功能：Scale tier 选择

- **视觉能力（Vision）**
  - 支持：GPT-4V, Claude 3, Gemini Pro Vision
  - 功能：图片理解

- **URL 上下文（URL Context）**
  - 支持：Google Gemini
  - 功能：原生网页搜索

**自动化**：UI 根据所选供应商自动启用/禁用对应功能。

---

## 🔄 重大变更

### 数据结构变更

#### ⚠️ Breaking Change

旧版本的嵌套供应商结构已废弃：

**旧版（已废弃）**：
```typescript
{
  id: 'custom',
  name: '自定义',
  subproviders: [
    { type: 'openai', apiHost: '...', models: [...] },
    { type: 'anthropic', apiHost: '...', models: [...] }
  ],
  fallbackProvider: 'openai'
}
```

**新版（V2）**：
```typescript
{
  id: 'custom-1',
  name: '自定义 OpenAI',
  type: 'openai',
  apiHost: '...',
  apiKey: '...',
  models: ['gpt-4', 'gpt-3.5-turbo'],
  enabled: true,
  settings: {},
  avatar: {...},
  isSystem: false
}
```

#### 自动迁移

应用启动时会自动迁移旧数据：
- ✅ 扁平化嵌套的 subproviders
- ✅ 移除 fallbackProvider 字段
- ✅ 保留历史会话兼容性

---

### UI 变更

#### 模型选择方式

**旧版**：单一下拉框，格式 `provider:model`

**新版**：二级选择
1. 选择供应商
2. 选择该供应商的模型

#### 供应商设置页

新增功能：
- ✅ 验证供应商按钮
- ✅ 拉取模型按钮
- ✅ 实时验证结果徽章

优化：
- ✅ 更清晰的表单布局
- ✅ 更好的错误提示
- ✅ 防抖保存（500ms）

---

## 🐛 修复

### 数据相关
- 🐛 修复模型列表数据格式错误（从对象数组改为字符串数组）
- 🐛 修复 `dialog.modelIdOverride` 归一化逻辑
- 🐛 修复 assistant 存储逻辑，正确分离 providerId 和 modelId

### UI 相关
- 🐛 修复 `ProviderModelSelector` v-model 绑定问题
- 🐛 修复供应商禁用后仍在选择器中显示
- 🐛 修复历史会话回填时模型选择器不更新

### API 相关
- 🐛 修复 listModels 超时未设置（现在默认 12 秒）
- 🐛 修复 Anthropic API 缺少 `anthropic-version` header
- 🐛 修复 Azure API 未正确处理 `resourceName` 和 `apiVersion`

---

## ⚡ 性能优化

- ⚡ 防抖保存（500ms），减少数据库写入
- ⚡ 延迟加载模型列表，减少初始加载时间
- ⚡ 缓存静态模型配置，避免重复计算

---

## 🌍 国际化

新增翻译：
- ✅ `providerSetting.*` 完整翻译（英文/简中/繁中）
- ✅ 验证相关提示（valid, invalid, validateSuccess, validateError）
- ✅ 模型拉取反馈（fetchModelsSuccess, fetchModelsFallback, fetchModelsStatic）

---

## 📦 依赖更新

无依赖变更。

---

## 🔧 开发者变更

### 新增 API

#### ProviderService

```typescript
// 验证供应商
ProviderService.validateProvider(provider: ProviderV2): Promise<{
  valid: boolean
  error?: string
}>

// 列出模型（增强版）
ProviderService.listModels(provider: ProviderV2): Promise<string[]>
```

#### ProvidersV2Store

```typescript
// 拉取模型（带降级）
providersStore.fetchProviderModels(providerId: string): Promise<{
  models: string[]
  source: 'remote' | 'static' | 'cached'
  error?: string
}>
```

#### 能力检测

```typescript
ProviderService.isSupportArrayContent(provider)
ProviderService.isSupportDeveloperRole(provider)
ProviderService.isSupportVision(provider)
ProviderService.isSupportServiceTier(provider)
ProviderService.isSupportUrlContext(provider)
ProviderService.isGeminiNativeWebSearchProvider(provider)
```

### 废弃 API

```typescript
// ❌ 已废弃，将在 v3.0 移除
ProvidersStore.getCustomProviders()  // 使用 useProvidersV2Store
ProvidersStore.getSubproviders()     // 不再支持嵌套
```

---

## 📚 文档

新增文档：
- 📖 [Provider V2 升级指南](./PROVIDER_V2_UPGRADE_GUIDE.md)
- 📖 [Provider V2 验收测试清单](./PROVIDER_V2_ACCEPTANCE_TEST.md)
- 📖 [供应商架构分析](./供应商架构分析报告.md)

---

## 🚀 升级指南

### 自动升级

**对于大多数用户**，无需手动操作：

1. 更新到 v2.0.0
2. 启动应用
3. 数据自动迁移
4. 开始使用新功能

### 手动检查

如果遇到问题：

1. 打开浏览器开发者工具
2. 查看 Console 中的迁移日志
3. 检查 IndexedDB 中的 `providers` 表
4. 参考 [升级指南](./PROVIDER_V2_UPGRADE_GUIDE.md)

### 回退

⚠️ **本次更新不支持回退**，因为数据结构已发生变化。

建议：
- 升级前导出数据备份
- 如遇严重问题，提交 [GitHub Issue](https://github.com/your-repo/issues)

---

## ⚠️ 已知问题

### P1 - 需要用户注意

暂无。

### P2 - 次要问题

暂无。

---

## 🙏 致谢

本次重构参考了 **Cherry Studio** 的优秀设计，特别感谢 Cherry 团队的开源贡献。

### 贡献者

- @your-name - 架构设计与实现
- @another-contributor - 测试与文档

---

## 📅 下一版本计划

### v2.1.0（计划中）

- [ ] 供应商分组功能
- [ ] 批量导入/导出供应商配置
- [ ] 供应商使用统计
- [ ] 更多 listModels 支持（Vertex AI, AWS Bedrock）

### v3.0.0（未来）

- [ ] 移除所有废弃 API
- [ ] 供应商市场（社区共享配置）
- [ ] 高级负载均衡和故障转移

---

## 🔗 相关链接

- [GitHub Repository](https://github.com/your-repo)
- [Issues](https://github.com/your-repo/issues)
- [Discussions](https://github.com/your-repo/discussions)
- [Documentation](https://docs.your-project.com)

---

## 📞 支持

如有问题，请：
1. 查看 [升级指南](./PROVIDER_V2_UPGRADE_GUIDE.md)
2. 查看 [常见问题](./PROVIDER_V2_UPGRADE_GUIDE.md#常见问题)
3. 提交 [GitHub Issue](https://github.com/your-repo/issues)
4. 加入 [讨论区](https://github.com/your-repo/discussions)

---

**Happy coding! 🎉**
