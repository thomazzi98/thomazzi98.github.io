import { useEffect, useRef } from 'preact/hooks';
import type { Tone } from '../../systems/schema';
import { formatClock } from './format';

export interface LedgerLine {
  readonly key: string;
  readonly at: number;
  readonly tone: Tone;
  readonly station: string;
  readonly message: string;
}

// A line the visitor caused (a lever pulled, a flow chosen), printed before the replay's own.
export interface LedgerNote {
  readonly station: string;
  readonly message: string;
}

interface LedgerProps {
  readonly title: string;
  // The accessible name of the scrolling box; several ledgers share a page, so it names the flow.
  readonly name: string;
  readonly lines: readonly LedgerLine[];
  readonly total: number;
  readonly note?: LedgerNote;
}

// Newer lines scroll into view unless the visitor has scrolled up to read earlier ones.
const followThreshold = 4;

export const Ledger = ({ title, name, lines, total, note }: LedgerProps) => {
  const scrollReference = useRef<HTMLDivElement>(null);
  const heightReference = useRef<number | undefined>(undefined);
  const printed = lines.length + (note === undefined ? 0 : 1);

  // Whether to follow is decided from where the visitor was before the new lines landed: the
  // height before this commit is remembered, so a scroll event (which the browser marks trusted
  // even when a script caused it) never has to be told apart from the visitor's own.
  useEffect(() => {
    const box = scrollReference.current;
    if (box === null) {
      return;
    }
    const heightBefore = heightReference.current ?? box.scrollHeight;
    const wasAtBottom = box.scrollTop + box.clientHeight >= heightBefore - followThreshold;
    if (printed === 0 || wasAtBottom) {
      box.scrollTop = box.scrollHeight;
    }
    heightReference.current = box.scrollHeight;
  }, [printed]);

  return (
    <div class="ledger" data-ledger>
      <div class="ledger__head">
        <span class="kicker">{title}</span>
        <span class="kicker">
          {String(lines.length)} of {String(total)} lines · simulation
        </span>
      </div>
      <div
        class="ledger__scroll"
        ref={scrollReference}
        role="region"
        tabIndex={0}
        aria-label={`${name}, scrolls`}
      >
        {lines.length === 0 && note === undefined && (
          <p class="ledger__empty muted">Nothing has happened yet.</p>
        )}
        <ol class="ledger__lines">
          {note !== undefined && (
            <li class="ledger__line ledger__line--note" data-tone="neutral">
              <span class="ledger__time mono">{formatClock(0)}</span>
              <span class="ledger__station">{note.station}</span>
              <span class="ledger__message">{note.message}</span>
            </li>
          )}
          {lines.map((line) => (
            <li key={line.key} class="ledger__line" data-tone={line.tone}>
              <span class="ledger__time mono">{formatClock(line.at)}</span>
              <span class="ledger__station">{line.station}</span>
              <span class="ledger__message">{line.message}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};
