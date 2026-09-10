import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { z } from 'astro/zod';
import { systemSchema } from '../../src/systems/schema';

export const clockAtZero = 'T+00:00.000';

export const reducedMotionNote =
  'Reduced motion: nothing moves until you press Play or Step or move the scrubber.';

const transcriptEntrySchema = z.object({
  at: z.number(),
  station: z.string(),
  tone: z.string(),
  message: z.string(),
});

export const systemDocumentSchema = z.object({
  system: systemSchema,
  transcripts: z.record(z.string(), z.array(transcriptEntrySchema)),
});

export type SystemDocument = z.infer<typeof systemDocumentSchema>;

export const paletteEntrySchema = z.object({
  kind: z.enum(['page', 'system', 'node', 'flow', 'decision']),
  title: z.string().min(1),
  subtitle: z.string(),
  href: z.string().startsWith('/'),
  keywords: z.array(z.string()),
});

export const readPaletteIndex = async (request: APIRequestContext) => {
  const response = await request.get('/palette.json');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/json');
  const body: unknown = await response.json();
  return z.array(paletteEntrySchema).min(1).parse(body);
};

export const readSystemDocument = async (
  request: APIRequestContext,
  id: string,
): Promise<SystemDocument> => {
  const response = await request.get(`/systems/${id}.json`);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/json');
  const body: unknown = await response.json();
  return systemDocumentSchema.parse(body);
};

export const must = <Value>(value: Value | undefined, description: string): Value => {
  if (value === undefined) {
    throw new Error(`${description} is missing from the model`);
  }
  return value;
};

// Islands mount when they scroll into view; walk the page so every one of them hydrates. The
// sections below the fold render lazily and the page grows as they do, so the height is read
// again on every step rather than once at the top.
export const revealIslands = async (page: Page): Promise<void> => {
  await page.evaluate(async () => {
    const nextFrame = () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    const stride = Math.max(200, window.innerHeight * 0.8);
    for (let top = 0; top < document.documentElement.scrollHeight; top += stride) {
      window.scrollTo(0, top);
      await nextFrame();
      await nextFrame();
    }
    window.scrollTo(0, 0);
  });
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0, { timeout: 15_000 });
};

export const hydrated = async (island: Locator): Promise<void> => {
  await island.scrollIntoViewIfNeeded();
  await expect(island.locator('xpath=ancestor::astro-island[1]')).not.toHaveAttribute('ssr', {
    timeout: 15_000,
  });
};

export const clockIn = (root: Locator): Locator =>
  root.getByRole('timer', { name: 'Virtual clock' });

export const horizontalOverflow = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

// A stopped replay renders no new revision and moves no clock across the page's own frames; two
// ticks are enough because a running loop refreshes on every one.
export const expectNothingMoves = async (root: Locator): Promise<void> => {
  const readings = await root.evaluate(async (element) => {
    const nextFrame = () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    const snapshot = () =>
      `${element.getAttribute('data-revision') ?? ''} ${
        element.querySelector('[data-clock]')?.textContent ?? ''
      }`;
    const before = snapshot();
    await nextFrame();
    await nextFrame();
    return { before, after: snapshot() };
  });
  expect(readings.after).toBe(readings.before);
};

export const stepUntilClockMoves = async (step: Locator, clock: Locator): Promise<void> => {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await step.click();
    if ((await clock.textContent()) !== clockAtZero) {
      return;
    }
  }
  await expect(clock).not.toHaveText(clockAtZero);
};
