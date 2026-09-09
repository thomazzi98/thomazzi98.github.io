import { expect, test, type Page } from '@playwright/test';
import { clockAtZero, stepUntilClockMoves } from './islands';

const boardOn = (page: Page) => page.locator('.board');
const clockOn = (page: Page) => page.locator('.board__clock');
const ledgerLinesOn = (page: Page) => page.locator('.board__ledger .ledger__line');

test.describe('the system board', () => {
  test.skip(({ javaScriptEnabled }) => !javaScriptEnabled, 'the board is an island');

  test('boots, runs on its own, pauses, resets and steps', async ({ page }) => {
    await page.goto('/');
    const board = boardOn(page);
    const clock = clockOn(page);
    await expect(board).toHaveAttribute('data-ready', 'true');
    await expect(board).toHaveAttribute('data-running', 'true');
    await expect(clock).not.toHaveText(clockAtZero);
    await expect(ledgerLinesOn(page).first()).toBeVisible();

    const pause = board.getByRole('button', { name: 'Pause' });
    await expect(pause).toHaveAttribute('aria-pressed', 'true');
    await pause.click();
    await expect(board).toHaveAttribute('data-running', 'false');
    await expect(board.getByRole('button', { name: 'Play' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    const pausedAt = (await clock.textContent()) ?? '';
    await page.waitForTimeout(400);
    await expect(clock).toHaveText(pausedAt);

    await board.getByRole('button', { name: 'Reset' }).click();
    await expect(clock).toHaveText(clockAtZero);
    await expect(board.locator('.board__ledger')).toContainText('Nothing has happened yet.');
    await expect(board).toHaveAttribute('data-running', 'false');

    await board.getByRole('button', { name: 'Step' }).click();
    await expect(ledgerLinesOn(page).first()).toBeVisible();
    await expect(board).toHaveAttribute('data-running', 'false');
  });

  test('the scrubber moves the clock without playing', async ({ page }) => {
    await page.goto('/');
    const board = boardOn(page);
    await expect(board).toHaveAttribute('data-ready', 'true');
    const scrubber = board.getByRole('slider', { name: 'Scrub the virtual clock' });
    await scrubber.focus();
    await scrubber.press('End');
    await expect(board).toHaveAttribute('data-running', 'false');
    const maximum = await scrubber.getAttribute('max');
    await expect(scrubber).toHaveValue(maximum ?? '');
    await expect(clockOn(page)).not.toHaveText(clockAtZero);
  });

  test.describe('under reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('nothing moves until Step and a note says so', async ({ page }) => {
      await page.goto('/');
      const board = boardOn(page);
      const clock = clockOn(page);
      await expect(board).toHaveAttribute('data-ready', 'true');
      await expect(
        board.getByText('Reduced motion: nothing moves until you press Step.'),
      ).toBeVisible();
      await expect(board.getByRole('button', { name: 'Play' })).toHaveCount(0);
      await expect(board).toHaveAttribute('data-running', 'false');
      await expect(clock).toHaveText(clockAtZero);
      await expect(board.locator('.board__ledger')).toContainText('Nothing has happened yet.');

      const step = board.getByRole('button', { name: 'Step' });
      await step.click();
      await expect(ledgerLinesOn(page).first()).toBeVisible();
      await stepUntilClockMoves(step, clock);
      await expect(board).toHaveAttribute('data-running', 'false');
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
  await expect(page.locator('.board__clock')).toHaveText(clockAtZero);
  const facts = page.locator('table.board__facts');
  await expect(facts.locator('tbody tr')).toHaveCount(3);
  await expect(facts).toContainText('thomazzi98/cryptopay');
  await expect(facts).toContainText('thomazzi98/whatsapp-notification-platform');
  await expect(facts).toContainText('thomazzi98/mini-payment-gateway');
});
