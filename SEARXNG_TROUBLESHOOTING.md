# SearXNG 搜索故障排查指南

## 常见错误：`Unexpected token '<', "<!DOCTYPE "... is not valid JSON`

### 问题原因
- SearXNG 服务返回了 HTML 页面而不是 JSON 数据
- 通常是因为服务配置不正确或无法访问

---

## 快速诊断步骤

### 1. 检查 SearXNG 服务地址

打开浏览器，访问以下 URL（替换为你的配置）：

```
https://aiaw.app/searxng?format=json&q=test
```

**预期结果：** 应该看到 JSON 数据，类似：
```json
{
  "query": "test",
  "results": [
    {
      "title": "...",
      "url": "...",
      "content": "..."
    }
  ]
}
```

**如果看到 HTML 页面：** SearXNG 服务有问题 ❌

---

### 2. 检查浏览器控制台

1. 打开 Chrome DevTools (F12)
2. 切换到 **Network** 标签
3. 再次触发搜索
4. 找到对 `searxng` 的请求，查看：
   - **Status Code** (状态码)
   - **Response Headers** → `Content-Type` (应为 `application/json`)
   - **Response** (响应内容)

---

## 解决方案

### 方案 A：使用公共 SearXNG 实例（推荐）

1. 找一个公开的 SearXNG 实例：[https://searx.space](https://searx.space)
2. 在 AIaW 中配置：
   - 进入 **设置 → 插件 → 联网搜索与爬取**
   - 修改 **SearXNG URL** 为公开实例，例如：
     ```
     https://searx.be
     https://search.bus-hit.me
     ```

### 方案 B：本地运行 SearXNG (Docker)

```bash
# 1. 拉取镜像
docker pull searxng/searxng

# 2. 运行服务
docker run -d \
  --name searxng \
  -p 8080:8080 \
  -v "${PWD}/searxng:/etc/searxng" \
  -e SEARXNG_BASE_URL=http://localhost:8080/ \
  searxng/searxng

# 3. 在 AIaW 中配置
# SearXNG URL: http://localhost:8080
```

### 方案 C：自建后端代理

如果你有自己的服务器，可以搭建代理：

```javascript
// Node.js Express 示例
app.get('/searxng', async (req, res) => {
  const { q, engines, format = 'json' } = req.query
  const searxngUrl = 'https://searx.be/search'
  
  try {
    const response = await fetch(`${searxngUrl}?format=${format}&q=${q}&engines=${engines}`)
    const data = await response.json()
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})
```

---

## 常见问题 FAQ

### Q: 为什么默认的 `https://aiaw.app/searxng` 不工作？
A: 这是官方部署的代理服务，可能因为：
- 服务维护中
- 访问限流
- 网络连接问题

建议切换到其他公开实例或自建服务。

### Q: CORS 跨域错误怎么办？
A: 有两种方法：
1. 使用支持 CORS 的 SearXNG 实例
2. 通过后端代理转发请求（方案 C）

### Q: 搜索速度很慢？
A: 尝试：
1. 减少搜索引擎数量（配置 `defaultEngines`）
2. 使用地理位置更近的实例
3. 减少 `resultsLimit`

---

## 技术细节

### SearXNG API 参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `format=json` | 返回 JSON 格式 | **必需** |
| `q=查询词` | 搜索关键词 | `q=天气预报` |
| `engines=引擎` | 指定搜索引擎（逗号分隔） | `engines=google,bing` |
| `time_range=范围` | 时间范围 | `day`, `month`, `year` |

### 验证实例是否可用

```bash
# 命令行测试
curl -X GET "https://searx.be/search?format=json&q=test"

# 或使用 PowerShell
Invoke-WebRequest -Uri "https://searx.be/search?format=json&q=test"
```

---

## 代码改进说明

最新版本已加入更详细的错误信息：

- ✅ 检查 Content-Type 是否为 `application/json`
- ✅ 捕获 JSON 解析异常
- ✅ 验证响应数据结构
- ✅ 提供前 200 字符预览，便于调试

当遇到错误时，控制台会显示更友好的提示信息。
