import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { identity } from '../src/lib/identity.ts';

const thesis = 'Systems that can say what happened, and prove it.';

const escapeHtml = (text: string): string =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const fontUrl = (file: string) => pathToFileURL(resolve('src/assets/fonts', file)).href;

// The registry lists the systems in presentation order; the image follows it.
const readSystemNames = (): string[] => {
  const entries = JSON.parse(readFileSync(resolve('src/systems/repositories.json'), 'utf-8')) as {
    name: string;
  }[];
  return entries.map((entry) => entry.name);
};

const systemNames = readSystemNames();

const systemsMarkup = systemNames
  .map(
    (name, index) =>
      `<li><span class="number">${String(index + 1).padStart(2, '0')}</span>${escapeHtml(name)}</li>`,
  )
  .join('');

const page = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      @font-face {
        font-family: 'Instrument Serif';
        src: url('${fontUrl('instrument-serif-normal.woff2')}') format('woff2');
        font-weight: 400;
        font-style: normal;
      }
      @font-face {
        font-family: 'Instrument Serif';
        src: url('${fontUrl('instrument-serif-italic.woff2')}') format('woff2');
        font-weight: 400;
        font-style: italic;
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
        padding: 64px 80px 60px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        background: #121416;
        color: #ece7dc;
        font-family: 'Instrument Serif', Georgia, serif;
      }
      .caption {
        display: flex;
        justify-content: space-between;
        margin: 0;
        font-family: 'IBM Plex Mono', monospace;
        font-size: 20px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #a8a398;
      }
      h1 {
        margin: 0;
        font-size: 108px;
        line-height: 1;
        font-weight: 400;
        letter-spacing: -0.015em;
      }
      .thesis {
        margin: 22px 0 0;
        max-width: 960px;
        font-size: 50px;
        line-height: 1.12;
        font-style: italic;
        font-weight: 400;
        color: #ece7dc;
      }
      .systems {
        display: flex;
        gap: 48px;
        margin: 0;
        padding: 26px 0 0;
        border-top: 1px solid #454950;
        list-style: none;
        font-family: 'IBM Plex Mono', monospace;
        font-size: 22px;
        letter-spacing: 0.02em;
        color: #ece7dc;
      }
      .number {
        margin-right: 14px;
        color: #a8a398;
      }
    </style>
  </head>
  <body>
    <p class="caption">
      <span>${escapeHtml(identity.name)}</span>
      <span>${escapeHtml(identity.headline)}</span>
    </p>
    <div>
      <h1>${escapeHtml(identity.name)}</h1>
      <p class="thesis">${escapeHtml(thesis)}</p>
    </div>
    <ol class="systems">${systemsMarkup}</ol>
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
console.log(`Wrote public/og.png with ${String(systemNames.length)} systems`);
