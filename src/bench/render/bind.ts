import type { BenchView, Meter } from '../core/presentation';
import type { LogEntry, Packet, Simulation } from '../core/simulation';
import type { ScenarioModule } from '../scenarios';
import { pointAlong, type PlacedWire } from './layout';

export interface Clock {
  beatMilliseconds: number;
  virtualPerBeat: number;
}

export interface BenchBinding {
  readonly running: boolean;
  run(): void;
  pause(): void;
  step(): void;
  destroy(): void;
}

interface BindOptions {
  root: HTMLElement;
  module: ScenarioModule;
  simulation: Simulation<unknown, unknown, object>;
  clock: Clock;
  autoRun: boolean;
  motionAllowed: boolean;
}

interface Drawing {
  svg: SVGSVGElement;
  wires: PlacedWire[];
  layer: SVGGElement;
}

const logCapacity = 10;
const backlogLimitInBeats = 8;
const svgNamespace = 'http://www.w3.org/2000/svg';

const readNumber = (element: Element, name: string): number => Number(element.getAttribute(name));

const readWires = (root: ParentNode): PlacedWire[] =>
  [...root.querySelectorAll<SVGPathElement>('[data-wire-from]')].map((path) => {
    const hasControl = path.hasAttribute('data-cx');
    return {
      wire: { from: path.dataset.wireFrom ?? '', to: path.dataset.wireTo ?? '' },
      x1: readNumber(path, 'data-x1'),
      y1: readNumber(path, 'data-y1'),
      x2: readNumber(path, 'data-x2'),
      y2: readNumber(path, 'data-y2'),
      control: hasControl
        ? { x: readNumber(path, 'data-cx'), y: readNumber(path, 'data-cy') }
        : undefined,
    };
  });

const readDrawings = (root: ParentNode): Drawing[] =>
  [...root.querySelectorAll<SVGSVGElement>('svg[data-bench-drawing]')].flatMap((svg) => {
    const layer = svg.querySelector<SVGGElement>('[data-packets]');
    return layer === null ? [] : [{ svg, wires: readWires(svg), layer }];
  });

const isShown = (element: Element): boolean =>
  typeof element.checkVisibility === 'function' ? element.checkVisibility() : true;

const locatePacket = (
  wires: readonly PlacedWire[],
  packet: Packet,
  now: number,
): { x: number; y: number } | undefined => {
  const elapsed = now - packet.departedAt;
  const travel = packet.arrivesAt - packet.departedAt;
  const progress = travel <= 0 ? 1 : elapsed / travel;
  const forward = wires.find(
    (wire) => wire.wire.from === packet.from && wire.wire.to === packet.to,
  );
  if (forward !== undefined) {
    return pointAlong(forward, progress);
  }
  const backward = wires.find(
    (wire) => wire.wire.from === packet.to && wire.wire.to === packet.from,
  );
  return backward === undefined ? undefined : pointAlong(backward, 1 - progress);
};

const formatSeconds = (milliseconds: number): string => `${(milliseconds / 1000).toFixed(1)} s`;

const setText = (element: Element | null, text: string): void => {
  if (element !== null && element.textContent !== text) {
    element.textContent = text;
  }
};

const setData = (element: HTMLElement | SVGElement, name: string, value: string): void => {
  if (element.dataset[name] !== value) {
    element.dataset[name] = value;
  }
};

const setAttribute = (element: Element, name: string, value: string): void => {
  if (element.getAttribute(name) !== value) {
    element.setAttribute(name, value);
  }
};

const renderPackets = (drawing: Drawing, packets: readonly Packet[], now: number): void => {
  const live = new Set<string>();
  for (const packet of packets) {
    const position = locatePacket(drawing.wires, packet, now);
    if (position === undefined || now > packet.arrivesAt) {
      continue;
    }
    const key = String(packet.id);
    live.add(key);
    let shuttle = drawing.layer.querySelector<SVGRectElement>(`[data-packet="${key}"]`);
    if (shuttle === null) {
      shuttle = document.createElementNS(svgNamespace, 'rect');
      shuttle.dataset.packet = key;
      shuttle.setAttribute('width', '9');
      shuttle.setAttribute('height', '9');
      drawing.layer.append(shuttle);
    }
    setData(shuttle, 'tone', packet.tone);
    setAttribute(shuttle, 'x', String(position.x - 4.5));
    setAttribute(shuttle, 'y', String(position.y - 4.5));
  }
  for (const shuttle of drawing.layer.querySelectorAll<SVGRectElement>('[data-packet]')) {
    if (!live.has(shuttle.dataset.packet ?? '')) {
      shuttle.remove();
    }
  }
};

const renderStations = (root: ParentNode, view: BenchView): void => {
  for (const group of root.querySelectorAll<SVGGElement>('[data-station]')) {
    const stationView = view.stations[group.dataset.station ?? ''];
    setData(group, 'tone', stationView?.tone ?? 'neutral');
    setText(group.querySelector('[data-badge]'), stationView?.badge ?? '');
  }
};

const renderMeter = (root: ParentNode, meter: Meter): void => {
  const element = root.querySelector<HTMLElement>(`[data-meter="${meter.id}"]`);
  if (element === null) {
    return;
  }
  const share = String(Math.min(1, meter.value / meter.maximum));
  setData(element, 'tone', meter.tone);
  if (element.style.getPropertyValue('--share') !== share) {
    element.style.setProperty('--share', share);
  }
  setText(
    element.querySelector('[data-meter-caption]'),
    meter.caption ?? `${String(Math.round(meter.value))} ${meter.unit}`,
  );
};

const buildLedgerRow = (
  row: BenchView['ledger']['rows'][number],
  hasActionColumn: boolean,
): HTMLTableRowElement => {
  const tableRow = document.createElement('tr');
  tableRow.dataset.key = row.cells[0] ?? '';
  for (const [index, cell] of row.cells.entries()) {
    const element = document.createElement(index === 0 ? 'th' : 'td');
    if (index === 0) {
      element.setAttribute('scope', 'row');
    }
    element.textContent = cell;
    tableRow.append(element);
  }
  if (hasActionColumn) {
    tableRow.append(document.createElement('td'));
  }
  return tableRow;
};

const patchLedgerRow = (
  tableRow: HTMLTableRowElement,
  row: BenchView['ledger']['rows'][number],
  hasActionColumn: boolean,
): void => {
  setData(tableRow, 'tone', row.tone);
  const cells = tableRow.querySelectorAll('th, td');
  for (const [index, cell] of row.cells.entries()) {
    setText(cells[index] ?? null, cell);
  }
  if (!hasActionColumn) {
    return;
  }
  const actionCell = cells[row.cells.length];
  if (actionCell === undefined) {
    return;
  }
  const button = actionCell.querySelector('button');
  if (row.action === undefined) {
    button?.remove();
    return;
  }
  if (button === null) {
    const created = document.createElement('button');
    created.type = 'button';
    created.dataset.action = row.action.id;
    created.textContent = row.action.label;
    created.setAttribute('aria-label', `${row.action.label} #${row.cells[0] ?? ''}`);
    actionCell.append(created);
    return;
  }
  setData(button, 'action', row.action.id);
  setText(button, row.action.label);
};

const renderLedger = (root: ParentNode, view: BenchView, hasActionColumn: boolean): void => {
  const body = root.querySelector<HTMLTableSectionElement>('[data-ledger]');
  if (body === null) {
    return;
  }
  const existing = new Map(
    [...body.querySelectorAll<HTMLTableRowElement>('tr[data-key]')].map((tableRow) => [
      tableRow.dataset.key ?? '',
      tableRow,
    ]),
  );
  const wanted = new Set<string>();
  const ordered = view.ledger.rows.map((row) => {
    const key = row.cells[0] ?? '';
    wanted.add(key);
    const tableRow = existing.get(key) ?? buildLedgerRow(row, hasActionColumn);
    patchLedgerRow(tableRow, row, hasActionColumn);
    return tableRow;
  });
  for (const [key, tableRow] of existing) {
    if (!wanted.has(key)) {
      tableRow.remove();
    }
  }
  for (const [index, tableRow] of ordered.entries()) {
    const current = body.children[index];
    if (current !== tableRow) {
      body.insertBefore(tableRow, current ?? null);
    }
  }
};

const renderLog = (root: ParentNode, entries: readonly LogEntry[]): void => {
  const list = root.querySelector<HTMLOListElement>('[data-log]');
  if (list === null) {
    return;
  }
  const firstShown = Math.max(0, entries.length - logCapacity);
  const rendered = Number(list.dataset.renderedThrough ?? '0');
  for (let index = Math.max(rendered, firstShown); index < entries.length; index += 1) {
    const entry = entries[index];
    if (entry === undefined) {
      continue;
    }
    const item = document.createElement('li');
    item.dataset.tone = entry.tone;
    const time = document.createElement('span');
    time.textContent = formatSeconds(entry.at);
    const station = document.createElement('span');
    station.textContent = entry.station;
    const message = document.createElement('span');
    message.textContent = entry.message;
    item.append(time, station, message);
    list.append(item);
  }
  list.dataset.renderedThrough = String(entries.length);
  while (list.children.length > logCapacity) {
    list.firstElementChild?.remove();
  }
};

export const bindBench = (options: BindOptions): BenchBinding => {
  const { root, module, simulation, clock } = options;
  const drawings = readDrawings(root);
  const hasActionColumn = module.definition.rowActions === true;
  let running = false;
  let frame = 0;
  let timer = 0;
  let lastBeatAt = 0;
  let announcePending = false;

  const render = (): void => {
    const view = module.present(simulation.state, simulation.levers);
    renderStations(root, view);
    for (const meter of view.meters) {
      renderMeter(root, meter);
    }
    renderLedger(root, view, hasActionColumn);
    renderLog(root, simulation.log);
    setText(root.querySelector('[data-headline]'), view.headline);
    setText(root.querySelector('[data-clock]'), `t = ${formatSeconds(simulation.now)}`);
    for (const drawing of drawings) {
      if (isShown(drawing.svg)) {
        renderPackets(drawing, simulation.packets, simulation.now);
      }
    }
    if (announcePending) {
      announcePending = false;
      const latest = simulation.log.at(-1);
      setText(root.querySelector('[data-status]'), latest === undefined ? '' : latest.message);
    }
  };

  const setRunning = (next: boolean): void => {
    running = next;
    setData(root, 'running', String(next));
    setText(root.querySelector('[data-run]'), next ? 'Pause' : 'Run');
  };

  const stopLoop = (): void => {
    cancelAnimationFrame(frame);
    clearTimeout(timer);
  };

  const loop = (): void => {
    if (!running) {
      return;
    }
    const now = performance.now();
    if (now - lastBeatAt > clock.beatMilliseconds * backlogLimitInBeats) {
      lastBeatAt = now - clock.beatMilliseconds;
    }
    const beats = Math.floor((now - lastBeatAt) / clock.beatMilliseconds);
    if (beats > 0) {
      lastBeatAt += beats * clock.beatMilliseconds;
      simulation.advance(beats * clock.virtualPerBeat);
    }
    const wait = Math.max(0, clock.beatMilliseconds - (performance.now() - lastBeatAt));
    timer = window.setTimeout(() => {
      frame = requestAnimationFrame(loop);
    }, wait);
  };

  const run = (): void => {
    if (running) {
      return;
    }
    setRunning(true);
    lastBeatAt = performance.now();
    frame = requestAnimationFrame(loop);
  };

  const pause = (): void => {
    setRunning(false);
    stopLoop();
  };

  const step = (): void => {
    pause();
    announcePending = true;
    simulation.step();
  };

  const onClick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const button = target.closest<HTMLButtonElement>('button');
    if (button === null || !root.contains(button)) {
      return;
    }
    if (button.hasAttribute('data-run')) {
      if (running) {
        pause();
        return;
      }
      run();
      return;
    }
    if (button.hasAttribute('data-step')) {
      step();
      return;
    }
    const actionId = button.dataset.action;
    if (actionId === undefined) {
      return;
    }
    const nextEvent = module.actionEvent(actionId);
    if (nextEvent === undefined) {
      return;
    }
    announcePending = true;
    simulation.dispatch(nextEvent);
    if (!running && options.motionAllowed) {
      run();
    }
  };

  const onChange = (event: Event): void => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.dataset.lever === undefined) {
      return;
    }
    announcePending = true;
    simulation.setLever(input.dataset.lever as never, input.value as never);
  };

  let pausedByPage = false;
  const suspend = (): void => {
    if (running) {
      pausedByPage = true;
      pause();
    }
  };
  const resume = (): void => {
    if (pausedByPage) {
      pausedByPage = false;
      run();
    }
  };
  const onVisibility = (): void => {
    if (document.hidden) {
      suspend();
      return;
    }
    resume();
  };
  const observer =
    typeof IntersectionObserver === 'function'
      ? new IntersectionObserver((entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              resume();
              continue;
            }
            suspend();
          }
        })
      : undefined;

  const unsubscribe = simulation.subscribe(render);
  root.addEventListener('click', onClick);
  root.addEventListener('change', onChange);
  document.addEventListener('visibilitychange', onVisibility);
  observer?.observe(root);
  render();
  if (options.autoRun) {
    run();
  }

  return {
    get running() {
      return running;
    },
    run,
    pause,
    step,
    destroy: () => {
      pause();
      unsubscribe();
      observer?.disconnect();
      root.removeEventListener('click', onClick);
      root.removeEventListener('change', onChange);
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
};
