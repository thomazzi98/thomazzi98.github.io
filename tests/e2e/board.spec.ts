import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { formatClock } from '../../src/islands/player/format';
import {
  clockAtZero,
  clockIn,
  expectNothingMoves,
  reducedMotionNote,
  stepUntilClockMoves,
} from './islands';

const ledgerLinesOn = (page: Page) => page.locator('.board__ledger .ledger__line');

// The board mounts when the browser is idle, so readiness is the only wait that means anything.
const openBoard = async (page: Page) => {
  await page.goto('/');
  const board = page.locator('.board');
  await expect(board).toHaveAttribute('data-ready', 'true', { timeout: 15_000 });
  return board;
};

test.describe('the system board', () => {
  test.skip(({ javaScriptEnabled }) => !javaScriptEnabled, 'the board is an island');

  test('boots, runs on its own, pauses, resets and steps', async ({ page }) => {
    const board = await openBoard(page);
    const clock = clockIn(board);
    await expect(board).toHaveAttribute('data-running', 'true');
    await expect(clock).not.toHaveText(clockAtZero);
    await expect(ledgerLinesOn(page).first()).toBeVisible();

    await board.getByRole('button', { name: 'Pause' }).click();
    await expect(board).toHaveAttribute('data-running', 'false');
    await expect(board.getByRole('button', { name: 'Play' })).toBeVisible();
    await expectNothingMoves(board);

    await board.getByRole('button', { name: 'Reset' }).click();
    await expect(clock).toHaveText(clockAtZero);
    await expect(board.locator('.board__ledger')).toContainText('Nothing has happened yet.');
    await expect(board).toHaveAttribute('data-running', 'false');

    await board.getByRole('button', { name: 'Step' }).click();
    await expect(ledgerLinesOn(page).first()).toBeVisible();
    await expect(board).toHaveAttribute('data-running', 'false');
    await expectNothingMoves(board);
  });

  test('the scrubber runs the clock to the end without playing and keeps every line', async ({
    page,
  }) => {
    const board = await openBoard(page);
    const scrubber = board.getByRole('slider', { name: 'Scrub the virtual clock' });
    await scrubber.focus();
    await scrubber.press('End');
    await expect(board).toHaveAttribute('data-running', 'false');
    const maximum = Number(await scrubber.getAttribute('max'));
    expect(maximum).toBeGreaterThan(0);
    await expect(scrubber).toHaveValue(String(maximum));
    await expect(clockIn(board)).toHaveText(formatClock(maximum));

    // The end of the scrubber is the end of every replay under its default levers.
    for (const progress of await board.locator('.board__flow').allTextContents()) {
      expect(progress.trim()).toMatch(/(\d+) of \1$/);
    }
    await expect(board.locator('.board__ledger .ledger__head')).toContainText(/(\d+) of \1 lines/);

    const step = board.getByRole('button', { name: 'Step' });
    await expect(step).toHaveAttribute('aria-disabled', 'true');
    await step.focus();
    await expect(step).toBeFocused();
    await expect(board.getByRole('button', { name: 'Replay' })).toBeVisible();
  });

  test('the ledger stays reachable by keyboard once every line is in it', async ({ page }) => {
    const board = await openBoard(page);
    const scrubber = board.getByRole('slider', { name: 'Scrub the virtual clock' });
    await scrubber.focus();
    await scrubber.press('End');
    await expect(board.locator('.board__ledger .ledger__head')).toContainText(/(\d+) of \1 lines/);
    // A box that keeps every line scrolls, and a scrolling box needs a keyboard way in.
    const results = await new AxeBuilder({ page })
      .include('.board__ledger')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test.describe('under reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('nothing moves until Play or Step and a note says so', async ({ page }) => {
      const board = await openBoard(page);
      const clock = clockIn(board);
      await expect(board.getByText(reducedMotionNote)).toBeVisible();
      await expect(board).toHaveAttribute('data-running', 'false');
      await expect(clock).toHaveText(clockAtZero);
      await expect(board.locator('.board__ledger')).toContainText('Nothing has happened yet.');
      await expectNothingMoves(board);

      const step = board.getByRole('button', { name: 'Step' });
      await step.click();
      await expect(ledgerLinesOn(page).first()).toBeVisible();
      await stepUntilClockMoves(step, clock);
      await expect(board).toHaveAttribute('data-running', 'false');

      await board.getByRole('button', { name: 'Play' }).click();
      await expect(board).toHaveAttribute('data-running', 'true');
    });
  });
});

test('without JavaScript the board still shows the drawings and the facts', async ({
  page,
  javaScriptEnabled,
}) => {
  test.skip(javaScriptEnabled, 'this is the no-JavaScript projection');
  await page.goto('/');
  await expect(page.locator('.board svg.schematic')).toHaveCount(3);
  await expect(page.locator('.board__rail')).toBeHidden();
  const facts = page.locator('.board__facts table.facts');
  await expect(facts.locator('tbody tr')).toHaveCount(3);
  await expect(facts).toContainText('thomazzi98/cryptopay');
  await expect(facts).toContainText('thomazzi98/whatsapp-notification-platform');
  await expect(facts).toContainText('thomazzi98/mini-payment-gateway');
});
