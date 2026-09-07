import { expect, test } from '@playwright/test';

test('a Re-queue button keeps keyboard focus while the bench runs, and Enter works', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('bench-frame')).toHaveAttribute('data-ready', 'true');
  await page.getByLabel('Answers 422').check();
  await page.getByRole('button', { name: 'Sign up' }).click();
  await page.getByLabel('Manual').check();
  const firstButton = page.locator('[data-ledger] button').first();
  await expect(firstButton).toBeVisible({ timeout: 15_000 });
  const name = (await firstButton.getAttribute('aria-label')) ?? 'Re-queue';
  const requeue = page.getByRole('button', { name, exact: true });
  await requeue.focus();
  await page.waitForTimeout(600);
  await expect(requeue).toBeFocused();
  await page.getByLabel('Healthy').check();
  await requeue.press('Enter');
  await expect(page.locator('[data-log]')).toContainText('re-queued #', { timeout: 5000 });
});

test('a bench on a case page starts ticking after the first action', async ({ page }) => {
  await page.goto('/work/design-contest-backend/');
  const frame = page.locator('bench-frame');
  await expect(frame).toHaveAttribute('data-ready', 'true');
  await expect(frame).toHaveAttribute('data-running', 'false');
  await page.getByRole('button', { name: 'Cast votes' }).click();
  await expect(frame).toHaveAttribute('data-running', 'true');
  await expect(page.locator('[data-log]')).toContainText('cast', { timeout: 10_000 });
});

test.beforeEach(({ javaScriptEnabled }) => {
  test.skip(!javaScriptEnabled, 'the interactive bench needs JavaScript');
});

test('the home bench boots, runs on its own and reacts to the provider lever', async ({ page }) => {
  await page.goto('/');
  const frame = page.locator('bench-frame');
  await expect(frame).toHaveAttribute('data-ready', 'true');
  await expect(frame).toHaveAttribute('data-running', 'true');
  await expect(page.locator('[data-ledger] tr').first()).toBeVisible({ timeout: 10_000 });
  await page.getByLabel('Answers 503').check();
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page.locator('[data-log]')).toContainText('503 from provider · retry in 1 s', {
    timeout: 15_000,
  });
  await expect(page.locator('[data-meter="signup"] [data-meter-caption]')).toContainText(
    'ms median',
  );
  await expect(page.locator('[data-meter="signup"]')).toHaveAttribute('data-tone', 'ok');
});

test('under reduced motion nothing moves until asked, and Step advances one event', async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/');
  const frame = page.locator('bench-frame');
  await expect(frame).toHaveAttribute('data-ready', 'true');
  await expect(frame).toHaveAttribute('data-running', 'false');
  await expect(page.locator('[data-clock]')).toHaveText('t = 0.0 s');
  await expect(page.locator('.bench__motion-note')).toBeVisible();
  await page.getByRole('button', { name: 'Step' }).click();
  await expect(page.locator('[data-clock]')).toHaveText('t = 1.8 s');
  await context.close();
});

test('without JavaScript the transcript is open and the controls are hidden', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.locator('details.transcript')).toHaveAttribute('open', '');
  expect(await page.locator('.transcript tbody tr').count()).toBeGreaterThan(8);
  await expect(page.locator('.bench__controls')).toBeHidden();
  await expect(page.locator('.drawing[data-orientation="horizontal"]')).toBeVisible();
  await context.close();
});

test('the transcript endpoint serves the same scripted run as JSON', async ({ request }) => {
  const response = await request.get('/bench/queued-bank-onboarding.json');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/json');
  const transcript = (await response.json()) as { scenario: string; entries: unknown[] };
  expect(transcript.scenario).toBe('queued-bank-onboarding');
  expect(transcript.entries.length).toBeGreaterThan(8);
});
