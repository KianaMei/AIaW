# AIaW Responses + MCP 编排器实施计划（不改上层 API）

**目标**
- 在不改变上层使用方式的前提下（仍用 `generateText/streamText` + 现有 Tools/MCP），实现自研的 Responses Provider：
  - 自己解析 Responses 事件流，聚合 `function_call_arguments.*`，本地执行 MCP 工具，构造 `function_call_output`，发起下一轮请求；直至输出文本。
  - 对外暴露与 `@ai-sdk/provider` 兼容的 `LanguageModelV2` 接口，保留中间件生态可用性，但不再依赖当前“补丁型”中间件解决闭环问题。

**非目标**
- 不修改 UI 交互与消息模型；不迁移成完全手写 HTTP 的“通用 SDK”。
- 不在 Web 平台绕过浏览器安全策略（代理/TLS 仍沿用现有 `fetch`/CORS 能力）。

---

## 背景与问题
- 现有 `responses-mcp-middleware.ts` 仅做参数与事件整形：
  - 省略 `previous_response_id`、`store=false`、过滤 `item_reference`、合成缺失的 `reasoning` 项。
  - 从不执行工具、不构造 `function_call_output`、不发起下一轮请求，无法闭环。
- 需要把“工具编排 + 多轮 follow-up”的核心逻辑下沉到 Provider 层，由 Provider 主动驱动多轮请求与本地工具执行。

---

## 架构设计（最小概念集）
- RequestBuilder（规则层）
  - baseURL 规范化：OpenAI `/v1`、Google `/v1beta`、Azure deployment 路径（复用现有 `providerToAiSdkConfig` 行为约定）。
  - per-model headers/body 覆写、key 轮换（多 key 逗号分隔取一并轮转）。
  - 默认 `store=false`、省略 `previous_response_id`。
- SSE Parser（流解析层）
  - 解析 Responses 事件：`response.output_item.added/done`、`response.function_call_arguments.delta/done`、`response.output_text.delta/done`、`response.reasoning_summary_text.delta/done`、`response.completed` 等。
  - 将 `output_text.delta` → `text-delta`，`reasoning_summary_text.delta` → `reasoning-delta`；稳定提取 `responseId/itemId` 元数据。
- ToolLoop（编排层）
  - 对每个 `function_call` 聚合参数（按 `call_id` 累积 delta → done），在 `done` 后执行工具：
    - 优先走 MCP（`src/utils/mcp-client.ts`），其次走内建/插件工具（`src/utils/plugins.ts`）。
  - 构造 `function_call_output`（字符串化输出），与历史消息一起形成下一轮 `input`，继续请求；直到模型开始输出文本或无更多工具调用。
  - 多轮的 `text-delta` 连续拼接，对上层呈现为单一连续流。
- Provider 适配层
  - 导出 `createKelivoResponsesProvider(options)`，返回 `languageModel(modelId)`（`LanguageModelV2`）。
  - 内部使用 AIaW 的跨平台 `fetch`（`src/utils/platform-api.ts`），自动适配 Web/Tauri/Capacitor；Web 仍走 CORS 代理（`src/utils/cors-fetch.ts`）。

---

## 集成点（零破坏）
- Provider 注册：`src/aiCore/providers/schemas.ts` 新增 `kelivo-responses`（或替换 `openai-response` 的 creator）。
- 执行器：`src/aiCore/runtime/executor.ts` 在使用本 Provider 时，不再注入 `createOpenAIResponsesMCPMiddleware()`；其它 provider 逻辑不变。
- 获取模型：`src/services/ProviderService.ts` 的 listModels 维持不变；仅当 provider.type==responses 时走新 Provider。

---

## 详细任务与阶段

### P0 验证（1–2 天）
- 明确目标事件映射与最小闭环：仅支持单个 `function_call` → 本地执行 → 单次 follow-up → 文本输出。
- 基础骨架：Provider 工厂 + RequestBuilder + SSE Parser 的接口定义与最小实现。
- 流/中断：支持 `AbortSignal`；遇到错误事件打印简明错误并终止。

### P1 Provider 最小可用（1 周）
- 实现单轮工具闭环：
  - 聚合 `function_call_arguments`，`done` 后执行 MCP 工具，生成 `function_call_output`；
  - 构造下一轮 `input`（历史 + function_call + function_call_output），再发起请求；
  - 当出现 `output_text.delta`，向上游输出 `text-delta`，结束闭环。
- 兼容 `developer`/`system`/`user` 消息，过滤 `item_reference`。
- 事件顺序兜底：缺失 `reasoning` 时按 `fc_id → rs_id` 规则合成最小项。

### P2 多轮与多工具（1 周）
- 支持多 `function_call` 并行聚合与顺序执行；每轮可能出现多次 `function_call`。
- 工具执行错误处理：将错误转成规范化 `function_call_output`（文本/错误文本）。
- 超时与重试：对工具执行和请求设定可配置超时；幂等/重入保护。

### P3 平台与网络细节（3–5 天）
- Web：维持 CORS 代理路径；Tauri/Capacitor 复用现有 `fetch` 适配。
- 代理/TLS：不在 Web 强行支持；桌面/移动按已有实现。
- 日志：复用 `platform-api.ts` 的日志开关（UI 事件 `aiaw-http-log`）。

### P4 集成与灰度（3–5 天）
- 在 `executor.ts` 加入 provider 选择：响应式切换到新 Provider；保留回退开关（env/perf 开关）。
- 真实会话验证：
  - 无工具、单工具、多工具、错误工具、长文本，流与最终文本一致；
  - MCP HTTP/STDIO/SSE 三类连接；
  - 断线/重连（MCP 连接管理已在 `mcp-client.ts`）。

### P5 扩展与清理（1 周）
- 扩展 Azure/Google 变体路径；
- 如新 Provider 表现稳定，移除对 `responses-mcp-middleware.ts` 的依赖；
- 文档与维护指南。

---

## 验收标准
- 上层继续以 `generateText/streamText` 使用；不修改消息模型与工具接口。
- 典型用例全部通过：
  - 单/多工具调用（含参数增量/完成的聚合）；
  - 工具执行错误仍能完成回答（降级文本解释）；
  - 长对话多轮 follow-up，无“卡死”与“丢项”；
  - 取消（Abort）能及时停止所有挂起请求与工具执行。
- 性能：平均首 token 延迟不劣于现方案 10%；日志开关关闭时无明显额外开销。

---

## 风险与缓解
- 事件形态差异：不同后端 Responses 实现可能字段细节不同 → 严格容错解析；
- Web 环境限制：代理/TLS 受限 → 沿用 CORS/平台 fetch；
- 多轮同步问题：严格以 `call_id`、`output_index` 做聚合，确保顺序；
- 工具副作用：工具应幂等或包含重入保护；错误统一为文本输出。

---

## 回滚方案
- 在 `executor.ts` 保留开关：可一键回退到旧 `@ai-sdk/*` Provider + 现有中间件路径。
- 保留 `responses-mcp-middleware.ts` 以便快速切回（仅在紧急故障时）。

---

## 时间与责任
- 预估：P0–P5 合计约 3–5 周（并行可压缩）。
- 代码位置建议：
  - `src/aiCore/providers/kelivo-responses/`（Provider/RequestBuilder/SSE Parser/ToolLoop 分层）；
  - 集成点：`src/aiCore/providers/schemas.ts`、`src/aiCore/runtime/executor.ts`。

---

## 参考与对照
- 现注入点：`src/aiCore/runtime/executor.ts`（中间件注入时机）。
- MCP 能力：`src/utils/mcp-client.ts`、`src/utils/plugins.ts`。
- 现行“补丁型”中间件：`src/aiCore/runtime/responses-mcp-middleware.ts`（仅供比对，不再承担闭环）。
- kelivo Responses 工具循环设计：`RESPONSE_API_REFACTOR_PLAN.md`（跨语言思路参考）。

---

**备注**：整个方案遵循“Never break userspace”。先以 Provider 内部替换实现闭环，保持上层 API 与交互零变化；灰度验证后再逐步淘汰补丁型中间件。

