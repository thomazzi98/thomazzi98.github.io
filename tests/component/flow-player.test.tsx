import { act, cleanup, fireEvent, render, within } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FlowPlayer } from '../../src/islands/player/FlowPlayer';
import { Ledger, type LedgerLine } from '../../src/islands/player/Ledger';
import { defineSystem } from '../../src/systems/validate';
import { fixtureSystem } from '../unit/systems/fixture';

const system = defineSystem({
  ...fixtureSystem,
  flows: [
    ...fixtureSystem.flows,
    {
      id: 'read-entry',
      name: 'Read an entry',
      kind: 'request',
      summary: 'The entry is read back.',
      steps: [
        { at: 0, ledger: 'read.received', tone: 'flight', edge: 'client-api' },
        { at: 400, ledger: 'read.answered 200', tone: 'ok', node: 'api' },
      ],
    },
    {
      id: 'list-entries',
      name: 'List the entries',
      kind: 'request',
      summary: 'Every entry is read back.',
      steps: [
        { at: 0, ledger: 'list.received', tone: 'flight', edge: 'client-api' },
        { at: 300, ledger: 'list.answered 200', tone: 'ok', node: 'api' },
      ],
    },
  ],
});

const flowsNamed = (...ids: string[]) =>
  ids.map((id) => {
    const flow = system.flows.find((candidate) => candidate.id === id);
    if (flow === undefined) {
      throw new Error(`the test system has no flow ${id}`);
    }
    return flow;
  });

const nodes = system.nodes.map(({ id, label, kind }) => ({ id, label, kind }));
const edges = system.edges.map(({ id, from, to, label, protocol }) => ({
  id,
  from,
  to,
  label,
  protocol,
}));

type IntersectionCallback = (entries: { isIntersecting: boolean }[]) => void;
const intersectionCallbacks: IntersectionCallback[] = [];

const stubMotion = (reduced: boolean) => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: reduced && query.includes('reduce'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
};

const stubIntersection = () => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IntersectionCallback) {
        intersectionCallbacks.push(callback);
      }
      observe() {
        return undefined;
      }
      disconnect() {
        return undefined;
      }
    },
  );
};

const stageFlows = flowsNamed('record-entry', 'read-entry');

const renderPlayer = (overrides: { stageId?: string; autoplay?: boolean } = {}) =>
  render(
    <FlowPlayer
      stageId={overrides.stageId ?? 'ledger-request'}
      systemId={system.id}
      systemName={system.shortName}
      nodes={nodes}
      edges={edges}
      flows={stageFlows}
      autoplay={overrides.autoplay ?? false}
    />,
  );

const playerIn = (container: Element, index = 0): HTMLElement => {
  const player = container.querySelectorAll<HTMLElement>('.player')[index];
  if (player === undefined) {
    throw new Error(`player ${String(index)} was not rendered`);
  }
  return player;
};

const clockOf = (player: HTMLElement) => player.querySelector('.player__clock')?.textContent;
const announcementOf = (player: HTMLElement) =>
  player.querySelector('[aria-live="polite"]')?.textContent;
const ledgerMessagesOf = (player: HTMLElement) =>
  [...player.querySelectorAll('.ledger__message')].map((line) => line.textContent);

const setHidden = (hidden: boolean) => {
  Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
  fireEvent(document, new Event('visibilitychange'));
};

const passFrames = (milliseconds: number) => {
  void act(() => {
    vi.advanceTimersByTime(milliseconds);
  });
};

const changeHash = (hash: string) => {
  void act(() => {
    window.location.hash = hash;
    fireEvent(window, new Event('hashchange'));
  });
};

// jsdom lays nothing out, so the ledger box is given a fixed window over lines of a known height.
const lineHeight = 24;
const windowHeight = 96;
const giveGeometry = (box: HTMLElement) => {
  let scrollTop = 0;
  const scrollHeight = () =>
    Math.max(windowHeight, box.querySelectorAll('.ledger__line').length * lineHeight);
  Object.defineProperty(box, 'clientHeight', { configurable: true, value: windowHeight });
  Object.defineProperty(box, 'scrollHeight', { configurable: true, get: scrollHeight });
  // A browser clamps the offset to what the content allows, and so must the stand-in.
  Object.defineProperty(box, 'scrollTop', {
    configurable: true,
    get: () => Math.min(scrollTop, scrollHeight() - windowHeight),
    set: (value: number) => {
      scrollTop = Math.max(0, Math.min(value, scrollHeight() - windowHeight));
    },
  });
};

const linesUpTo = (count: number): LedgerLine[] =>
  [...Array(count).keys()].map((index) => ({
    key: String(index),
    at: index * 100,
    tone: 'neutral',
    station: 'api',
    message: `line ${String(index)}`,
  }));

const scrollIntoView = vi.fn();

beforeEach(() => {
  stubMotion(false);
  // jsdom has no scrollIntoView; the player calls it on its root when a hash names a flow.
  Element.prototype.scrollIntoView = scrollIntoView;
  scrollIntoView.mockClear();
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  intersectionCallbacks.length = 0;
  window.location.hash = '';
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});

describe('FlowPlayer', () => {
  it('keeps two players on one page apart: their own radio groups and their own drawing ids', () => {
    const { container } = render(
      <>
        <FlowPlayer
          stageId="ledger-request"
          systemId={system.id}
          systemName={system.shortName}
          nodes={nodes}
          edges={edges}
          flows={flowsNamed('record-entry', 'list-entries')}
        />
        <FlowPlayer
          stageId="ledger-failure"
          systemId={system.id}
          systemName={system.shortName}
          nodes={nodes}
          edges={edges}
          flows={flowsNamed('list-entries', 'read-entry')}
        />
      </>,
    );
    const first = playerIn(container, 0);
    const second = playerIn(container, 1);
    const namesIn = (player: HTMLElement) =>
      new Set(
        [...player.querySelectorAll('input[type="radio"]')].map((radio) =>
          radio.getAttribute('name'),
        ),
      );
    expect([...namesIn(first)].some((name) => namesIn(second).has(name))).toBe(false);
    const ids = [...container.querySelectorAll('[id]')].map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);

    fireEvent.click(within(second).getByRole('radio', { name: 'Read an entry' }));
    expect(second.dataset.flow).toBe('read-entry');
    expect(second.id).toBe('flow-read-entry');
    expect(first.dataset.flow).toBe('record-entry');
    expect(first.id).toBe('flow-record-entry');
    expect(first.querySelector<HTMLInputElement>('input[value="record-entry"]')?.checked).toBe(
      true,
    );
  });

  it('shows the clock as a timer that is not a live region', () => {
    const { container } = renderPlayer();
    const player = playerIn(container);
    const clock = within(player).getByRole('timer', { name: 'Virtual clock' });
    expect(clock.getAttribute('aria-live')).toBe('off');
    expect(clock.textContent).toBe('T+00:00.000');
    expect(player.querySelector('output')).toBeNull();
    expect(player.querySelectorAll('[aria-live="polite"]')).toHaveLength(1);
  });

  it('tells assistive technology the clock the scrubber points at', () => {
    const { container } = renderPlayer();
    const player = playerIn(container);
    const scrubber = within(player).getByRole('slider', { name: 'Scrub the virtual clock' });
    expect(scrubber.getAttribute('max')).toBe('1800');
    expect(scrubber.getAttribute('aria-valuetext')).toBe('T+00:00.000');
    fireEvent.input(scrubber, { target: { value: '600' } });
    expect(scrubber.getAttribute('aria-valuetext')).toBe('T+00:00.600');
    expect(clockOf(player)).toBe('T+00:00.600');
    expect(player.dataset.running).toBe('false');
    expect(ledgerMessagesOf(player)).toEqual(['entry.received', 'entry.inserted']);
  });

  it('keeps Step focusable when the last event has been stepped and says the replay finished', () => {
    const { container } = renderPlayer();
    const player = playerIn(container);
    const step = within(player).getByRole('button', { name: 'Step' });
    step.focus();
    fireEvent.click(step);
    expect(announcementOf(player)).toBe('entry.received');
    expect(step.getAttribute('aria-disabled')).toBeNull();
    expect(clockOf(player)).toBe('T+00:00.000');
    fireEvent.click(step);
    expect(clockOf(player)).toBe('T+00:00.600');
    fireEvent.click(step);
    expect(step.getAttribute('aria-disabled')).toBe('true');
    expect(step.hasAttribute('disabled')).toBe(false);
    expect(document.activeElement).toBe(step);
    expect(announcementOf(player)).toBe('entry.answered 201 Record an entry finished.');
    fireEvent.click(step);
    expect(ledgerMessagesOf(player)).toHaveLength(3);
    expect(within(player).getByRole('button', { name: 'Replay' })).toBeTruthy();
  });

  it('runs the clock on to the end when the last event is stepped, where the scrubber and Replay point', () => {
    const { container } = renderPlayer();
    const player = playerIn(container);
    const step = within(player).getByRole('button', { name: 'Step' });
    const scrubber = within(player).getByRole<HTMLInputElement>('slider', {
      name: 'Scrub the virtual clock',
    });
    fireEvent.click(step);
    fireEvent.click(step);
    fireEvent.click(step);
    expect(clockOf(player)).toBe('T+00:01.800');
    expect(scrubber.getAttribute('max')).toBe('1800');
    expect(scrubber.value).toBe('1800');
    expect(scrubber.getAttribute('aria-valuetext')).toBe('T+00:01.800');
    expect(player.querySelectorAll('.schematic__packet')).toHaveLength(0);
    fireEvent.click(within(player).getByRole('button', { name: 'Replay' }));
    expect(player.dataset.running).toBe('true');
    expect(clockOf(player)).toBe('T+00:00.000');
  });

  it('announces a lever change, prints it as the first ledger line and replays at once', () => {
    const { container } = renderPlayer();
    const player = playerIn(container);
    fireEvent.click(within(player).getByRole('radio', { name: 'Down' }));
    expect(announcementOf(player)).toBe('Database: Down. Replaying.');
    expect(ledgerMessagesOf(player)[0]).toBe('Database: Down. Replaying.');
    expect(player.querySelector('.ledger__line--note .ledger__station')?.textContent).toBe('lever');
    expect(player.dataset.running).toBe('true');
    passFrames(700);
    expect(ledgerMessagesOf(player)).toEqual([
      'Database: Down. Replaying.',
      'entry.received',
      'insert.failed',
    ]);
    fireEvent.click(within(player).getByRole('button', { name: 'Reset' }));
    expect(player.querySelector('.ledger__line--note')).toBeNull();
    expect(within(player).getByText('Nothing has happened yet.')).toBeTruthy();
  });

  it('under reduced motion a lever change resets and waits instead of replaying', () => {
    stubMotion(true);
    const { container } = renderPlayer({ autoplay: true });
    const player = playerIn(container);
    expect(player.dataset.running).toBe('false');
    fireEvent.click(within(player).getByRole('radio', { name: 'Down' }));
    expect(announcementOf(player)).toBe('Database: Down. Reset; press Play or Step.');
    expect(player.dataset.running).toBe('false');
    expect(clockOf(player)).toBe('T+00:00.000');
  });

  it('selects the flow named in the hash at mount, scrolls to itself and follows later hash changes', () => {
    window.location.hash = '#flow-read-entry';
    const { container } = renderPlayer();
    const player = playerIn(container);
    expect(player.dataset.flow).toBe('read-entry');
    expect(player.id).toBe('flow-read-entry');
    expect(announcementOf(player)).toBe('Flow: Read an entry. Replaying.');
    expect(player.dataset.running).toBe('true');
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.instances[0]).toBe(player);
    changeHash('#flow-record-entry');
    expect(player.dataset.flow).toBe('record-entry');
    expect(player.id).toBe('flow-record-entry');
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it('restarts the replay when the hash names the flow already showing', () => {
    const { container } = renderPlayer();
    const player = playerIn(container);
    const step = within(player).getByRole('button', { name: 'Step' });
    fireEvent.click(step);
    fireEvent.click(step);
    expect(clockOf(player)).toBe('T+00:00.600');
    changeHash('#flow-record-entry');
    expect(player.dataset.flow).toBe('record-entry');
    expect(player.dataset.running).toBe('true');
    expect(clockOf(player)).toBe('T+00:00.000');
    expect(ledgerMessagesOf(player)).toEqual(['Flow: Record an entry. Replaying.']);
    expect(announcementOf(player)).toBe('Flow: Record an entry. Replaying.');
    expect(scrollIntoView.mock.instances[0]).toBe(player);
    passFrames(700);
    expect(ledgerMessagesOf(player)).toEqual([
      'Flow: Record an entry. Replaying.',
      'entry.received',
      'entry.inserted',
    ]);
  });

  it('under reduced motion a hash landing resets, scrolls and waits instead of replaying', () => {
    stubMotion(true);
    const { container } = renderPlayer();
    const player = playerIn(container);
    fireEvent.click(within(player).getByRole('button', { name: 'Step' }));
    changeHash('#flow-record-entry');
    expect(player.dataset.running).toBe('false');
    expect(clockOf(player)).toBe('T+00:00.000');
    expect(announcementOf(player)).toBe('Flow: Record an entry. Reset; press Play or Step.');
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('ignores a hash that names no flow of its own', () => {
    const { container } = renderPlayer();
    const player = playerIn(container);
    changeHash('#flow-list-entries');
    expect(player.dataset.flow).toBe('record-entry');
    changeHash('#flows');
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('renders no text in the live region while nothing is announced, so frames mutate nothing', () => {
    const { container } = renderPlayer({ autoplay: true });
    const player = playerIn(container);
    const region = player.querySelector('[aria-live="polite"]');
    if (region === null) {
      throw new Error('the player has no live region');
    }
    expect(region.childNodes).toHaveLength(0);
    const mutations: MutationRecord[] = [];
    const observer = new MutationObserver((records) => {
      mutations.push(...records);
    });
    observer.observe(region, { childList: true, characterData: true, subtree: true });
    passFrames(1000);
    expect(clockOf(player)).not.toBe('T+00:00.000');
    expect(observer.takeRecords()).toHaveLength(0);
    expect(mutations).toHaveLength(0);
    passFrames(2000);
    observer.disconnect();
    expect(region.textContent).toMatch(/^Record an entry finished at T\+00:01\.8\d\d\.$/);
  });

  it('renders the reduced-motion note and the Play button in the markup whatever the preference', () => {
    const { container } = renderPlayer();
    const player = playerIn(container);
    expect(player.querySelector('.player__note')?.textContent).toContain('scrubber');
    expect(within(player).getByRole('button', { name: 'Play' })).toBeTruthy();
    cleanup();

    stubMotion(true);
    const reduced = playerIn(renderPlayer({ autoplay: true }).container);
    expect(reduced.querySelector('.player__note')?.textContent).toContain('scrubber');
    expect(reduced.dataset.running).toBe('false');
    const play = within(reduced).getByRole('button', { name: 'Play' });
    expect(play.hasAttribute('aria-pressed')).toBe(false);
    fireEvent.click(play);
    expect(reduced.dataset.running).toBe('true');
    expect(within(reduced).getByRole('button', { name: 'Pause' })).toBeTruthy();
  });

  it('runs on a frame loop, pauses while the tab is hidden and resumes when it shows again', () => {
    const { container } = renderPlayer({ autoplay: true });
    const player = playerIn(container);
    expect(player.dataset.running).toBe('true');
    passFrames(100);
    const beforeHiding = clockOf(player);
    expect(beforeHiding).not.toBe('T+00:00.000');

    void act(() => {
      setHidden(true);
    });
    passFrames(300);
    expect(clockOf(player)).toBe(beforeHiding);
    expect(player.dataset.running).toBe('true');

    void act(() => {
      setHidden(false);
    });
    passFrames(100);
    expect(clockOf(player)).not.toBe(beforeHiding);

    passFrames(3000);
    expect(player.dataset.running).toBe('false');
    expect(announcementOf(player)).toMatch(/^Record an entry finished at T\+00:01\.8\d\d\.$/);
    expect(ledgerMessagesOf(player)).toHaveLength(3);
    const settled = clockOf(player);
    passFrames(500);
    expect(clockOf(player)).toBe(settled);
  });

  it('pauses while the stage is out of view and resumes when it returns', () => {
    stubIntersection();
    const { container } = renderPlayer({ autoplay: true });
    const player = playerIn(container);
    const observed = intersectionCallbacks[0];
    if (observed === undefined) {
      throw new Error('the player did not observe its stage');
    }
    passFrames(100);
    const beforeLeaving = clockOf(player);
    void act(() => {
      observed([{ isIntersecting: false }]);
    });
    passFrames(300);
    expect(clockOf(player)).toBe(beforeLeaving);
    void act(() => {
      observed([{ isIntersecting: true }]);
    });
    passFrames(100);
    expect(clockOf(player)).not.toBe(beforeLeaving);
  });

  it('reserves the status row from the start and fills it with the tone of the step that set it', () => {
    const { container } = renderPlayer();
    const player = playerIn(container);
    const status = player.querySelector('.player__status dd');
    expect(status?.textContent).toBe('not yet set');
    expect(status?.getAttribute('data-tone')).toBe('neutral');
    const step = within(player).getByRole('button', { name: 'Step' });
    fireEvent.click(step);
    fireEvent.click(step);
    expect(status?.textContent).toBe('recorded');
    expect(status?.getAttribute('data-tone')).toBe('ok');
  });
});

describe('Ledger', () => {
  const ledgerWith = (lines: readonly LedgerLine[]) => (
    <Ledger title="Ledger" name="Test ledger" lines={lines} total={40} />
  );

  const boxOf = (container: Element): HTMLElement => {
    const box = container.querySelector<HTMLElement>('.ledger__scroll');
    if (box === null) {
      throw new Error('the ledger has no scroll box');
    }
    return box;
  };

  it('follows new lines while the reader is at the bottom and stops once they scroll up', () => {
    const { container, rerender } = render(ledgerWith(linesUpTo(2)));
    const box = boxOf(container);
    giveGeometry(box);
    rerender(ledgerWith(linesUpTo(8)));
    expect(box.scrollTop).toBe(8 * lineHeight - windowHeight);
    box.scrollTop = 0;
    rerender(ledgerWith(linesUpTo(12)));
    expect(box.scrollTop).toBe(0);
    box.scrollTop = 12 * lineHeight - windowHeight;
    rerender(ledgerWith(linesUpTo(14)));
    expect(box.scrollTop).toBe(14 * lineHeight - windowHeight);
  });

  it('follows again after a reset, even when a burst of lines lands in the next commit', () => {
    const { container, rerender } = render(ledgerWith(linesUpTo(20)));
    const box = boxOf(container);
    giveGeometry(box);
    box.scrollTop = 0;
    rerender(ledgerWith([]));
    expect(box.scrollTop).toBe(0);
    rerender(ledgerWith(linesUpTo(40)));
    expect(box.scrollTop).toBe(40 * lineHeight - windowHeight);
  });
});
