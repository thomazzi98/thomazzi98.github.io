import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { revealIslands } from './islands';
import { readSitemapRoutes } from './routes';

const scriptBudgetBytes = 70_000;

const routes = readSitemapRoutes();

test('the sitemap lists every page', () => {
  expect(routes).toContain('/');
  expect(routes).toContain('/systems/');
  expect(routes).toContain('/about/');
  expect(routes).toContain('/colophon/');
  expect(routes.filter((route) => /^\/systems\/[^/]+\/$/.test(route))).toHaveLength(3);
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

    test('does not scroll horizontally', async ({ page }) => {
      await page.goto(route);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test('stays inside the script budget once every island has loaded', async ({
      page,
      javaScriptEnabled,
    }, testInfo) => {
      test.skip(!javaScriptEnabled, 'no script loads without JavaScript');
      const sizes: Promise<number>[] = [];
      page.on('response', (response) => {
        if (response.request().resourceType() !== 'script') {
          return;
        }
        sizes.push(
          response.body().then(
            (body) => body.byteLength,
            () => 0,
          ),
        );
      });
      await page.goto(route);
      await revealIslands(page);
      const bytes = (await Promise.all(sizes)).reduce((sum, size) => sum + size, 0);
      testInfo.annotations.push({ type: 'script bytes', description: String(bytes) });
      expect(bytes).toBeLessThanOrEqual(scriptBudgetBytes);
    });

    test('has no accessibility violations at WCAG 2.2 AA', async ({ page, javaScriptEnabled }) => {
      test.skip(!javaScriptEnabled, 'axe-core needs JavaScript to run inside the page');
      // A system page carries hundreds of nodes and the other workers replay traces meanwhile.
      test.slow();
      await page.goto(route);
      await revealIslands(page);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  });
}
