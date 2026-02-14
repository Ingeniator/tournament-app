import http from 'node:http';

const PREFERRED_PORT = 3000;
const RUNNER_PORT = 5190;
const PLANNER_PORT = 5191;
const LANDING_PORT = 5192;

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
  } else {
    proxy(req, res, LANDING_PORT);
  }
});

// WebSocket upgrade (for Vite HMR)
server.on('upgrade', (req, socket, head) => {
  let targetPort;
  if (req.url.startsWith('/plan')) {
    targetPort = PLANNER_PORT;
  } else if (req.url.startsWith('/play')) {
    targetPort = RUNNER_PORT;
  } else {
    targetPort = LANDING_PORT;
  }
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

import net from 'node:net';

function findFreePort(start) {
  return new Promise((resolve, reject) => {
    const tester = net.createServer();
    tester.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`  Port ${start} in use, trying ${start + 1}...`);
        resolve(findFreePort(start + 1));
      } else {
        reject(err);
      }
    });
    tester.listen(start, () => {
      tester.close(() => resolve(start));
    });
  });
}

findFreePort(PREFERRED_PORT).then((port) => {
  server.listen(port, () => {
    console.log(`\n  Dev proxy running at http://localhost:${port}`);
    console.log(`    /play → runner (port ${RUNNER_PORT})`);
    console.log(`    /plan → planner (port ${PLANNER_PORT})`);
    console.log(`    /    → landing (port ${LANDING_PORT})\n`);
  });
});
