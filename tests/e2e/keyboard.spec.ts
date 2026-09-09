import { expect, test } from '@playwright/test';

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

test('primary navigation is reachable by keyboard and marks the current page', async ({ page }) => {
  await page.goto('/about/');
  const current = page.locator('nav[aria-label="Primary"] a[aria-current="page"]');
  await expect(current).toHaveText('About');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Rafael Thomazzi' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'About' })).toBeFocused();
});

test('resume.txt and llms.txt are served as plain text', async ({ request }) => {
  for (const path of ['/resume.txt', '/llms.txt']) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/plain');
    expect((await response.text()).length).toBeGreaterThan(200);
  }
});
