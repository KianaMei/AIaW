/**
 * SearXNG 本地 CORS 代理服务器
 * 解决浏览器跨域限制问题
 */

const http = require('http');
const https = require('https');
const url = require('url');

// 配置
const PORT = 3456;
// 尝试多个后端实例，按顺序回退
const SEARXNG_BACKENDS = [
  'https://searx.work',
  'https://search.bus-hit.me',
  'https://searx.tiekoetter.com',
  'https://searx.be'
];
let currentBackendIndex = 0;
let SEARXNG_BACKEND = SEARXNG_BACKENDS[currentBackendIndex];

const server = http.createServer((req, res) => {
  // 设置 CORS 头，允许所有来源
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 只处理 GET 请求
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  // 构造目标 URL
  const parsedUrl = url.parse(req.url, true);
  const targetUrl = `${SEARXNG_BACKEND}/search${parsedUrl.search || ''}`;

  console.log(`[${new Date().toLocaleTimeString()}] Proxying: ${targetUrl}`);

  // 发起请求到 SearXNG（带更多请求头）
  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
    }
  };

  https.get(targetUrl, options, (proxyRes) => {
    const statusCode = proxyRes.statusCode;
    
    // 如果是 403/429，尝试切换后端
    if ((statusCode === 403 || statusCode === 429) && currentBackendIndex < SEARXNG_BACKENDS.length - 1) {
      currentBackendIndex++;
      SEARXNG_BACKEND = SEARXNG_BACKENDS[currentBackendIndex];
      console.warn(`⚠️  Backend returned ${statusCode}, switching to: ${SEARXNG_BACKEND}`);
      
      // 重试请求
      const newTargetUrl = `${SEARXNG_BACKEND}/search${parsedUrl.search || ''}`;
      https.get(newTargetUrl, options, (retryRes) => {
        res.writeHead(retryRes.statusCode, {
          'Content-Type': retryRes.headers['content-type'] || 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        retryRes.pipe(res);
      }).on('error', (err) => {
        console.error('Retry error:', err.message);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'All backends failed', message: err.message }));
      });
      return;
    }
    
    // 转发状态码和响应
    res.writeHead(statusCode, {
      'Content-Type': proxyRes.headers['content-type'] || 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    proxyRes.pipe(res);
    
  }).on('error', (err) => {
    console.error('Proxy error:', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Proxy Error',
      message: err.message,
      backend: SEARXNG_BACKEND
    }));
  });
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║  SearXNG CORS Proxy Server                             ║
╠════════════════════════════════════════════════════════╣
║  Status: Running ✓                                     ║
║  Port:   ${PORT}                                          ║
║  Backend: ${SEARXNG_BACKEND.padEnd(42)}║
╠════════════════════════════════════════════════════════╣
║  Usage:                                                ║
║  1. Keep this server running                           ║
║  2. In AIaW plugin settings, set:                      ║
║     SearXNG URL = http://localhost:${PORT}                ║
║  3. Test: http://localhost:${PORT}?format=json&q=test     ║
╚════════════════════════════════════════════════════════╝
  `);
  console.log('Waiting for requests...\n');
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n\nShutting down proxy server...');
  server.close(() => {
    console.log('Server stopped.');
    process.exit(0);
  });
});
