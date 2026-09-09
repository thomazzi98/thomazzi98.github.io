import { expect, test, type Page } from '@playwright/test';
import { hydrated, must, readSystemDocument } from './islands';

const systemId = 'cryptopay';
const route = `/systems/${systemId}/`;

const openExplorer = async (page: Page) => {
  await page.goto(route);
  const explorer = page.locator('.explorer');
  await hydrated(explorer);
  return explorer;
};

test.describe('the system explorer', () => {
  test.skip(({ javaScriptEnabled }) => !javaScriptEnabled, 'the explorer is an island');

  test('keyboard: Tab reaches the first node, arrows move focus, Enter inspects, Escape clears', async ({
    page,
    request,
    isMobile,
  }) => {
    test.skip(isMobile, 'on a phone the inspector is a dialog; see the phone test');
    const { system } = await readSystemDocument(request, systemId);
    const explorer = await openExplorer(page);
    const drawing = explorer.locator('svg.schematic--horizontal');
    const nodes = drawing.locator('[data-node]');

    // Start from the last link before the architecture section, as a keyboard user arrives.
    await page.locator('#architecture').locator('xpath=preceding::a[1]').focus();
    await page.keyboard.press('Tab');
    const scroller = explorer.locator('.schematic-scroll');
    if ((await scroller.count()) > 0) {
      await expect(scroller).toBeFocused();
      await page.keyboard.press('Tab');
    }
    await expect(nodes.first()).toBeFocused();
    await expect(nodes.first()).toHaveAttribute('aria-label', /^1\. .+, .+$/);
    await expect(nodes.first()).toHaveAttribute('tabindex', '0');
    await expect(nodes.nth(1)).toHaveAttribute('tabindex', '-1');

    await page.keyboard.press('ArrowRight');
    await expect(nodes.nth(1)).toBeFocused();
    await expect(nodes.nth(1)).toHaveAttribute('tabindex', '0');
    await expect(nodes.first()).toHaveAttribute('tabindex', '-1');

    await page.keyboard.press('Enter');
    await expect(nodes.nth(1)).toHaveAttribute('aria-pressed', 'true');
    const second = must(system.nodes[1], 'the second node');
    const inspector = explorer.locator('aside.explorer__inspector');
    await expect(inspector).toContainText(second.purpose);
    const evidence = inspector.locator('.inspector__evidence a').first();
    await expect(evidence).toHaveAttribute(
      'href',
      new RegExp(
        `^https://github\\.com/${system.repository.owner}/${system.repository.name}/blob/${system.repository.pinnedCommit}/`,
      ),
    );

    await page.keyboard.press('Escape');
    await expect(nodes.nth(1)).toHaveAttribute('aria-pressed', 'false');
    await expect(inspector).toContainText('Select a node or an edge');
  });

  test('the parts list toggles the selection and fills the inspector', async ({
    page,
    request,
    isMobile,
  }) => {
    test.skip(isMobile, 'on a phone the inspector is a dialog; see the phone test');
    const { system } = await readSystemDocument(request, systemId);
    const explorer = await openExplorer(page);
    const third = must(system.nodes[2], 'the third node');
    const part = explorer.locator('.parts__item').nth(2);
    await expect(part).toContainText(third.label);
    await part.click();
    await expect(part).toHaveAttribute('aria-pressed', 'true');
    await expect(explorer.locator('aside.explorer__inspector')).toContainText(third.purpose);
    await expect(explorer.locator('svg.schematic--horizontal [data-node]').nth(2)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await part.click();
    await expect(part).toHaveAttribute('aria-pressed', 'false');
    await expect(explorer.locator('aside.explorer__inspector')).toContainText(
      'Select a node or an edge',
    );
  });

  test('on a phone selecting a node opens the inspector as a dialog', async ({
    page,
    request,
    isMobile,
  }) => {
    test.skip(!isMobile, 'the dialog sheet only opens on narrow screens');
    const { system } = await readSystemDocument(request, systemId);
    const explorer = await openExplorer(page);
    const first = must(system.nodes[0], 'the first node');
    const sheet = explorer.locator('dialog.explorer__sheet');
    await expect(explorer.locator('aside.explorer__inspector')).toBeHidden();
    await expect(sheet).toHaveJSProperty('open', false);

    await explorer.locator('svg.schematic--horizontal [data-node]').first().click();
    await expect(sheet).toHaveJSProperty('open', true);
    await expect(sheet).toContainText(first.purpose);
    await expect(sheet.locator('.inspector__evidence a').first()).toHaveAttribute(
      'href',
      /^https:\/\/github\.com\//,
    );

    await sheet.getByRole('button', { name: 'Close' }).click();
    await expect(sheet).toHaveJSProperty('open', false);
    await expect(explorer.locator('.parts__item').first()).toHaveAttribute('aria-pressed', 'false');
  });
});

test('without JavaScript the drawing and the parts list are still on the page', async ({
  page,
  javaScriptEnabled,
}) => {
  test.skip(javaScriptEnabled, 'this is the no-JavaScript projection');
  await page.goto(route);
  const explorer = page.locator('.explorer');
  await expect(explorer.locator('svg.schematic--horizontal')).toHaveCount(1);
  expect(await explorer.locator('.parts__item').count()).toBeGreaterThan(2);
});
