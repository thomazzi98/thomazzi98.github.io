import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { identity } from '../src/lib/identity.ts';

const escapeHtml = (text: string): string =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const fontUrl = (file: string) => pathToFileURL(resolve('src/assets/fonts', file)).href;

const page = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      @font-face {
        font-family: 'IBM Plex Sans';
        src: url('${fontUrl('ibm-plex-sans-variable.woff2')}') format('woff2');
        font-weight: 100 700;
      }
      @font-face {
        font-family: 'IBM Plex Mono';
        src: url('${fontUrl('ibm-plex-mono-400.woff2')}') format('woff2');
        font-weight: 400;
      }
      html, body { margin: 0; }
      body {
        width: 1200px;
        height: 630px;
        box-sizing: border-box;
        padding: 72px 80px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        background: #efe9dd;
        color: #1b1a17;
        font-family: 'IBM Plex Sans', sans-serif;
      }
      .label {
        font-family: 'IBM Plex Mono', monospace;
        font-size: 22px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #5a5750;
      }
      h1 {
        margin: 0;
        max-width: 980px;
        font-size: 68px;
        line-height: 1.08;
        font-weight: 600;
        letter-spacing: -0.02em;
      }
      .rule { border-top: 3px solid #24456e; width: 96px; margin-bottom: 28px; }
    </style>
  </head>
  <body>
    <p class="label">${escapeHtml(identity.name)} · ${escapeHtml(identity.headline)}</p>
    <div>
      <div class="rule"></div>
      <h1>${escapeHtml(identity.positioning)}</h1>
    </div>
    <p class="label">thomazzi98.github.io · ${escapeHtml(identity.city)}, Brazil · ${escapeHtml(identity.timezone)} · ${escapeHtml(identity.availability)}</p>
  </body>
</html>`;

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});
const tab = await context.newPage();
await tab.setContent(page, { waitUntil: 'load' });
await tab.evaluate(() => document.fonts.ready);
await tab.screenshot({ path: 'public/og.png', type: 'png' });
await browser.close();
console.log('Wrote public/og.png');
