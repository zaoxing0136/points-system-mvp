import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import url from 'node:url';

const rootDir = path.resolve(process.cwd(), process.env.STATIC_ROOT || 'dist');
const host = process.env.STATIC_HOST || '127.0.0.1';
const port = Number(process.env.STATIC_PORT || 4175);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

function resolvePath(requestUrl) {
  const parsed = new url.URL(requestUrl, `http://${host}:${port}`);
  const pathname = decodeURIComponent(parsed.pathname === '/' ? '/index.html' : parsed.pathname);
  const normalized = path.normalize(pathname).replace(/^([.][.][/\\])+/, '');
  const candidate = path.resolve(rootDir, `.${normalized}`);
  if (!candidate.startsWith(rootDir)) {
    return null;
  }
  return candidate;
}

const server = http.createServer((request, response) => {
  const target = resolvePath(request.url || '/');
  if (!target) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  fs.stat(target, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not Found');
      return;
    }

    response.writeHead(200, {
      'Content-Type': contentTypes[path.extname(target).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    fs.createReadStream(target).pipe(response);
  });
});

server.listen(port, host, () => {
  console.log(`static-server ${host}:${port} ${rootDir}`);
});

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
});
