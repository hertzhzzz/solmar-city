// SOLMAR CITY — serve.ts
// Local preview server for development only. Serves game/ at http://localhost:8080
// and opens it in the default browser. Node 22 standard library only.

import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';
import { exec } from 'node:child_process';

const ROOT = resolve(import.meta.dirname);
const GAME_DIR = join(ROOT, 'game');
const PORT = Number(process.env.PORT || 8080);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
  const filePath = join(GAME_DIR, urlPath === '/' ? 'index.html' : urlPath);
  if (!filePath.startsWith(GAME_DIR) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found: ' + urlPath);
    return;
  }
  res.writeHead(200, { 'content-type': MIME[extname(filePath)] || 'application/octet-stream' });
  createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  const url = 'http://localhost:' + PORT + '/';
  console.log('SOLMAR CITY preview at ' + url);
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(opener + ' ' + url, () => {});
});
