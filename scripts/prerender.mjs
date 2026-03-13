/**
 * Prerender landing pages using Playwright.
 *
 * Runs after `vite build` for the landing package. Starts a local static
 * server, visits each route with a headless browser, and writes the
 * fully-rendered HTML back to disk so Google sees real content instead
 * of an empty <div id="root"></div>.
 *
 * Usage:  node scripts/prerender.mjs
 * Requires: built landing output in packages/landing/dist/
 */

import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, extname } from 'path';

const DIST = join(import.meta.dirname, '..', 'packages', 'landing', 'dist');
const PORT = 4173;

const ROUTES = [
  '/',
  '/formats',
  '/americano',
  '/mexicano',
  '/awards',
  '/maldiciones',
  '/club',
];

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};

/** Minimal static file server for the built landing dist. */
function startServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let filePath = join(DIST, req.url === '/' ? 'index.html' : req.url);

      // If path is a directory, try index.html inside it
      if (!extname(filePath) && existsSync(join(filePath, 'index.html'))) {
        filePath = join(filePath, 'index.html');
      }
      // If no extension and not a file, try .html
      if (!extname(filePath) && !existsSync(filePath)) {
        filePath += '.html';
      }

      if (!existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const ext = extname(filePath);
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      res.end(readFileSync(filePath));
    });

    server.listen(PORT, () => resolve(server));
  });
}

async function prerender() {
  console.log(`Prerendering ${ROUTES.length} landing pages...`);

  const server = await startServer();
  const browser = await chromium.launch();

  try {
    for (const route of ROUTES) {
      const page = await browser.newPage();
      const url = `http://localhost:${PORT}${route}`;

      await page.goto(url, { waitUntil: 'networkidle' });

      // Wait for React to render content inside #root
      await page.waitForSelector('#root > *', { timeout: 10000 });

      // Get the full rendered HTML
      const html = await page.content();

      // Determine output file path
      const outFile = route === '/'
        ? join(DIST, 'index.html')
        : join(DIST, route.slice(1), 'index.html');

      writeFileSync(outFile, html, 'utf-8');
      console.log(`  ✓ ${route} → ${outFile.replace(DIST, 'dist')}`);

      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log('Prerendering complete!');
}

prerender().catch((err) => {
  console.error('Prerender failed:', err);
  // Don't fail the build — noscript content is the fallback
  process.exit(0);
});
