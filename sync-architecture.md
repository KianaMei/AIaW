# AIaW 数据同步架构

## 同步的数据表

```mermaid
graph TB
    subgraph "本地 IndexedDB + Dexie Cloud 同步"
        W[工作区 workspaces<br/>├ 工作区信息<br/>├ 文件夹���构<br/>└ 父子关系]
        D[对话 dialogs<br/>├ 对话列表<br/>└ 所属工作区]
        M[消息 messages<br/>├ 对话消息<br/>├ 消息类型<br/>└ Token 使用量]
        A[助手 assistants<br/>├ AI 助手配置<br/>├ Prompt 模板<br/>├ 模型设置<br/>└ 插件配置]
        AR[工件 artifacts<br/>├ 生成的代码/文档<br/>└ 所属工作区]
        P[插件 installedPluginsV2<br/>└ 已安装插件]
        R[响应式数据 reactives<br/>└ 用户偏好设置]
        AV[头像图片 avatarImages<br/>└ 头像资源]
        I[项目 items<br/>├ 对话项目<br/>└ 类型分类]
        PR[提供商 providers<br/>└ 自定义 AI 提供商]
    end

    W --> D
    D --> M
    W --> A
    W --> AR
    D --> I

    style W fill:#4CAF50
    style D fill:#2196F3
    style M fill:#FF9800
    style A fill:#9C27B0
    style AR fill:#F44336
```

## 数据关系图

```mermaid
erDiagram
    WORKSPACES ||--o{ DIALOGS : contains
    WORKSPACES ||--o{ ASSISTANTS : has
    WORKSPACES ||--o{ ARTIFACTS : stores
    DIALOGS ||--o{ MESSAGES : includes
    DIALOGS ||--o{ ITEMS : has
    ASSISTANTS ||--o{ PROVIDERS : uses

    WORKSPACES {
        string id PK
        string name
        string type
        string parentId
        string defaultAssistantId
        object avatar
        string prompt
        object vars
    }

    DIALOGS {
        string id PK
        string workspaceId FK
    }

    MESSAGES {
        string id PK
        string dialogId FK
        string type
        object usage
    }

    ASSISTANTS {
        string id PK
        string workspaceId FK
        string name
        object avatar
        string prompt
        string model
        object modelSettings
        object plugins
    }

    ARTIFACTS {
        string id PK
        string workspaceId FK
    }

    ITEMS {
        string id PK
        string dialogId FK
        string type
    }
```

## 同步机制

```mermaid
sequenceDiagram
    participant User as 用户操作
    participant Local as 本地 IndexedDB
    participant Dexie as Dexie Cloud Addon
    participant Cloud as Dexie Cloud 服务器
    participant Remote as 其他设备

    User->>Local: 创建/修改数据
    Local->>Dexie: 触发同步
    Dexie->>Cloud: 上传变更 (实时)
    Cloud->>Remote: 推送到其他设备
    Remote->>Local: 接收远程变更

    Note over Local,Cloud: 本地优先 + 实时云同步
    Note over Dexie: 端到端加密
    Note over Cloud: requireAuth: false<br/>匿名同步支持
```

## 数据统计

| 数据表 | 用途 | 索引字段 | 同步状态 |
|--------|------|----------|----------|
| **workspaces** | 工作区/文件夹 | id, type, parentId | ✅ 云同步 |
| **dialogs** | 对话会话 | id, workspaceId | ✅ 云同步 |
| **messages** | 聊天消息 | id, type, dialogId | ✅ 云同步 |
| **assistants** | AI 助手配置 | id, workspaceId | ✅ 云同步 |
| **artifacts** | 生成的工件 | id, workspaceId | ✅ 云同步 |
| **installedPluginsV2** | 插件 | key, id | ✅ 云同步 |
| **reactives** | 响应式设置 | key | ✅ 云同步 |
| **avatarImages** | 头像图片 | id | ✅ 云同步 |
| **items** | 对话项目 | id, type, dialogId | ✅ 云同步 |
| **providers** | 自定义提供商 | id | ✅ 云同步 |

**总计：10 个同步表**

## 配置说明

- **同步引擎**: Dexie Cloud Addon
- **数据库名**: `data`
- **版本**: v6
- **认证模式**: 免认证 (`requireAuth: false`)
- **自定义登录**: 启用 (`customLoginGui: true`)
- **数据库 URL**: 从 `DexieDBURL` 配置读取
