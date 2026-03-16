/**
 * Prerender landing pages using Playwright.
 *
 * Runs after `vite build` for the landing package. Starts a local static
 * server, visits each route with a headless browser, and writes the
 * fully-rendered HTML back to disk so Google sees real content instead
 * of an empty <div id="root"></div>.
 *
 * Usage:  npx tsx scripts/prerender.ts
 * Requires: built landing output in packages/landing/dist/
 */

import { chromium } from 'playwright';
import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'http';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, extname, relative, resolve as resolvePath } from 'path';

const DIST = join(import.meta.dirname, '..', 'packages', 'landing', 'dist');
const PORT = 4173;

/** Auto-discover routes by finding all index.html files in the dist directory. */
function discoverRoutes(dir: string): string[] {
  const routes: string[] = [];

  function walk(current: string) {
    for (const entry of readdirSync(current)) {
      const full = join(current, entry);
      if (statSync(full).isDirectory()) {
        // Skip asset directories that don't contain pages
        if (entry === 'assets') continue;
        walk(full);
      } else if (entry === 'index.html') {
        const rel = relative(dir, current);
        routes.push(rel === '' ? '/' : `/${rel}`);
      }
    }
  }

  walk(dir);
  return routes.sort();
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};

/** Minimal static file server for the built landing dist. */
function startServer(): Promise<Server> {
  return new Promise((resolve) => {
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const url = req.url ?? '/';
      let filePath = resolvePath(DIST, url === '/' ? 'index.html' : `.${url}`);

      // Prevent path traversal outside DIST
      if (!filePath.startsWith(DIST)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

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

async function prerender(): Promise<void> {
  const routes = discoverRoutes(DIST);
  if (routes.length === 0) {
    throw new Error(`No routes found in ${DIST}. Did the landing build produce output?`);
  }
  console.log(`Prerendering ${routes.length} landing pages...`);

  const server = await startServer();
  const browser = await chromium.launch();

  try {
    for (const route of routes) {
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

prerender().catch((err: unknown) => {
  console.error('⚠ PRERENDER FAILED — pages will use client-side rendering only:', err);
  // Don't fail the build: noscript content + client-side hydration is the fallback.
  // CI can grep for "PRERENDER FAILED" to detect this condition.
});
