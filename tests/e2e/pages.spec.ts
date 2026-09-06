import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
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

    test('ships no JavaScript of its own', async ({ page }) => {
      await page.goto(route);
      const inlineScripts = page.locator('script:not([src]):not([type="application/ld+json"])');
      const ownScripts = page.locator('script[src^="/"], script[src^="http://127.0.0.1"]');
      await expect(inlineScripts).toHaveCount(0);
      await expect(ownScripts).toHaveCount(0);
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
