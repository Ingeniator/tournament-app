import http from 'node:http';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexHtml = fs.readFileSync(join(__dirname, 'index.html'), 'utf-8');

const PORT = 3000;
const RUNNER_PORT = 5190;
const PLANNER_PORT = 5191;

function proxy(req, res, targetPort) {
  const options = {
    hostname: 'localhost',
    port: targetPort,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  proxyReq.on('error', () => {
    res.writeHead(502);
    res.end('Backend not ready');
  });
  req.pipe(proxyReq, { end: true });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/plan')) {
    proxy(req, res, PLANNER_PORT);
  } else if (req.url.startsWith('/play')) {
    proxy(req, res, RUNNER_PORT);
  } else if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(indexHtml);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// WebSocket upgrade (for Vite HMR)
server.on('upgrade', (req, socket, head) => {
  const targetPort = req.url.startsWith('/plan') ? PLANNER_PORT : RUNNER_PORT;
  const options = {
    hostname: 'localhost',
    port: targetPort,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };
  const proxyReq = http.request(options);
  proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\n` +
      Object.entries(proxyRes.headers).map(([k, v]) => `${k}: ${v}`).join('\r\n') +
      '\r\n\r\n'
    );
    if (proxyHead.length) socket.write(proxyHead);
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });
  proxyReq.on('error', () => socket.destroy());
  proxyReq.end();
});

server.listen(PORT, () => {
  console.log(`\n  Dev proxy running at http://localhost:${PORT}`);
  console.log(`    /play → runner (port ${RUNNER_PORT})`);
  console.log(`    /plan → planner (port ${PLANNER_PORT})\n`);
});
