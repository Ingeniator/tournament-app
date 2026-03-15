/**
 * Generates sitemap.xml from the Vite input entries.
 * Run after build: npx tsx scripts/generate-sitemap.ts
 */
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BASE = 'https://padelday.net';

// All landing page paths (must match vite.config.ts input entries)
const pages = [
  // English
  '/',
  '/formats',
  '/americano',
  '/mexicano',
  '/awards',
  '/maldiciones',
  '/club',
  '/which-format',
  '/organize',
  '/americano-vs-mexicano',
  '/team-americano',
  '/king-of-the-court',
  '/mexicano-12-players',
  '/mexicano-16-players',
  '/features',
  '/americano-8-players',
  '/americano-12-players',
  '/mexicano-8-players',
  '/how-long-padel-tournament',
  '/social-padel-events',
  '/inter-club',
  '/round-robin-vs-americano',
  '/balanced-matches',
  '/beginners',
  '/score-tracker',
  '/planner',
  // Spanish
  '/es/',
  '/es/formatos',
  '/es/americano',
  '/es/mexicano',
  '/es/organizar-torneo-padel',
];

const today = new Date().toISOString().split('T')[0];

const urls = pages.map(path => {
  const loc = `${BASE}${path}`;
  // Home pages get higher priority
  const priority = path === '/' || path === '/es/' ? '1.0' : '0.7';
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <priority>${priority}</priority>
  </url>`;
}).join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

const outPath = resolve(__dirname, '..', 'public', 'sitemap.xml');
writeFileSync(outPath, sitemap);
console.log(`Sitemap written to ${outPath} (${pages.length} URLs)`);
