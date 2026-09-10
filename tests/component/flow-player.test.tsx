import { act, cleanup, fireEvent, render, within } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FlowPlayer } from '../../src/islands/player/FlowPlayer';
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
  ],
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

const renderPlayer = (overrides: { stageId?: string; autoplay?: boolean } = {}) =>
  render(
    <FlowPlayer
      stageId={overrides.stageId ?? 'ledger-request'}
      systemId={system.id}
      systemName={system.shortName}
      nodes={nodes}
      edges={edges}
      flows={system.flows}
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

beforeEach(() => {
  stubMotion(false);
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
          flows={system.flows}
        />
        <FlowPlayer
          stageId="ledger-failure"
          systemId={system.id}
          systemName={system.shortName}
          nodes={nodes}
          edges={edges}
          flows={system.flows}
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
    expect(first.dataset.flow).toBe('record-entry');
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
    fireEvent.click(step);
    fireEvent.click(step);
    expect(step.getAttribute('aria-disabled')).toBe('true');
    expect(step.hasAttribute('disabled')).toBe(false);
    expect(document.activeElement).toBe(step);
    expect(announcementOf(player)).toBe('entry.answered 201 Record an entry finished.');
    fireEvent.click(step);
    expect(ledgerMessagesOf(player)).toHaveLength(3);
    expect(within(player).getByRole('button', { name: 'Replay' })).toBeTruthy();
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

  it('selects the flow named in the hash at mount and follows later hash changes', () => {
    window.location.hash = '#flow-read-entry';
    const { container } = renderPlayer();
    const player = playerIn(container);
    expect(player.dataset.flow).toBe('read-entry');
    expect(announcementOf(player)).toBe('Flow: Read an entry. Replaying.');
    void act(() => {
      window.location.hash = '#flow-record-entry';
      fireEvent(window, new Event('hashchange'));
    });
    expect(player.dataset.flow).toBe('record-entry');
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
