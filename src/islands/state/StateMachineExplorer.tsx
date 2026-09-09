import { useSignal } from '@preact/signals';
import type { StateMachine, Status, Tone } from '../../systems/schema';

export interface StateMachineExplorerProps {
  readonly machine: StateMachine;
}

type Relation = 'out' | 'in' | 'other';

const toneOf = (status: Status): Tone => {
  if (status.terminal) {
    return 'neutral';
  }
  return status.funded === true ? 'ok' : 'wait';
};

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
                data-tone={toneOf(status)}
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
      <p class="machine__reading">
        {current === undefined && (
          <span class="muted">
            Select a status to see where it can go and what brings it there.
          </span>
        )}
        {current !== undefined && (
          <>
            <strong class="mono">{current.id}</strong>
            <span class="muted">
              {' '}
              · {String(outgoing.length)} way{outgoing.length === 1 ? '' : 's'} out ·{' '}
              {String(incoming.length)} way{incoming.length === 1 ? '' : 's'} in
              {describe(current) === '' ? '' : ` · ${describe(current)}`}
            </span>
          </>
        )}
      </p>
      <div
        class="machine__scroll"
        tabIndex={0}
        aria-label={`Transitions of ${machine.name}, scrolls sideways`}
      >
        <table class="machine__table">
          <caption class="sr-only">Transitions of {machine.name}</caption>
          <thead>
            <tr>
              <th scope="col">From</th>
              <th scope="col">To</th>
              <th scope="col">Trigger</th>
              <th scope="col">Guard</th>
            </tr>
          </thead>
          <tbody>
            {machine.transitions.map((transition) => (
              <tr
                key={`${transition.from}-${transition.to}-${transition.trigger}`}
                data-relation={relationOf(transition.from, transition.to)}
              >
                <td class="mono">{transition.from}</td>
                <td class="mono">{transition.to}</td>
                <td class="mono">{transition.trigger}</td>
                <td>{transition.guard ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
