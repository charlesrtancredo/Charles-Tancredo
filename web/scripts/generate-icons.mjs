// Gera os ícones PNG do PWA a partir de public/icons/favicon.svg usando o Chromium do Playwright.
// Requer Playwright: npx playwright install chromium && npm i -D playwright --workspace web
// Uso: npm run icons --workspace web
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
const svg = await readFile(join(dir, 'favicon.svg'), 'utf8');

const targets = [
  { file: 'icon-192.png', size: 192, pad: 0 },
  { file: 'icon-512.png', size: 512, pad: 0 },
  { file: 'icon-512-maskable.png', size: 512, pad: 0.1 },
  { file: 'apple-touch-icon.png', size: 180, pad: 0 },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const t of targets) {
  const inner = Math.round(t.size * (1 - t.pad * 2));
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(
    `<html><body style="margin:0;background:#01060c;display:grid;place-items:center;width:${t.size}px;height:${t.size}px">` +
      svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `) +
      '</body></html>',
  );
  await writeFile(join(dir, t.file), await page.screenshot({ type: 'png' }));
  console.log('✓', t.file);
}
await browser.close();
