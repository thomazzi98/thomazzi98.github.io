import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, type Browser } from '@playwright/test';
import { identity } from '../src/lib/identity.ts';

const thesis = 'Systems that can say what happened, and prove it.';

const escapeHtml = (text: string): string =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const fontUrl = (file: string) => pathToFileURL(resolve('src/assets/fonts', file)).href;

interface RegisteredSystem {
  id: string;
  name: string;
  repository: { owner: string; name: string };
}

// The registry lists the systems in presentation order; the images follow it.
const readRegistry = (): RegisteredSystem[] =>
  JSON.parse(readFileSync(resolve('src/systems/repositories.json'), 'utf-8')) as RegisteredSystem[];

interface SystemCard {
  name: string;
  tagline: string;
  repository: { owner: string; name: string; pinnedCommit: string; pinnedOn: string };
}

// The models cannot load under node (extension-less imports), so a system card reads the built
// JSON route, which is the same model after validation. The build directory is dist unless named.
const buildDirectory = process.argv[2] ?? 'dist';

const readSystemCard = (id: string): SystemCard | undefined => {
  const path = resolve(buildDirectory, 'systems', `${id}.json`);
  if (!existsSync(path)) {
    return undefined;
  }
  const document = JSON.parse(readFileSync(path, 'utf-8')) as { system: SystemCard };
  return document.system;
};

const styles = `
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
    gap: 40px;
    margin: 0;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 24px;
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
    text-wrap: balance;
  }
  h1.long {
    font-size: 84px;
  }
  .thesis {
    margin: 22px 0 0;
    max-width: 980px;
    font-size: 50px;
    line-height: 1.12;
    font-style: italic;
    font-weight: 400;
    color: #ece7dc;
    text-wrap: balance;
  }
  .thesis.tagline {
    font-size: 40px;
  }
  .systems {
    display: flex;
    flex-wrap: wrap;
    gap: 12px 44px;
    margin: 0;
    padding: 26px 0 0;
    border-top: 1px solid #454950;
    list-style: none;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 30px;
    letter-spacing: 0.02em;
    color: #ece7dc;
  }
  .systems li {
    white-space: nowrap;
  }
  .number {
    margin-right: 14px;
    color: #a8a398;
  }
`;

const shell = (body: string) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>${styles}</style>
  </head>
  <body>${body}</body>
</html>`;

const defaultCard = (systemNames: string[]) => {
  const systemsMarkup = systemNames
    .map(
      (name, index) =>
        `<li><span class="number">${String(index + 1).padStart(2, '0')}</span>${escapeHtml(name)}</li>`,
    )
    .join('');
  return shell(`
    <p class="caption">
      <span>${escapeHtml(identity.name)}</span>
      <span>${escapeHtml(identity.headline)}</span>
    </p>
    <div>
      <h1>${escapeHtml(identity.name)}</h1>
      <p class="thesis">${escapeHtml(thesis)}</p>
    </div>
    <ol class="systems">${systemsMarkup}</ol>`);
};

const systemCard = (card: SystemCard) => {
  const pinned = `pinned ${card.repository.pinnedCommit.slice(0, 7)} · ${card.repository.pinnedOn}`;
  const nameClass = card.name.length > 16 ? ' class="long"' : '';
  return shell(`
    <p class="caption">
      <span>${escapeHtml(identity.name)}</span>
      <span>${escapeHtml(`${card.repository.owner}/${card.repository.name}`)}</span>
    </p>
    <div>
      <h1${nameClass}>${escapeHtml(card.name)}</h1>
      <p class="thesis tagline">${escapeHtml(card.tagline)}</p>
    </div>
    <ol class="systems"><li>${escapeHtml(pinned)}</li></ol>`);
};

const renderCard = async (browser: Browser, html: string, path: string) => {
  const context = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  const tab = await context.newPage();
  await tab.setContent(html, { waitUntil: 'load' });
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({ path, type: 'png' });
  await context.close();
};

// iOS and several scrapers ignore SVG icons, so the same drawing is rasterised once, in the dark scheme.
const renderTouchIcon = async (browser: Browser) => {
  const icon = readFileSync(resolve('public/favicon.svg'), 'utf-8');
  const context = await browser.newContext({
    viewport: { width: 180, height: 180 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
  });
  const tab = await context.newPage();
  await tab.setContent(
    `<!doctype html><html><head><style>html,body{margin:0}svg{display:block;width:180px;height:180px}</style></head><body>${icon}</body></html>`,
    { waitUntil: 'load' },
  );
  await tab.screenshot({ path: 'public/apple-touch-icon.png', type: 'png' });
  await context.close();
};

const registry = readRegistry();
const browser = await chromium.launch();
await renderCard(browser, defaultCard(registry.map((entry) => entry.name)), 'public/og.png');
console.log(`Wrote public/og.png with ${String(registry.length)} systems`);
mkdirSync('public/og', { recursive: true });
for (const entry of registry) {
  const card = readSystemCard(entry.id);
  if (card === undefined) {
    console.log(
      `Skipped public/og/${entry.id}.png: build first so ${buildDirectory}/systems/${entry.id}.json exists`,
    );
    continue;
  }
  await renderCard(browser, systemCard(card), `public/og/${entry.id}.png`);
  console.log(`Wrote public/og/${entry.id}.png`);
}
await renderTouchIcon(browser);
console.log('Wrote public/apple-touch-icon.png');
await browser.close();
