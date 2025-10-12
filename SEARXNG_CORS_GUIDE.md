# SearXNG 搜索 403 Forbidden / CORS 问题解决指南

## 为什么会出现 403 错误？

当你在浏览器中看到 **403 Forbidden** 错误时，通常是因为：

1. **CORS（跨域资源共享）限制** - 大多数公开 SearXNG 实例（如 searx.be）不允许从其他域名跨域访问
2. **浏览器安全策略** - 浏览器会阻止从 `http://localhost:9006` 访问 `https://searx.be` 的 API

```
❌ localhost:9006 → https://searx.be/search  (被 CORS 拒绝)
✅ localhost:9006 → https://aiaw.app/searxng → searx.be  (通过代理)
```

---

## 解决方案

### 方案 A：使用项目的 CORS 代理（推荐）

AIaW 项目默认配置了一个代理服务来绕过 CORS：

**默认配置**：`https://aiaw.app/searxng`

这个代理会：
1. 接收你的搜索请求
2. 转发到后端 SearXNG 实例
3. 返回结果（带 CORS 头）

**如果代理不可用**，你会看到：
- 502 Bad Gateway - 代理服务维护中
- 404 Not Found - 代理服务已下线

---

### 方案 B：自建 CORS 代理

如果官方代理不可用，可以自己搭建一个简单的代理：

#### 1. Node.js Express 代理（最简单）

```javascript
// searxng-proxy.js
const express = require('express')
const fetch = require('node-fetch')
const cors = require('cors')

const app = express()
app.use(cors()) // 允许所有跨域请求

app.get('/search', async (req, res) => {
  try {
    const { q, engines, format = 'json', time_range } = req.query
    const url = new URL('https://searx.be/search')
    url.searchParams.set('q', q)
    url.searchParams.set('format', format)
    if (engines) url.searchParams.set('engines', engines)
    if (time_range) url.searchParams.set('time_range', time_range)
    
    const response = await fetch(url)
    const data = await response.json()
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.listen(3000, () => {
  console.log('SearXNG proxy running on http://localhost:3000')
})
```

**使用方法：**
```bash
npm install express node-fetch cors
node searxng-proxy.js

# 然后在 AIaW 中配置：
# SearXNG URL: http://localhost:3000
```

#### 2. Cloudflare Workers（免费，推荐）

```javascript
// 部署到 Cloudflare Workers
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const searxUrl = new URL('https://searx.be/search')
  
  // 复制查询参数
  url.searchParams.forEach((value, key) => {
    searxUrl.searchParams.set(key, value)
  })
  
  const response = await fetch(searxUrl)
  const data = await response.json()
  
  // 添加 CORS 头
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  })
}
```

部署后使用：`https://your-worker.workers.dev`

---

### 方案 C：使用支持 CORS 的公开实例

以下实例**可能**支持 CORS（需要测试）：

| 实例 | URL | 备注 |
|------|-----|------|
| SearXNG.org | https://searxng.org | 官方演示实例 |
| Paulgo | https://paulgo.io | 支持 CORS |
| NixNet | https://searx.nixnet.services | 社区实例 |

**测试方法：**
```javascript
// 在浏览器控制台运行
fetch('https://searxng.org/search?format=json&q=test')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

如果没有 CORS 错误，说明该实例可用！

---

### 方案 D：修改本地开发环境（不推荐）

可以临时禁用浏览器的 CORS 检查：

**Chrome：**
```bash
# Windows
"C:\Program Files\Google\Chrome\Application\chrome.exe" --disable-web-security --user-data-dir="C:\tmp\chrome_dev"

# Mac
open -na "Google Chrome" --args --disable-web-security --user-data-dir="/tmp/chrome_dev"
```

⚠️ **警告**：这会降低安全性，仅用于本地开发！

---

## 如何在 AIaW 中配置

### 方法 1：通过插件设置

1. 进入 **设置 → 插件 → 联网搜索与爬取**
2. 找到 **SearXNG URL** 配置项
3. 填入你的代理地址，例如：
   - `http://localhost:3000`（本地代理）
   - `https://your-worker.workers.dev`（Cloudflare）
   - `https://paulgo.io`（支持 CORS 的实例）

### 方法 2：修改环境变量

编辑 `.env.app` 文件：
```
SEARXNG_BASE_URL=http://localhost:3000
```

---

## 调试技巧

### 1. 检查实际请求的 URL

打开浏览器控制台 (F12) → **Network** 标签 → 查看 `search` 请求：
- **Status**: 403 → CORS 问题
- **Status**: 502 → 代理服务不可用
- **Status**: 200 → 检查响应内容

### 2. 测试 CORS

在控制台运行：
```javascript
fetch('你的SearXNG URL/search?format=json&q=test')
  .then(r => console.log('Status:', r.status, r.headers.get('access-control-allow-origin')))
  .catch(e => console.error('CORS Error:', e))
```

如果看到 `access-control-allow-origin: *` 或你的域名，说明支持 CORS。

### 3. 查看详细错误

修改代码临时输出更多信息：
```javascript
// 在 web-search-plugin.ts 的 search 函数中添加
console.log('Requesting:', url.toString())
console.log('Response headers:', Object.fromEntries(response.headers))
```

---

## 推荐配置顺序

1. **首选**：使用项目默认代理 `https://aiaw.app/searxng`
2. **备选**：自建 Cloudflare Workers 代理（免费、稳定）
3. **临时**：测试支持 CORS 的公开实例
4. **开发**：本地 Node.js 代理

---

## 常见问题

### Q: 为什么不能直接访问 SearXNG？
A: 浏览器的同源策略（CORS）限制跨域请求，这是安全机制。

### Q: Tauri/Electron 桌面版会有这个问题吗？
A: 不会！桌面版不受 CORS 限制，可以直接访问任何 SearXNG 实例。

### Q: 可以用 Chrome 插件解决吗？
A: 可以，但不推荐。安装 CORS 解除插件会影响所有网站的安全性。

---

## 代码已做的改进

✅ 自动添加 `/search` 路径  
✅ 检测 403 错误并提供友好提示  
✅ 支持完整 URL 和相对路径  
✅ 默认使用 CORS 代理  
✅ 三层回退机制（用户配置 → 环境变量 → 默认代理）

现在你应该能理解为什么需要代理，以及如何解决 CORS 问题了！
