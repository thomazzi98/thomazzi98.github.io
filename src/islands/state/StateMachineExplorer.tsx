import { useSignal } from '@preact/signals';
import type { StateMachine, Status, Transition } from '../../systems/schema';

export interface StateMachineExplorerProps {
  readonly machine: StateMachine;
}

type Relation = 'out' | 'in' | 'other';

const describe = (status: Status): string => {
  const parts: string[] = [];
  if (status.terminal) {
    parts.push('terminal: nothing further can happen');
  }
  if (status.funded === true) {
    parts.push('funded: the money is known to be held');
  }
  if (status.note !== undefined) {
    parts.push(status.note);
  }
  return parts.join(' · ');
};

const names = (transitions: readonly Transition[], side: 'from' | 'to'): string =>
  [...new Set(transitions.map((transition) => transition[side]))].join(', ');

const Reading = ({
  current,
  outgoing,
  incoming,
}: {
  readonly current: Status;
  readonly outgoing: readonly Transition[];
  readonly incoming: readonly Transition[];
}) => {
  const detail = describe(current);
  const leaves = outgoing.length === 0 ? 'leaves to nothing' : `leaves to ${names(outgoing, 'to')}`;
  const enters =
    incoming.length === 0 ? 'enters from nothing' : `enters from ${names(incoming, 'from')}`;
  return (
    <>
      <strong class="mono">{current.id}</strong>
      <span class="muted">
        {' '}
        · {leaves} · {enters}
        {detail === '' ? '' : ` · ${detail}`}
      </span>
    </>
  );
};

export const StateMachineExplorer = ({ machine }: StateMachineExplorerProps) => {
  const selected = useSignal<string | undefined>(undefined);
  const current = machine.statuses.find((status) => status.id === selected.value);
  const relationOf = (origin: string, destination: string): Relation => {
    if (selected.value === undefined) {
      return 'other';
    }
    if (origin === selected.value) {
      return 'out';
    }
    return destination === selected.value ? 'in' : 'other';
  };
  const outgoing = machine.transitions.filter((transition) => transition.from === selected.value);
  const incoming = machine.transitions.filter((transition) => transition.to === selected.value);

  return (
    <div class="machine__explorer" data-selected={selected.value}>
      <ul class="machine__statuses" aria-label={`Statuses of ${machine.name}`}>
        {machine.statuses.map((status) => {
          const pressed = status.id === selected.value;
          return (
            <li key={status.id}>
              <button
                type="button"
                class="badge machine__status"
                data-tone={status.tone}
                aria-pressed={pressed}
                onClick={() => {
                  selected.value = pressed ? undefined : status.id;
                }}
              >
                {status.id}
              </button>
            </li>
          );
        })}
      </ul>
      <p class="machine__reading" aria-live="polite">
        {current === undefined && (
          <span class="muted">
            Select a status to see where it can go and what brings it there.
          </span>
        )}
        {current !== undefined && (
          <Reading current={current} outgoing={outgoing} incoming={incoming} />
        )}
      </p>
      {/* The layout hides the statuses and the reading when scripts are off; this line stays. */}
      <noscript>
        <p class="machine__note muted">
          Selecting a status needs JavaScript. The table below lists every transition.
        </p>
      </noscript>
      {current !== undefined && (
        <p class="machine__key kicker" data-tone={current.tone}>
          <span data-relation="out">From marked: leaves it</span>
          <span data-relation="in">To marked: enters it</span>
        </p>
      )}
      <div
        class="machine__scroll"
        role="region"
        tabIndex={0}
        aria-label={`Transitions of ${machine.name}, scrolls sideways`}
      >
        {/* Phones stack each row into a block with CSS; the explicit roles and the data labels keep
            the table readable as a table when its cells no longer display as one. */}
        <table class="machine__table" role="table">
          <caption class="sr-only">Transitions of {machine.name}</caption>
          <thead role="rowgroup">
            <tr role="row">
              <th role="columnheader" scope="col">
                From
              </th>
              <th role="columnheader" scope="col">
                To
              </th>
              <th role="columnheader" scope="col">
                Trigger
              </th>
              <th role="columnheader" scope="col">
                Guard
              </th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {machine.transitions.map((transition) => (
              <tr
                key={`${transition.from}-${transition.to}-${transition.trigger}`}
                role="row"
                data-relation={relationOf(transition.from, transition.to)}
                data-tone={current?.tone}
              >
                <td role="cell" class="mono" data-label="From">
                  {transition.from}
                </td>
                <td role="cell" class="mono" data-label="To">
                  {transition.to}
                </td>
                <td role="cell" class="mono" data-label="Trigger">
                  {transition.trigger}
                </td>
                <td role="cell" data-label="Guard">
                  {transition.guard ?? ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
