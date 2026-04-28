import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, URL } from 'url';
import { exec } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3001;
const DIST_DIR = path.join(__dirname, 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
};

if (!fs.existsSync(DIST_DIR)) {
  console.warn('⚠️  dist/ 目录不存在，请先执行 `npm run build`');
}

function serveStatic(filePath, res) {
  fs.readFile(filePath, (err, buf) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(buf);
  });
}

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://localhost:${PORT}`);

  if (reqUrl.pathname.startsWith('/api/')) {
    const apiPath = reqUrl.pathname.slice(5);
    const target = `https://api.swing.tennis/v1/${apiPath}${reqUrl.search}`;
    https.get(target, { headers: { Accept: 'application/json' } }, (apiRes) => {
      res.writeHead(apiRes.statusCode, { 'Content-Type': 'application/json' });
      apiRes.pipe(res);
    }).on('error', e => {
      res.writeHead(502);
      res.end(JSON.stringify({ error: e.message }));
    });
    return;
  }

  const relPath = reqUrl.pathname === '/' ? '/index.html' : reqUrl.pathname;
  const safePath = path.normalize(path.join(DIST_DIR, relPath));
  if (!safePath.startsWith(DIST_DIR)) { res.writeHead(403); res.end('Forbidden'); return; }

  fs.stat(safePath, (err, stat) => {
    if (err || !stat.isFile()) {
      serveStatic(path.join(DIST_DIR, 'index.html'), res);
      return;
    }
    serveStatic(safePath, res);
  });
});

server.listen(PORT, () => {
  console.log(`\n✅ 服务已启动: http://localhost:${PORT}`);
  console.log('在浏览器中输入 Swing Vision 用户链接开始分析\n');
  exec(`start http://localhost:${PORT}`);
});
