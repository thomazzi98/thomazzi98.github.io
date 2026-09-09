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
        { id: 'pending', terminal: false },
        { id: 'recorded', terminal: false, funded: true },
        { id: 'voided', terminal: true, note: 'A voided entry stays voided.' },
      ],
      transitions: [
        { from: 'pending', to: 'recorded', trigger: 'INSERTED' },
        { from: 'pending', to: 'voided', trigger: 'REJECTED', guard: 'the ledger refused it' },
        { from: 'recorded', to: 'voided', trigger: 'REVERSED' },
      ],
      evidence: [{ path: 'src/entry.ts' }],
    },
  ],
}).stateMachines[0];

afterEach(cleanup);

describe('StateMachineExplorer', () => {
  it('renders the whole transition table before any interaction', () => {
    if (machine === undefined) {
      throw new Error('fixture machine missing');
    }
    render(<StateMachineExplorer machine={machine} />);
    expect(screen.getAllByRole('row')).toHaveLength(4);
    expect(
      screen.getByText('Select a status to see where it can go and what brings it there.'),
    ).toBeTruthy();
  });

  it('marks the ways out of and into a selected status and describes it', () => {
    if (machine === undefined) {
      throw new Error('fixture machine missing');
    }
    render(<StateMachineExplorer machine={machine} />);
    const pending = screen.getByRole('button', { name: 'pending' });
    fireEvent.click(pending);
    expect(pending.getAttribute('aria-pressed')).toBe('true');
    const relations = screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => row.getAttribute('data-relation'));
    expect(relations).toEqual(['out', 'out', 'other']);
    expect(screen.getByText(/2 ways out · 0 ways in/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'voided' }));
    expect(screen.getByText(/0 ways out · 2 ways in · terminal/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'voided' }));
    expect(screen.getByRole('button', { name: 'voided' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
  });
});
