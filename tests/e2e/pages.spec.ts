import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const scriptBudgetBytes = 40_000;
import { readSitemapRoutes } from './routes';

const routes = readSitemapRoutes();

test('the sitemap lists every page', () => {
  expect(routes).toContain('/');
  expect(routes).toContain('/work/');
  expect(routes).toContain('/about/');
  expect(routes).toContain('/stack/');
});

for (const route of routes) {
  test.describe(route, () => {
    test('renders with a title, one h1 and a description', async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(/\S/);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\S/);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `https://thomazzi98.github.io${route}`,
      );
    });

    test('stays inside the script budget', async ({ page, request }) => {
      await page.goto(route);
      const sources = await page
        .locator('script[src]')
        .evaluateAll((scripts) => scripts.map((script) => script.getAttribute('src') ?? ''));
      let bytes = 0;
      for (const source of sources) {
        const response = await request.get(source);
        expect(response.status()).toBe(200);
        bytes += (await response.body()).byteLength;
      }
      expect(bytes).toBeLessThanOrEqual(scriptBudgetBytes);
    });

    test('has no accessibility violations at WCAG 2.2 AA', async ({ page, javaScriptEnabled }) => {
      test.skip(!javaScriptEnabled, 'axe-core needs JavaScript to run inside the page');
      await page.goto(route);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  });
}
