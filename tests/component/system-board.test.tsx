import { act, cleanup, fireEvent, render, within } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SystemBoard, type BoardPanel } from '../../src/islands/board/SystemBoard';
import { defineSystem } from '../../src/systems/validate';
import { firstOf, fixtureSystem } from '../unit/systems/fixture';

const system = defineSystem(fixtureSystem);
const flow = firstOf(system.flows);

const panelFor = (systemId: string, shortName: string): BoardPanel => ({
  systemId,
  name: `${shortName} system`,
  shortName,
  href: `/systems/${systemId}/`,
  maturity: 'complete',
  maturityTone: 'ok',
  nodes: system.nodes.map(({ id, label, kind }) => ({ id, label, kind })),
  edges: system.edges.map(({ id, from, to, label, protocol }) => ({
    id,
    from,
    to,
    label,
    protocol,
  })),
  flow,
});

const panels = [panelFor('alpha', 'Alpha'), panelFor('beta', 'Beta')];

const stubMedia = ({ reduced = false, stacked = false } = {}) => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: (reduced && query.includes('reduce')) || (stacked && query.startsWith('not all')),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
};

const boardIn = (container: Element): HTMLElement => {
  const board = container.querySelector<HTMLElement>('.board');
  if (board === null) {
    throw new Error('the board was not rendered');
  }
  return board;
};

const passFrames = (milliseconds: number) => {
  void act(() => {
    vi.advanceTimersByTime(milliseconds);
  });
};

beforeEach(() => {
  stubMedia();
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('SystemBoard', () => {
  it('ends the scrubber where the default-lever run ends and names the clock it points at', () => {
    const board = boardIn(render(<SystemBoard panels={panels} />).container);
    const scrubber = within(board).getByRole('slider', { name: 'Scrub the virtual clock' });
    // The last default-lever step is at 1200 and the clock runs 800 past it.
    expect(scrubber.getAttribute('max')).toBe('2000');
    expect(scrubber.getAttribute('aria-valuetext')).toBe('T+00:00.000');
    fireEvent.input(scrubber, { target: { value: '2000' } });
    expect(scrubber.getAttribute('aria-valuetext')).toBe('T+00:02.000');
    expect(board.dataset.running).toBe('false');
    expect(within(board).getByRole('button', { name: 'Replay' })).toBeTruthy();
    expect(board.querySelectorAll('.board__flow')[0]?.textContent).toContain('3 of 3');
  });

  it('shows the clock as a timer that is not a live region', () => {
    const board = boardIn(render(<SystemBoard panels={panels} />).container);
    const clock = within(board).getByRole('timer', { name: 'Virtual clock' });
    expect(clock.getAttribute('aria-live')).toBe('off');
    expect(board.querySelector('output')).toBeNull();
    expect(board.querySelectorAll('[aria-live="polite"]')).toHaveLength(1);
  });

  it('plays on mount, carries its state in the Play label rather than aria-pressed, and finishes', () => {
    const board = boardIn(render(<SystemBoard panels={panels} />).container);
    expect(board.dataset.running).toBe('true');
    const pause = within(board).getByRole('button', { name: 'Pause' });
    expect(pause.hasAttribute('aria-pressed')).toBe(false);
    fireEvent.click(pause);
    expect(board.dataset.running).toBe('false');
    expect(within(board).getByRole('button', { name: 'Play' })).toBeTruthy();
    fireEvent.click(within(board).getByRole('button', { name: 'Play' }));
    passFrames(2500);
    expect(board.dataset.running).toBe('false');
    expect(board.querySelector('[aria-live="polite"]')?.textContent).toMatch(
      /^Every replay finished at T\+00:02\.0\d\d\.$/,
    );
  });

  it('runs the clock on to the end when the last event is stepped, where the scrubber and Replay point', () => {
    const board = boardIn(render(<SystemBoard panels={panels} />).container);
    fireEvent.click(within(board).getByRole('button', { name: 'Pause' }));
    const step = within(board).getByRole('button', { name: 'Step' });
    fireEvent.click(step);
    fireEvent.click(step);
    fireEvent.click(step);
    expect(board.querySelector('.board__clock')?.textContent).toBe('T+00:02.000');
    const scrubber = within(board).getByRole<HTMLInputElement>('slider', {
      name: 'Scrub the virtual clock',
    });
    expect(scrubber.value).toBe('2000');
    expect(scrubber.getAttribute('aria-valuetext')).toBe('T+00:02.000');
    expect(within(board).getByRole('button', { name: 'Replay' })).toBeTruthy();
    expect(step.getAttribute('aria-disabled')).toBe('true');
  });

  it('prints the ledger under the rail and above the panels, with the no-script line between', () => {
    const board = boardIn(render(<SystemBoard panels={panels} />).container);
    const children = [...board.children].map((child) => child.className || child.tagName);
    expect(children.indexOf('board__rail')).toBeLessThan(children.indexOf('NOSCRIPT'));
    expect(children.indexOf('NOSCRIPT')).toBeLessThan(children.indexOf('board__ledger'));
    expect(children.indexOf('board__ledger')).toBeLessThan(children.indexOf('board__panels'));
    expect(board.querySelector('noscript .board__noscript')?.textContent).toBe(
      'Without JavaScript the replays do not run; each system page carries the transcripts.',
    );
  });

  it('names the system in every Enter link and keeps the live region empty between announcements', () => {
    const board = boardIn(render(<SystemBoard panels={panels} />).container);
    expect(within(board).getByRole('link', { name: 'Enter the system Alpha system' })).toBeTruthy();
    expect(within(board).getByRole('link', { name: 'Enter the system Beta system' })).toBeTruthy();
    const region = board.querySelector('[aria-live="polite"]');
    if (region === null) {
      throw new Error('the board has no live region');
    }
    expect(region.childNodes).toHaveLength(0);
    const observer = new MutationObserver(() => undefined);
    observer.observe(region, { childList: true, characterData: true, subtree: true });
    passFrames(500);
    expect(board.querySelector('.board__clock')?.textContent).not.toBe('T+00:00.000');
    expect(observer.takeRecords()).toHaveLength(0);
    observer.disconnect();
  });

  it('keeps every ledger line, interleaved by clock and system, and counts them honestly', () => {
    const board = boardIn(render(<SystemBoard panels={panels} />).container);
    const step = within(board).getByRole('button', { name: 'Step' });
    step.focus();
    fireEvent.click(step);
    expect(board.querySelector('[aria-live="polite"]')?.textContent).toBe(
      'Alpha: entry.received. Beta: entry.received',
    );
    fireEvent.click(step);
    fireEvent.click(step);
    const lines = [...board.querySelectorAll('.ledger__line')].map((line) => [
      line.querySelector('.ledger__time')?.textContent,
      line.querySelector('.ledger__station')?.textContent,
      line.querySelector('.ledger__message')?.textContent,
    ]);
    expect(lines).toEqual([
      ['T+00:00.000', 'Alpha', 'entry.received'],
      ['T+00:00.000', 'Beta', 'entry.received'],
      ['T+00:00.600', 'Alpha', 'entry.inserted'],
      ['T+00:00.600', 'Beta', 'entry.inserted'],
      ['T+00:01.200', 'Alpha', 'entry.answered 201'],
      ['T+00:01.200', 'Beta', 'entry.answered 201'],
    ]);
    expect(board.querySelector('.ledger__head')?.textContent).toContain('6 of 6 lines');
    expect(step.getAttribute('aria-disabled')).toBe('true');
    expect(document.activeElement).toBe(step);
  });

  it('draws every panel as a rail at its natural size, spread over the longest footprint', () => {
    const longer: BoardPanel = {
      ...panelFor('gamma', 'Gamma'),
      nodes: [
        ...(panels[0]?.nodes ?? []),
        { id: 'worker', label: 'Worker', kind: 'process' },
        { id: 'queue', label: 'Queue', kind: 'queue' },
      ],
    };
    const board = boardIn(render(<SystemBoard panels={[...panels, longer]} />).container);
    const drawings = [...board.querySelectorAll<SVGSVGElement>('.board__panel svg.schematic')];
    expect(drawings).toHaveLength(3);
    const heights = new Set<string>();
    for (const svg of drawings) {
      expect(svg.classList.contains('schematic--rail')).toBe(true);
      const width = Number(svg.getAttribute('width'));
      const height = svg.getAttribute('height') ?? '';
      expect(width).toBeLessThanOrEqual(300);
      expect(svg.getAttribute('viewBox')).toBe(`0 0 ${String(width)} ${height}`);
      heights.add(height);
      // Every callout balloon sits at its part's corner, so one column means one balloon x.
      const columns = new Set(
        [...svg.querySelectorAll('.schematic__balloon')].map(
          (balloon) => /translate\((\S+) /.exec(balloon.getAttribute('transform') ?? '')?.[1],
        ),
      );
      expect(columns.size).toBe(1);
    }
    // Three parts spread over five rows end at the height of five parts at the natural pitch.
    expect(heights.size).toBe(1);
    cleanup();
    stubMedia({ stacked: true });
    const stackedBoard = boardIn(render(<SystemBoard panels={[...panels, longer]} />).container);
    const stackedHeights = [...stackedBoard.querySelectorAll('.board__panel svg.schematic')].map(
      (svg) => Number(svg.getAttribute('height')),
    );
    // Stacked, a three-part rail keeps its natural pitch and ends shorter than a five-part one.
    expect(stackedHeights[0]).toBeLessThan(stackedHeights[2] ?? 0);
    expect(stackedHeights[0]).toBe(stackedHeights[1]);
  });

  it('does not play on its own under reduced motion but keeps Play and the note', () => {
    stubMedia({ reduced: true });
    const board = boardIn(render(<SystemBoard panels={panels} />).container);
    expect(board.dataset.running).toBe('false');
    expect(board.querySelector('.board__clock')?.textContent).toBe('T+00:00.000');
    expect(board.querySelector('.board__note')?.textContent).toContain('scrubber');
    fireEvent.click(within(board).getByRole('button', { name: 'Play' }));
    expect(board.dataset.running).toBe('true');
  });
});
