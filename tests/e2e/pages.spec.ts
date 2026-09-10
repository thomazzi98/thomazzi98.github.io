import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { horizontalOverflow, revealIslands } from './islands';
import { readSitemapRoutes } from './routes';

const scriptBudgetBytes = 70_000;
const viewportWidths = [320, 1024];
const minimumContrast = 4.5;

const routes = readSitemapRoutes();
const systemRoutes = routes.filter((route) => /^\/systems\/[^/]+\/$/.test(route));

const channel = (value: number): number => {
  const scaled = value / 255;
  return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
};

const luminance = (color: string): number => {
  const [red = 0, green = 0, blue = 0] = (color.match(/\d+(\.\d+)?/g) ?? []).map(Number);
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
};

const contrastRatio = (foreground: string, background: string): number => {
  const [lighter = 0, darker = 0] = [luminance(foreground), luminance(background)].sort(
    (first, second) => second - first,
  );
  return (lighter + 0.05) / (darker + 0.05);
};

test('the sitemap lists every page', () => {
  expect(routes).toContain('/');
  expect(routes).toContain('/systems/');
  expect(routes).toContain('/about/');
  expect(routes).toContain('/colophon/');
  expect(systemRoutes).toHaveLength(3);
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

    test('does not scroll horizontally', async ({ page, javaScriptEnabled }) => {
      await page.goto(route);
      if (javaScriptEnabled) {
        await revealIslands(page);
      }
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });

    test('does not scroll horizontally at 320 and 1024 pixels', async ({
      page,
      isMobile,
      javaScriptEnabled,
    }) => {
      test.skip(isMobile, 'the phone project runs at its own width');
      for (const width of viewportWidths) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route);
        if (javaScriptEnabled) {
          await revealIslands(page);
        }
        expect(await horizontalOverflow(page), `${String(width)}px wide`).toBeLessThanOrEqual(0);
      }
    });

    test('has no duplicated id once every island has loaded', async ({
      page,
      javaScriptEnabled,
    }) => {
      await page.goto(route);
      if (javaScriptEnabled) {
        await revealIslands(page);
      }
      const repeated = await page.evaluate(() => {
        const seen = new Set<string>();
        const duplicates = new Set<string>();
        for (const element of document.querySelectorAll('[id]')) {
          if (seen.has(element.id)) {
            duplicates.add(element.id);
          }
          seen.add(element.id);
        }
        return [...duplicates];
      });
      expect(repeated).toEqual([]);
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

for (const route of systemRoutes) {
  test.describe(route, () => {
    // The desktop project renders the dark scheme and the phone the light one, so between them
    // both sets of fragment colours are measured against the ground they are painted on.
    test('keeps every code fragment token at 4.5:1 against its ground', async ({ page }) => {
      await page.goto(route);
      const pairs = await page.evaluate(() => {
        const found = new Set<string>();
        for (const block of document.querySelectorAll('.fragment .astro-code')) {
          const background = getComputedStyle(block).backgroundColor;
          for (const token of block.querySelectorAll('span')) {
            if (token.textContent.trim() === '') {
              continue;
            }
            found.add(`${getComputedStyle(token).color} on ${background}`);
          }
        }
        return [...found];
      });
      expect(pairs.length).toBeGreaterThan(0);
      const failing = pairs.filter((pair) => {
        const [foreground = '', background = ''] = pair.split(' on ');
        return contrastRatio(foreground, background) < minimumContrast;
      });
      expect(failing).toEqual([]);
    });
  });
}
