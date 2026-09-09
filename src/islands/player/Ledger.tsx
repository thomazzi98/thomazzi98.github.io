import type { LogEntry } from '../../trace/kernel/simulation';
import { formatClock } from './format';

interface LedgerProps {
  readonly entries: readonly LogEntry[];
  readonly total: number;
  readonly labelFor: (station: string) => string;
}

export const Ledger = ({ entries, total, labelFor }: LedgerProps) => (
  <div class="ledger" data-ledger>
    <div class="ledger__head">
      <span class="kicker">Ledger</span>
      <span class="kicker">
        {String(entries.length)} of {String(total)} lines · simulation
      </span>
    </div>
    {entries.length === 0 && <p class="ledger__empty muted">Nothing has happened yet.</p>}
    <ol class="ledger__lines">
      {entries.map((entry) => (
        <li key={entry.sequence} class="ledger__line" data-tone={entry.tone}>
          <span class="ledger__time mono">{formatClock(entry.at)}</span>
          <span class="ledger__station kicker">{labelFor(entry.station)}</span>
          <span class="ledger__message">{entry.message}</span>
        </li>
      ))}
    </ol>
  </div>
);
