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
}

const logCapacity = 10;
const svgNamespace = 'http://www.w3.org/2000/svg';

interface Drawing {
  wires: PlacedWire[];
  layer: SVGGElement;
}

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

const renderPackets = (
  layer: SVGGElement,
  wires: readonly PlacedWire[],
  packets: readonly Packet[],
  now: number,
): void => {
  const live = new Set<string>();
  for (const packet of packets) {
    const position = locatePacket(wires, packet, now);
    if (position === undefined || now > packet.arrivesAt) {
      continue;
    }
    const key = String(packet.id);
    live.add(key);
    let shuttle = layer.querySelector<SVGRectElement>(`[data-packet="${key}"]`);
    if (shuttle === null) {
      shuttle = document.createElementNS(svgNamespace, 'rect');
      shuttle.dataset.packet = key;
      shuttle.setAttribute('width', '9');
      shuttle.setAttribute('height', '9');
      layer.append(shuttle);
    }
    shuttle.dataset.tone = packet.tone;
    shuttle.setAttribute('x', String(position.x - 4.5));
    shuttle.setAttribute('y', String(position.y - 4.5));
  }
  for (const shuttle of layer.querySelectorAll<SVGRectElement>('[data-packet]')) {
    if (!live.has(shuttle.dataset.packet ?? '')) {
      shuttle.remove();
    }
  }
};

const renderStations = (root: ParentNode, view: BenchView): void => {
  for (const group of root.querySelectorAll<SVGGElement>('[data-station]')) {
    const stationView = view.stations[group.dataset.station ?? ''];
    group.dataset.tone = stationView?.tone ?? 'neutral';
    const badge = group.querySelector<SVGTextElement>('[data-badge]');
    if (badge !== null) {
      badge.textContent = stationView?.badge ?? '';
    }
  }
};

const renderMeter = (root: ParentNode, meter: Meter): void => {
  const element = root.querySelector<HTMLElement>(`[data-meter="${meter.id}"]`);
  if (element === null) {
    return;
  }
  const share = Math.min(1, meter.value / meter.maximum);
  element.dataset.tone = meter.tone;
  element.style.setProperty('--share', String(share));
  const caption = element.querySelector<HTMLElement>('[data-meter-caption]');
  if (caption !== null) {
    caption.textContent = meter.caption ?? `${String(Math.round(meter.value))} ${meter.unit}`;
  }
};

const renderLedger = (root: ParentNode, view: BenchView): void => {
  const body = root.querySelector<HTMLTableSectionElement>('[data-ledger]');
  if (body === null) {
    return;
  }
  body.replaceChildren(
    ...view.ledger.rows.map((row) => {
      const tableRow = document.createElement('tr');
      tableRow.dataset.tone = row.tone;
      for (const [index, cell] of row.cells.entries()) {
        const element = document.createElement(index === 0 ? 'th' : 'td');
        if (index === 0) {
          element.setAttribute('scope', 'row');
        }
        element.textContent = cell;
        tableRow.append(element);
      }
      const actionCell = document.createElement('td');
      if (row.actionId !== undefined) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.action = row.actionId;
        button.textContent = 'Re-queue';
        actionCell.append(button);
      }
      tableRow.append(actionCell);
      return tableRow;
    }),
  );
};

const renderLog = (root: ParentNode, entries: readonly LogEntry[]): void => {
  const list = root.querySelector<HTMLOListElement>('[data-log]');
  if (list === null) {
    return;
  }
  const recent = entries.slice(-logCapacity);
  list.replaceChildren(
    ...recent.map((entry) => {
      const item = document.createElement('li');
      item.dataset.tone = entry.tone;
      const time = document.createElement('span');
      time.textContent = formatSeconds(entry.at);
      const station = document.createElement('span');
      station.textContent = entry.station;
      const message = document.createElement('span');
      message.textContent = entry.message;
      item.append(time, station, message);
      return item;
    }),
  );
};

const renderText = (root: ParentNode, selector: string, text: string): void => {
  const element = root.querySelector<HTMLElement>(selector);
  if (element !== null && element.textContent !== text) {
    element.textContent = text;
  }
};

const readDrawings = (root: ParentNode): Drawing[] =>
  [...root.querySelectorAll<SVGSVGElement>('svg[data-bench-drawing]')].flatMap((svg) => {
    const layer = svg.querySelector<SVGGElement>('[data-packets]');
    return layer === null ? [] : [{ wires: readWires(svg), layer }];
  });

export const bindBench = (options: BindOptions): BenchBinding => {
  const { root, module, simulation, clock } = options;
  const drawings = readDrawings(root);
  let running = false;
  let frame = 0;
  let lastTick = 0;
  let accumulated = 0;

  const render = (): void => {
    const view = module.present(simulation.state, simulation.levers);
    renderStations(root, view);
    for (const meter of view.meters) {
      renderMeter(root, meter);
    }
    renderLedger(root, view);
    renderLog(root, simulation.log);
    renderText(root, '[data-headline]', view.headline);
    renderText(root, '[data-clock]', `t = ${formatSeconds(simulation.now)}`);
    for (const drawing of drawings) {
      renderPackets(drawing.layer, drawing.wires, simulation.packets, simulation.now);
    }
  };

  const setRunning = (next: boolean): void => {
    running = next;
    root.dataset.running = String(next);
    const toggle = root.querySelector<HTMLButtonElement>('[data-run]');
    if (toggle !== null) {
      toggle.setAttribute('aria-pressed', String(next));
      toggle.textContent = next ? 'Pause' : 'Run';
    }
  };

  const tick = (timestamp: number): void => {
    if (!running) {
      return;
    }
    if (lastTick === 0) {
      lastTick = timestamp;
    }
    accumulated += timestamp - lastTick;
    lastTick = timestamp;
    let beats = 0;
    while (accumulated >= clock.beatMilliseconds && beats < 4) {
      accumulated -= clock.beatMilliseconds;
      beats += 1;
    }
    if (beats > 0) {
      simulation.advance(beats * clock.virtualPerBeat);
    }
    frame = requestAnimationFrame(tick);
  };

  const run = (): void => {
    if (running) {
      return;
    }
    setRunning(true);
    lastTick = 0;
    frame = requestAnimationFrame(tick);
  };

  const pause = (): void => {
    setRunning(false);
    cancelAnimationFrame(frame);
  };

  const step = (): void => {
    pause();
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
    if (nextEvent !== undefined) {
      simulation.dispatch(nextEvent);
    }
  };

  const onChange = (event: Event): void => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.dataset.lever === undefined) {
      return;
    }
    simulation.setLever(input.dataset.lever as never, input.value as never);
  };

  const onVisibility = (): void => {
    if (document.hidden && running) {
      pause();
      root.dataset.pausedByVisibility = 'true';
      return;
    }
    if (!document.hidden && root.dataset.pausedByVisibility === 'true') {
      delete root.dataset.pausedByVisibility;
      run();
    }
  };

  const unsubscribe = simulation.subscribe(render);
  root.addEventListener('click', onClick);
  root.addEventListener('change', onChange);
  document.addEventListener('visibilitychange', onVisibility);
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
      root.removeEventListener('click', onClick);
      root.removeEventListener('change', onChange);
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
};
