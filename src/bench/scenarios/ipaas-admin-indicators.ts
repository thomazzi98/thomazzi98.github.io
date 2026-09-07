import type { BenchDefinition } from '../core/definition';
import type { Demonstration } from '../core/demonstration';
import type { Presenter } from '../core/presentation';
import type { Scenario, StepContext, Tone } from '../core/simulation';

export type WorkerCount = '1' | '4' | '8';
export type Source = 'reference' | 'execution-store';
export type QueryKind = 'count-running' | 'usage';

export interface Levers {
  workers: WorkerCount;
  source: Source;
}

export interface Query {
  id: number;
  kind: QueryKind;
  source: Source;
  documents: number;
  bytes: number;
  duration: number;
  writesSlowed: boolean;
  finishedAt?: number;
}

export interface State {
  executions: number;
  storeBytes: number;
  referenceBytes: number;
  writeTimes: number[];
  scanUntil: number;
  queries: Query[];
  nextQueryId: number;
  liveWorkers: number[];
}

export type Event =
  | { type: 'worker-write'; worker: number }
  | { type: 'query'; kind: QueryKind }
  | { type: 'query-done'; queryId: number };

export const definition: BenchDefinition = {
  stations: [
    { id: 'workers', label: 'Workers', kind: 'service', note: 'one run per flow' },
    { id: 'executions', label: 'Execution store', kind: 'store', note: 'payload, logs, trail' },
    {
      id: 'reference',
      label: 'Execution reference',
      kind: 'store',
      note: 'status, bytes, duration',
    },
    { id: 'admin', label: 'Admin service', kind: 'service', note: 'counts, usage, billing' },
    { id: 'operators', label: 'Operators', kind: 'actor' },
    { id: 'billing', label: 'Billing', kind: 'actor' },
  ],
  wires: [
    { from: 'workers', to: 'executions' },
    { from: 'workers', to: 'reference' },
    { from: 'reference', to: 'admin', label: 'counts, usage' },
    { from: 'executions', to: 'admin', dashed: true, label: 'what it replaced' },
    { from: 'admin', to: 'operators' },
    { from: 'admin', to: 'billing' },
  ],
  levers: [
    {
      id: 'workers',
      label: 'Worker instances',
      options: [
        { value: '1', label: '1' },
        { value: '4', label: '4' },
        { value: '8', label: '8' },
      ],
    },
    {
      id: 'source',
      label: 'Reports read from',
      options: [
        { value: 'reference', label: 'Execution reference' },
        { value: 'execution-store', label: 'Execution store' },
      ],
    },
  ],
  actions: [
    { id: 'count-running', label: 'Count running' },
    { id: 'usage', label: 'Usage this month' },
  ],
};

const writeInterval = 700;
const heavyBytesMinimum = 40_000;
const heavyBytesMaximum = 400_000;
const slimBytes = 320;
const throughputWindow = 2000;
const storeCostPerDocument = 24;
const referenceCostPerDocument = 0.4;
const storeBytesPerMillisecond = 25_000;
const referenceBytesPerMillisecond = 250_000;
const queryFloor = 6;
const slowdownFactor = 2.5;

const queryLabel: Record<QueryKind, string> = {
  'count-running': 'count running executions',
  usage: 'usage this month',
};

const scheduleWrite = (context: StepContext<Event>, worker: number, slowed: boolean): void => {
  const jitter = context.random.between(0.7, 1.3);
  context.schedule(writeInterval * jitter * (slowed ? slowdownFactor : 1), {
    type: 'worker-write',
    worker,
  });
};

const bootWorkers = (state: State, context: StepContext<Event>, levers: Levers): State => {
  const wanted = Number(levers.workers);
  const started: number[] = [];
  for (let worker = 0; worker < wanted; worker += 1) {
    if (!state.liveWorkers.includes(worker)) {
      scheduleWrite(context, worker, false);
      started.push(worker);
    }
  }
  return started.length === 0
    ? state
    : { ...state, liveWorkers: [...state.liveWorkers, ...started] };
};

const write = (
  state: State,
  worker: number,
  context: StepContext<Event>,
  levers: Levers,
): State => {
  if (worker >= Number(levers.workers)) {
    return { ...state, liveWorkers: state.liveWorkers.filter((live) => live !== worker) };
  }
  const slowed = context.now < state.scanUntil;
  const heavy = Math.round(context.random.between(heavyBytesMinimum, heavyBytesMaximum));
  context.send('workers', 'executions', slowed ? 'fault' : 'neutral', 90);
  context.send('workers', 'reference', 'neutral', 90);
  scheduleWrite(context, worker, slowed);
  const recent = [...state.writeTimes, context.now].filter(
    (time) => time > context.now - throughputWindow,
  );
  return {
    ...state,
    executions: state.executions + 1,
    storeBytes: state.storeBytes + heavy,
    referenceBytes: state.referenceBytes + slimBytes,
    writeTimes: recent,
  };
};

const formatBytes = (bytes: number): string =>
  bytes >= 1_000_000
    ? `${(bytes / 1_000_000).toFixed(1)} MB`
    : `${String(Math.round(bytes / 1000))} KB`;

const query = (
  state: State,
  kind: QueryKind,
  context: StepContext<Event>,
  levers: Levers,
): State => {
  const id = state.nextQueryId;
  const fromStore = levers.source === 'execution-store';
  const documents = state.executions;
  const bytes = fromStore ? state.storeBytes : state.referenceBytes;
  const perDocument = fromStore ? storeCostPerDocument : referenceCostPerDocument;
  const bytesPerMillisecond = fromStore ? storeBytesPerMillisecond : referenceBytesPerMillisecond;
  const duration = Math.round(queryFloor + documents * perDocument + bytes / bytesPerMillisecond);
  context.send(
    fromStore ? 'executions' : 'reference',
    'admin',
    fromStore ? 'fault' : 'ok',
    duration,
  );
  context.log(
    'admin',
    'pending',
    `${queryLabel[kind]} · ${fromStore ? 'scanning the execution store' : 'reading the reference collection'}`,
  );
  context.schedule(duration, { type: 'query-done', queryId: id });
  return {
    ...state,
    nextQueryId: id + 1,
    scanUntil: fromStore ? Math.max(state.scanUntil, context.now + duration) : state.scanUntil,
    queries: [
      ...state.queries,
      { id, kind, source: levers.source, documents, bytes, duration, writesSlowed: fromStore },
    ],
  };
};

const finishQuery = (state: State, queryId: number, context: StepContext<Event>): State => {
  const done = state.queries.find((candidate) => candidate.id === queryId);
  if (done === undefined) {
    return state;
  }
  const tone: Tone = done.writesSlowed ? 'fault' : 'ok';
  const effect = done.writesSlowed
    ? 'the model slowed worker writes to a fraction while it ran'
    : 'the workers did not notice';
  context.send('admin', done.kind === 'usage' ? 'billing' : 'operators', tone, 60);
  context.log(
    'admin',
    tone,
    `${queryLabel[done.kind]} · ${String(done.documents)} documents · ${formatBytes(done.bytes)} · ${String(done.duration)} ms · ${effect}`,
  );
  return {
    ...state,
    queries: state.queries.map((query) =>
      query.id === queryId ? { ...query, finishedAt: context.now } : query,
    ),
  };
};

export const scenario: Scenario<State, Event, Levers> = {
  id: 'ipaas-admin-indicators',
  defaultLevers: { workers: '4', source: 'reference' },
  initialState: (levers) => ({
    executions: 0,
    storeBytes: 0,
    referenceBytes: 0,
    writeTimes: [],
    scanUntil: 0,
    queries: [],
    nextQueryId: 1,
    liveWorkers: [...Array(Number(levers.workers)).keys()],
  }),
  boot: (context, levers) => {
    for (let worker = 0; worker < Number(levers.workers); worker += 1) {
      scheduleWrite(context, worker, false);
    }
  },
  handle: (state, event, context, levers) => {
    switch (event.type) {
      case 'worker-write': {
        const booted = bootWorkers(state, context, levers);
        return write(booted, event.worker, context, levers);
      }
      case 'query':
        return query(bootWorkers(state, context, levers), event.kind, context, levers);
      case 'query-done':
        return finishQuery(state, event.queryId, context);
    }
  },
};

const queryTone = (query: Query | undefined): Tone => {
  if (query === undefined) {
    return 'neutral';
  }
  return query.writesSlowed ? 'fault' : 'ok';
};

const sourceLabel: Record<Source, string> = {
  reference: 'reference',
  'execution-store': 'execution store',
};

const headlineFor = (levers: Levers, lastQuery: Query | undefined, scanning: boolean): string => {
  if (lastQuery !== undefined && scanning) {
    return `Scanning ${String(lastQuery.documents)} documents (${formatBytes(lastQuery.bytes)}) in the execution store. Worker writes slow down while it runs.`;
  }
  if (lastQuery?.source === 'reference') {
    return `The last report read ${String(lastQuery.documents)} reference documents in ${String(lastQuery.duration)} ms. The workers did not notice.`;
  }
  if (lastQuery !== undefined) {
    return `The last scan took ${String(lastQuery.duration)} ms over ${formatBytes(lastQuery.bytes)} and slowed the workers while it ran.`;
  }
  return levers.source === 'reference'
    ? 'Operators and billing read a slim reference collection. Ask for a count and watch the workers keep writing.'
    : 'Reports scan the collection every worker writes on every run. Ask for a count and watch the workers slow down.';
};

export const present: Presenter<State, Levers> = (state, levers) => {
  const workers = Number(levers.workers);
  const lastQuery = state.queries.at(-1);
  const writesPerSecond = state.writeTimes.length / (throughputWindow / 1000);
  const expectedPerSecond = workers / (writeInterval / 1000);
  const scanning = state.queries.some(
    (query) => query.writesSlowed && query.finishedAt === undefined,
  );
  const headline = headlineFor(levers, lastQuery, scanning);
  return {
    headline,
    stations: {
      workers: {
        badge: `×${String(workers)}`,
        tone:
          writesPerSecond < expectedPerSecond * 0.7 && state.executions > 4 ? 'fault' : 'neutral',
      },
      executions: { badge: formatBytes(state.storeBytes), tone: scanning ? 'fault' : 'neutral' },
      reference: {
        badge: formatBytes(state.referenceBytes),
        tone: lastQuery?.source === 'reference' ? 'ok' : 'neutral',
      },
      admin: {
        tone: queryTone(lastQuery),
      },
    },
    meters: [
      {
        id: 'throughput',
        label: 'Worker writes per second',
        value: writesPerSecond,
        maximum: Math.max(expectedPerSecond, 1),
        unit: 'writes/s',
        tone: writesPerSecond < expectedPerSecond * 0.7 && state.executions > 4 ? 'fault' : 'ok',
        caption: `${writesPerSecond.toFixed(1)} of ${expectedPerSecond.toFixed(1)} expected`,
      },
      {
        id: 'query',
        label: 'Last report query',
        value: lastQuery?.duration ?? 0,
        maximum: 2500,
        unit: 'ms',
        tone: queryTone(lastQuery),
        caption:
          lastQuery === undefined
            ? 'no query yet'
            : `${String(lastQuery.duration)} ms from the ${sourceLabel[lastQuery.source]}`,
      },
    ],
    ledger: {
      caption: 'Report queries',
      columns: ['#', 'Query', 'Source', 'Documents', 'Read', 'Duration'],
      rows: state.queries
        .slice(-6)
        .reverse()
        .map((entry) => ({
          tone: entry.writesSlowed ? 'fault' : 'ok',
          cells: [
            String(entry.id),
            queryLabel[entry.kind],
            sourceLabel[entry.source],
            String(entry.documents),
            formatBytes(entry.bytes),
            `${String(entry.duration)} ms`,
          ],
        })),
    },
  };
};

export const demonstration: Demonstration<Event, Levers> = {
  seed: 21,
  steps: [
    { kind: 'advance', duration: 6000 },
    { kind: 'dispatch', event: { type: 'query', kind: 'count-running' } },
    { kind: 'advance', duration: 1500 },
    { kind: 'lever', name: 'source', value: 'execution-store' },
    { kind: 'dispatch', event: { type: 'query', kind: 'count-running' } },
    { kind: 'advance', duration: 2500 },
    { kind: 'dispatch', event: { type: 'query', kind: 'usage' } },
    { kind: 'advance', duration: 2500 },
  ],
};

export const actionEvent = (actionId: string): Event | undefined => {
  if (actionId === 'count-running' || actionId === 'usage') {
    return { type: 'query', kind: actionId };
  }
  return undefined;
};

export const invitation =
  'Ask for a count while the workers write. Then point reports at the execution store, ask again, and watch the write rate dip.';
