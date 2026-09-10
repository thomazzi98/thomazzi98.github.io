import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, describe, expect, it } from 'vitest';
import { StateMachineExplorer } from '../../src/islands/state/StateMachineExplorer';
import { defineSystem } from '../../src/systems/validate';
import { fixtureSystem } from '../unit/systems/fixture';

const machine = defineSystem({
  ...fixtureSystem,
  stateMachines: [
    {
      id: 'entry',
      name: 'Entry lifecycle',
      statuses: [
        { id: 'pending', terminal: false, tone: 'wait' },
        { id: 'unresolved', terminal: false, tone: 'unknown' },
        { id: 'recorded', terminal: false, tone: 'ok', funded: true },
        { id: 'voided', terminal: true, tone: 'fault', note: 'A voided entry stays voided.' },
      ],
      transitions: [
        { from: 'pending', to: 'recorded', trigger: 'INSERTED' },
        { from: 'pending', to: 'unresolved', trigger: 'TIMED_OUT' },
        { from: 'pending', to: 'voided', trigger: 'REJECTED', guard: 'the ledger refused it' },
        { from: 'unresolved', to: 'recorded', trigger: 'READ_BACK' },
        { from: 'recorded', to: 'voided', trigger: 'REVERSED' },
      ],
      evidence: [{ path: 'src/entry.ts' }],
    },
  ],
}).stateMachines[0];

const requireMachine = () => {
  if (machine === undefined) {
    throw new Error('fixture machine missing');
  }
  return machine;
};

const relationsOfRows = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => row.getAttribute('data-relation'));

afterEach(cleanup);

describe('StateMachineExplorer', () => {
  it('renders the whole transition table before any interaction', () => {
    render(<StateMachineExplorer machine={requireMachine()} />);
    expect(screen.getAllByRole('row')).toHaveLength(6);
    expect(
      screen.getByText('Select a status to see where it can go and what brings it there.'),
    ).toBeTruthy();
    expect(screen.queryByText(/leaves it/)).toBeNull();
  });

  it('colours every status badge with the tone the model states', () => {
    render(<StateMachineExplorer machine={requireMachine()} />);
    const tones = ['pending', 'unresolved', 'recorded', 'voided'].map((id) =>
      screen.getByRole('button', { name: id }).getAttribute('data-tone'),
    );
    expect(tones).toEqual(['wait', 'unknown', 'ok', 'fault']);
  });

  it('marks the ways out of and into a selected status in its own tone', () => {
    render(<StateMachineExplorer machine={requireMachine()} />);
    fireEvent.click(screen.getByRole('button', { name: 'pending' }));
    expect(screen.getByRole('button', { name: 'pending' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(relationsOfRows()).toEqual(['out', 'out', 'out', 'other', 'other']);
    const rowTones = screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => row.getAttribute('data-tone'));
    expect(new Set(rowTones)).toEqual(new Set(['wait']));
    expect(
      screen.getByText(/From marked: leaves it/).parentElement?.getAttribute('data-tone'),
    ).toBe('wait');
    fireEvent.click(screen.getByRole('button', { name: 'unresolved' }));
    expect(relationsOfRows()).toEqual(['other', 'in', 'other', 'out', 'other']);
    expect(screen.getByText(/To marked: enters it/).parentElement?.getAttribute('data-tone')).toBe(
      'unknown',
    );
  });

  it('reads the transitions out loud by name in a polite live region', () => {
    render(<StateMachineExplorer machine={requireMachine()} />);
    const reading = screen.getByText(/Select a status/).parentElement;
    expect(reading?.getAttribute('aria-live')).toBe('polite');
    fireEvent.click(screen.getByRole('button', { name: 'pending' }));
    expect(reading?.textContent).toBe(
      'pending · leaves to recorded, unresolved, voided · enters from nothing',
    );
    fireEvent.click(screen.getByRole('button', { name: 'voided' }));
    expect(reading?.textContent).toBe(
      'voided · leaves to nothing · enters from pending, recorded · terminal: nothing further can happen · A voided entry stays voided.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'voided' }));
    expect(screen.getByRole('button', { name: 'voided' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
    expect(screen.queryByText(/leaves it/)).toBeNull();
  });

  it('exposes the transition table as a named scrolling region', () => {
    render(<StateMachineExplorer machine={requireMachine()} />);
    const region = screen.getByRole('region', { name: /Transitions of Entry lifecycle/ });
    expect(region.getAttribute('tabindex')).toBe('0');
  });
});
