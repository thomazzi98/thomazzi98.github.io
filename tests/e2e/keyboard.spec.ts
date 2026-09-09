import { expect, test } from '@playwright/test';
import { must, readPaletteIndex } from './islands';

test('the skip link is the first tab stop and moves focus to the main landmark', async ({
  page,
}) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: 'Skip to content' });
  await expect(skipLink).toBeFocused();
  await skipLink.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});

test('primary navigation is reachable by keyboard in order and marks the current page', async ({
  page,
}) => {
  await page.goto('/about/');
  const navigation = page.locator('nav[aria-label="Primary"]');
  await expect(navigation.locator('a[aria-current="page"]')).toHaveText('About');
  const labels = (await navigation.locator('a').allTextContents()).map((label) => label.trim());
  expect(labels).toContain('Systems');
  expect(labels).toContain('About');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.locator('a.wordmark')).toBeFocused();
  for (const label of labels) {
    await page.keyboard.press('Tab');
    await expect(navigation.getByRole('link', { name: label, exact: true })).toBeFocused();
  }
});

test('the section navigation of a system page points at sections that exist', async ({ page }) => {
  await page.goto('/systems/cryptopay/');
  const targets = await page
    .locator('nav[aria-label="Sections"] a')
    .evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute('href') ?? ''));
  expect(targets.length).toBeGreaterThan(0);
  for (const target of targets) {
    expect(target.startsWith('#')).toBe(true);
    await expect(page.locator(target)).toHaveCount(1);
  }
});

test('the command palette opens with the shortcut and jumps to a decision', async ({
  page,
  request,
  javaScriptEnabled,
}) => {
  test.skip(!javaScriptEnabled, 'the palette is an island');
  const index = await readPaletteIndex(request);
  const titles = index.map((entry) => entry.title);
  const decision = must(
    index.find(
      (entry) =>
        entry.kind === 'decision' &&
        titles.filter((title) => title.includes(entry.title)).length === 1,
    ),
    'a decision whose title occurs once',
  );
  await page.goto('/about/');
  const trigger = page.getByRole('button', { name: 'Search' });
  await expect(trigger).toBeVisible();
  await page.keyboard.press('Control+k');
  const input = page.getByRole('combobox', { name: 'Jump to' });
  await expect(input).toBeFocused();
  await input.fill(decision.title);
  const option = page.getByRole('option', { name: decision.title });
  await expect(option).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Enter');
  await expect
    .poll(() => {
      const url = new URL(page.url());
      return `${url.pathname}${url.hash}`;
    })
    .toBe(decision.href);
  await expect(page.locator(`[id="${decision.href.split('#')[1] ?? ''}"]`)).toBeVisible();
});

test('the palette closes with Escape and returns focus to its trigger', async ({
  page,
  javaScriptEnabled,
}) => {
  test.skip(!javaScriptEnabled, 'the palette is an island');
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Search' })).toBeVisible();
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('combobox', { name: 'Jump to' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Search' })).toBeFocused();
});

test('without JavaScript no search button is offered', async ({ page, javaScriptEnabled }) => {
  test.skip(javaScriptEnabled, 'this is the no-JavaScript projection');
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Search' })).toHaveCount(0);
  await expect(page.locator('dialog.palette')).toBeHidden();
});

test('resume.txt and llms.txt are served as plain text', async ({ request }) => {
  for (const path of ['/resume.txt', '/llms.txt']) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/plain');
    expect((await response.text()).length).toBeGreaterThan(200);
  }
});
