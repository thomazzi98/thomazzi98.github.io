import { expect, test, type Locator, type Page } from '@playwright/test';
import type { Flow, Lever } from '../../src/systems/schema';
import {
  clockAtZero,
  clockIn,
  expectNothingMoves,
  horizontalOverflow,
  hydrated,
  must,
  readPaletteIndex,
  readSystemDocument,
  reducedMotionNote,
  stepUntilClockMoves,
} from './islands';
import { readSitemapRoutes } from './routes';

const systemId = 'cryptopay';
const route = `/systems/${systemId}/`;

const firstStage = (page: Page) => page.locator('#flows .player').first();

const pathFlows = (flows: readonly Flow[]) =>
  flows.filter((flow) => flow.kind === 'request' || flow.kind === 'asynchronous');

const stepsUnder = (flow: Flow, lever: Lever, value: string) =>
  flow.steps.filter((step) =>
    step.when.every((condition) => condition.lever !== lever.id || condition.value === value),
  );

const ledgerLinesOnlyUnder = (flow: Flow, lever: Lever, value: string, other: string) => {
  const otherLines = new Set(stepsUnder(flow, lever, other).map((step) => step.ledger));
  return stepsUnder(flow, lever, value)
    .map((step) => step.ledger)
    .filter((line) => !otherLines.has(line));
};

const openStage = async (page: Page) => {
  await page.goto(route);
  const player = firstStage(page);
  await hydrated(player);
  await expect(player).toHaveAttribute('data-ready', 'true');
  return player;
};

// The radio inputs are visually hidden behind their labels, so a person clicks the label.
const choose = async (player: Locator, label: string) => {
  const option = player.getByText(label, { exact: true });
  await option.evaluate((element) => {
    element.scrollIntoView({ block: 'center' });
  });
  await option.click();
  await expect(player.getByRole('radio', { name: label, exact: true })).toBeChecked();
};

const stepTimes = async (player: Locator, count: number) => {
  const step = player.getByRole('button', { name: 'Step' });
  for (let index = 0; index < count; index += 1) {
    await step.click();
  }
};

test.describe('the flow player', () => {
  test.skip(({ javaScriptEnabled }) => !javaScriptEnabled, 'the player is an island');

  test('the first stage plays on its own, fills the ledger and ends with Step disabled', async ({
    page,
    request,
  }) => {
    const { system } = await readSystemDocument(request, systemId);
    const first = must(pathFlows(system.flows)[0], 'the first request flow');
    const player = await openStage(page);
    await expect(player).toHaveAttribute('data-flow', first.id);
    await expect(player).toHaveAttribute('data-running', 'true');
    await expect(clockIn(player)).not.toHaveText(clockAtZero);
    await expect(player.locator('[data-ledger] .ledger__line').first()).toBeVisible();
    const firstStep = must(first.steps[0], 'the first step');
    await expect(player.locator('[data-ledger]')).toContainText(firstStep.ledger);

    const scrubber = player.getByRole('slider', { name: 'Scrub the virtual clock' });
    await scrubber.focus();
    await scrubber.press('End');
    await expect(player).toHaveAttribute('data-running', 'false');
    await expect(player.locator('.player__progress')).toHaveText(/(\d+) of \1 steps/);
    const step = player.getByRole('button', { name: 'Step' });
    await expect(step).toHaveAttribute('aria-disabled', 'true');
    await step.focus();
    await expect(step).toBeFocused();
    await expect(player.getByRole('button', { name: 'Replay' })).toBeVisible();
    await expectNothingMoves(player);
  });

  test('switching a lever replays from the start and changes what the ledger says', async ({
    page,
    request,
  }) => {
    const { system } = await readSystemDocument(request, systemId);
    const first = must(pathFlows(system.flows)[0], 'the first request flow');
    const lever = must(first.levers[0], `a lever on ${first.id}`);
    const alternative = must(
      lever.options.find((option) => option.value !== lever.defaultValue),
      'a non-default lever option',
    );
    const alternativeLine = must(
      ledgerLinesOnlyUnder(first, lever, alternative.value, lever.defaultValue).at(-1),
      'a ledger line unique to the alternative',
    );
    const defaultLine = must(
      ledgerLinesOnlyUnder(first, lever, lever.defaultValue, alternative.value).at(-1),
      'a ledger line unique to the default',
    );
    const player = await openStage(page);
    const ledger = player.locator('[data-ledger]');
    const reset = player.getByRole('button', { name: 'Reset' });

    await choose(player, alternative.label);
    await expect(ledger).toContainText(`${lever.label}: ${alternative.label}. Replaying.`);
    await expect(player).toHaveAttribute('data-running', 'true');

    // Reset stops the replay so the rest of the run is stepped by hand, one event at a time.
    await reset.click();
    await expect(clockIn(player)).toHaveText(clockAtZero);
    await expect(ledger).toContainText('Nothing has happened yet.');
    const total = stepsUnder(first, lever, alternative.value).length;
    await stepTimes(player, total);
    await expect(player.locator('.player__progress')).toHaveText(
      `${String(total)} of ${String(total)} steps`,
    );
    await expect(ledger).toContainText(alternativeLine);
    await expect(ledger).not.toContainText(defaultLine);

    const defaultOption = must(
      lever.options.find((option) => option.value === lever.defaultValue),
      'the default lever option',
    );
    await choose(player, defaultOption.label);
    await expect(ledger).toContainText(`${lever.label}: ${defaultOption.label}. Replaying.`);
    await reset.click();
    await expect(ledger).toContainText('Nothing has happened yet.');
    await stepTimes(player, stepsUnder(first, lever, lever.defaultValue).length);
    await expect(ledger).toContainText(defaultLine);
    await expect(ledger).not.toContainText(alternativeLine);
  });

  test('the flow selector swaps the flow and replays it from the start', async ({
    page,
    request,
  }) => {
    const { system } = await readSystemDocument(request, systemId);
    const second = must(pathFlows(system.flows)[1], 'a second request flow');
    const secondFirstStep = must(second.steps[0], `the first step of ${second.id}`);
    const player = await openStage(page);
    await choose(player, second.name);
    await expect(player).toHaveAttribute('data-flow', second.id);
    await expect(player.locator('.player__flow')).toContainText(second.name);
    const ledger = player.locator('[data-ledger]');
    await expect(ledger).toContainText(`Flow: ${second.name}. Replaying.`);
    await expect(player).toHaveAttribute('data-running', 'true');
    await expect(ledger).toContainText(secondFirstStep.ledger);
  });

  test('a palette choice of a flow selects it in the stage already on the page', async ({
    page,
    request,
  }) => {
    const { system } = await readSystemDocument(request, systemId);
    const second = must(pathFlows(system.flows)[1], 'a second request flow');
    const index = await readPaletteIndex(request);
    const entry = must(
      index.find((candidate) => candidate.href === `${route}#flow-${second.id}`),
      `a palette entry for ${second.id}`,
    );
    const player = await openStage(page);
    await page.keyboard.press('Control+k');
    const input = page.getByRole('combobox', { name: 'Jump to' });
    await expect(input).toBeFocused();
    await input.fill(entry.title);
    await expect(page.getByRole('option', { name: entry.title })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await page.keyboard.press('Enter');
    await expect.poll(() => new URL(page.url()).hash).toBe(`#flow-${second.id}`);
    await expect(input).toBeHidden();
    await expect(player).toHaveAttribute('data-flow', second.id);
    await expect(player.getByRole('radio', { name: second.name, exact: true })).toBeChecked();
  });

  test('the transcript tables are rendered closed and open without widening the page', async ({
    page,
  }) => {
    await page.goto(route);
    const transcripts = page.locator('details.transcript');
    expect(await transcripts.count()).toBeGreaterThan(0);
    await expect(page.locator('details.transcript[open]')).toHaveCount(0);
    const firstTranscript = transcripts.first();
    await firstTranscript.locator('summary').click();
    await expect(firstTranscript).toHaveJSProperty('open', true);
    expect(await firstTranscript.locator('tbody tr').count()).toBeGreaterThan(1);
    await expect(firstTranscript.locator('tbody tr').first()).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });

  test.describe('under reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('nothing plays until Play or Step, a note says so, and a change only resets', async ({
      page,
      request,
    }) => {
      const { system } = await readSystemDocument(request, systemId);
      const second = must(pathFlows(system.flows)[1], 'a second request flow');
      const player = await openStage(page);
      const clock = clockIn(player);
      await expect(player.getByText(reducedMotionNote)).toBeVisible();
      await expect(player.getByRole('button', { name: 'Play' })).toBeVisible();
      await expect(player).toHaveAttribute('data-running', 'false');
      await expect(clock).toHaveText(clockAtZero);
      await expectNothingMoves(player);

      const step = player.getByRole('button', { name: 'Step' });
      await step.click();
      await expect(player.locator('[data-ledger] .ledger__line').first()).toBeVisible();
      await stepUntilClockMoves(step, clock);
      await expect(player).toHaveAttribute('data-running', 'false');

      await choose(player, second.name);
      await expect(player.locator('[data-ledger]')).toContainText(
        `Flow: ${second.name}. Reset; press Play or Step.`,
      );
      await expect(player).toHaveAttribute('data-running', 'false');
      await expect(clock).toHaveText(clockAtZero);
    });
  });
});

test('without JavaScript every transcript is open and readable', async ({
  page,
  javaScriptEnabled,
}) => {
  test.skip(javaScriptEnabled, 'this is the no-JavaScript projection');
  await page.goto(route);
  const transcripts = page.locator('details.transcript');
  const total = await transcripts.count();
  expect(total).toBeGreaterThan(0);
  await expect(page.locator('details.transcript[open]')).toHaveCount(total);
  await expect(transcripts.first().locator('tbody tr').first()).toBeVisible();
  await expect(transcripts.first().locator('tbody tr td').first()).toHaveText(clockAtZero);
  // The note lives in a noscript element, which the text engine skips, so it is found by class.
  const note = page.locator('p.stage__note').first();
  await expect(note).toBeVisible();
  await expect(note).toHaveText(
    'Without JavaScript the replays do not run; the transcripts below are complete.',
  );
  await expect(page.locator('#flows .player__rail')).toBeHidden();
  await expect(page.locator('#flows .player__levers')).toBeHidden();
});

test('the JSON route serves each system with one transcript per flow', async ({ request }) => {
  const ids = readSitemapRoutes()
    .map((route) => /^\/systems\/([^/]+)\/$/.exec(route)?.[1])
    .filter((id): id is string => id !== undefined);
  expect(ids).toHaveLength(3);
  for (const id of ids) {
    const { system, transcripts } = await readSystemDocument(request, id);
    expect(system.id).toBe(id);
    expect(Object.keys(transcripts).sort()).toEqual(system.flows.map((flow) => flow.id).sort());
    for (const flow of system.flows) {
      const transcript = transcripts[flow.id] ?? [];
      expect(transcript.length).toBeGreaterThan(1);
      expect(transcript[0]?.at).toBe(0);
      expect(transcript.every((entry) => entry.message.length > 0)).toBe(true);
    }
  }
});
