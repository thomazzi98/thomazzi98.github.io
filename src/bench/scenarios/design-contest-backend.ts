import type { BenchDefinition } from '../core/definition';
import type { Demonstration } from '../core/demonstration';
import type { Presenter } from '../core/presentation';
import type { Scenario, StepContext, Tone } from '../core/simulation';

export type WriteMode = 'read-modify-write' | 'atomic-increment';
export type BurstSize = '10' | '50' | '200';

export interface Levers {
  writeMode: WriteMode;
  burst: BurstSize;
}

export interface Burst {
  id: number;
  mode: WriteMode;
  cast: number;
  counted: number;
  settledAt?: number;
}

export interface State {
  counter: number;
  castTotal: number;
  bursts: Burst[];
  inFlight: number;
  mints: number;
  nextBurstId: number;
}

export type Event =
  | { type: 'cast' }
  | { type: 'vote-arrive'; burstId: number }
  | { type: 'vote-write'; burstId: number; readValue: number }
  | { type: 'burst-settle'; burstId: number }
  | { type: 'mint' }
  | { type: 'mint-from-api' }
  | { type: 'signed' }
  | { type: 'receipt'; attempt: number };

export const definition: BenchDefinition = {
  stations: [
    { id: 'voters', label: 'Voters', kind: 'actor', note: 'no accounts' },
    { id: 'api', label: 'Contest API', kind: 'service', note: 'Express' },
    { id: 'votes', label: 'DynamoDB', kind: 'store', note: 'vote counts' },
    { id: 'signer', label: 'Signer', kind: 'boundary', note: 'Lambda · owner key' },
    { id: 'chain', label: 'Polygon', kind: 'external', note: 'ERC-721' },
  ],
  wires: [
    { from: 'voters', to: 'api' },
    { from: 'api', to: 'votes' },
    { from: 'api', to: 'signer', dashed: true, label: 'finalist ids' },
    { from: 'signer', to: 'chain' },
  ],
  levers: [
    {
      id: 'writeMode',
      label: 'Counting a vote',
      options: [
        { value: 'read-modify-write', label: 'Read, add one, write' },
        { value: 'atomic-increment', label: 'Atomic increment' },
      ],
    },
    {
      id: 'burst',
      label: 'Concurrent votes',
      options: [
        { value: '10', label: '10' },
        { value: '50', label: '50' },
        { value: '200', label: '200' },
      ],
    },
  ],
  actions: [
    { id: 'cast', label: 'Cast votes' },
    { id: 'mint', label: 'Mint finalists' },
    { id: 'mint-from-api', label: 'Mint from the API' },
  ],
};

const burstWindow = 300;
const readLatency = 45;
const writeLatency = 35;
const receiptAttempts = 3;
const receiptInterval = 1500;

const burstById = (state: State, burstId: number): Burst | undefined =>
  state.bursts.find((burst) => burst.id === burstId);

const updateBurst = (state: State, burstId: number, patch: Partial<Burst>): State => ({
  ...state,
  bursts: state.bursts.map((burst) => (burst.id === burstId ? { ...burst, ...patch } : burst)),
});

const cast = (state: State, context: StepContext<Event>, levers: Levers): State => {
  const size = Number(levers.burst);
  const id = state.nextBurstId;
  context.log('voters', 'neutral', `${String(size)} votes arrive within ${String(burstWindow)} ms`);
  for (let index = 0; index < size; index += 1) {
    context.schedule(context.random.between(0, burstWindow), { type: 'vote-arrive', burstId: id });
  }
  context.schedule(burstWindow + readLatency + writeLatency + 50, {
    type: 'burst-settle',
    burstId: id,
  });
  return {
    ...state,
    nextBurstId: id + 1,
    castTotal: state.castTotal + size,
    inFlight: state.inFlight + size,
    bursts: [...state.bursts, { id, mode: levers.writeMode, cast: size, counted: 0 }],
  };
};

const arrive = (
  state: State,
  event: Extract<Event, { type: 'vote-arrive' }>,
  context: StepContext<Event>,
  levers: Levers,
): State => {
  context.send('voters', 'api', 'neutral', 30);
  if (levers.writeMode === 'atomic-increment') {
    context.send('api', 'votes', 'ok', writeLatency);
    return updateBurst(
      { ...state, counter: state.counter + 1, inFlight: state.inFlight - 1 },
      event.burstId,
      { counted: (burstById(state, event.burstId)?.counted ?? 0) + 1 },
    );
  }
  context.send('api', 'votes', 'pending', readLatency);
  context.schedule(readLatency + writeLatency, {
    type: 'vote-write',
    burstId: event.burstId,
    readValue: state.counter,
  });
  return state;
};

const write = (
  state: State,
  event: Extract<Event, { type: 'vote-write' }>,
  context: StepContext<Event>,
): State => {
  const written = event.readValue + 1;
  const lost = written <= state.counter;
  context.send('api', 'votes', lost ? 'fault' : 'ok', writeLatency);
  return updateBurst(
    { ...state, counter: Math.max(state.counter, written), inFlight: state.inFlight - 1 },
    event.burstId,
    { counted: (burstById(state, event.burstId)?.counted ?? 0) + (lost ? 0 : 1) },
  );
};

const settle = (state: State, burstId: number, context: StepContext<Event>): State => {
  const burst = burstById(state, burstId);
  if (burst === undefined) {
    return state;
  }
  const lost = burst.cast - burst.counted;
  const tone: Tone = lost > 0 ? 'fault' : 'ok';
  const summary =
    lost > 0
      ? `burst #${String(burstId)} · ${String(burst.cast)} cast · counter shows ${String(burst.counted)} · ${String(lost)} updates lost`
      : `burst #${String(burstId)} · ${String(burst.cast)} cast · ${String(burst.counted)} counted · nothing lost`;
  context.log('votes', tone, summary);
  return updateBurst(state, burstId, { settledAt: context.now });
};

const mint = (state: State, context: StepContext<Event>): State => {
  context.send('api', 'signer', 'neutral', 80);
  context.log('api', 'neutral', 'finalist ids handed to the signer');
  context.schedule(120, { type: 'signed' });
  return state;
};

const signed = (state: State, context: StepContext<Event>): State => {
  context.send('signer', 'chain', 'ok', 200);
  context.log(
    'signer',
    'ok',
    'signs the mint with the owner key from its own environment · broadcast',
  );
  context.schedule(receiptInterval, { type: 'receipt', attempt: 1 });
  return { ...state, mints: state.mints + 1 };
};

const receipt = (
  state: State,
  event: Extract<Event, { type: 'receipt' }>,
  context: StepContext<Event>,
): State => {
  if (event.attempt < receiptAttempts) {
    context.log('signer', 'pending', `polls for the receipt · attempt ${String(event.attempt)}`);
    context.schedule(receiptInterval, { type: 'receipt', attempt: event.attempt + 1 });
    return state;
  }
  context.log('chain', 'ok', `receipt confirmed · attempt ${String(event.attempt)} · token minted`);
  return state;
};

export const scenario: Scenario<State, Event, Levers> = {
  id: 'design-contest-backend',
  defaultLevers: { writeMode: 'read-modify-write', burst: '50' },
  initialState: () => ({
    counter: 0,
    castTotal: 0,
    bursts: [],
    inFlight: 0,
    mints: 0,
    nextBurstId: 1,
  }),
  boot: () => undefined,
  handle: (state, event, context, levers) => {
    switch (event.type) {
      case 'cast':
        return cast(state, context, levers);
      case 'vote-arrive':
        return arrive(state, event, context, levers);
      case 'vote-write':
        return write(state, event, context);
      case 'burst-settle':
        return settle(state, event.burstId, context);
      case 'mint':
        return mint(state, context);
      case 'mint-from-api':
        context.log('api', 'refused', 'refused · no key here · only the signer can mint');
        return state;
      case 'signed':
        return signed(state, context);
      case 'receipt':
        return receipt(state, event, context);
    }
  },
};

const burstTone = (burst: Burst): Tone => {
  if (burst.settledAt === undefined) {
    return 'pending';
  }
  return burst.cast > burst.counted ? 'fault' : 'ok';
};

const modeLabel: Record<WriteMode, string> = {
  'read-modify-write': 'read, add one, write',
  'atomic-increment': 'atomic increment',
};

export const present: Presenter<State, Levers> = (state, levers) => {
  const lastBurst = state.bursts.at(-1);
  const settled = lastBurst?.settledAt !== undefined;
  const lost = lastBurst === undefined ? 0 : lastBurst.cast - lastBurst.counted;
  const headline = (() => {
    if (lastBurst === undefined) {
      return levers.writeMode === 'read-modify-write'
        ? 'Cast a burst of votes. Each request reads the count, adds one and writes it back.'
        : 'Cast a burst of votes. Each request asks the database to add one, in one operation.';
    }
    if (!settled) {
      return `${String(lastBurst.cast)} votes in flight, counted by ${modeLabel[lastBurst.mode]}.`;
    }
    return lost > 0
      ? `${String(lastBurst.cast)} votes cast. The counter says ${String(lastBurst.counted)}. Read-modify-write lost ${String(lost)} of them.`
      : `${String(lastBurst.cast)} votes cast, ${String(lastBurst.counted)} counted. One atomic operation per vote loses nothing.`;
  })();
  const scale = Math.max(50, state.castTotal);
  return {
    headline,
    stations: {
      votes: { badge: String(state.counter), tone: settled && lost > 0 ? 'fault' : 'ok' },
      api: { tone: state.inFlight > 0 ? 'pending' : 'neutral' },
      signer: { badge: state.mints > 0 ? `${String(state.mints)} minted` : undefined, tone: 'ok' },
    },
    meters: [
      {
        id: 'cast',
        label: 'Votes cast',
        value: state.castTotal,
        maximum: scale,
        unit: 'votes',
        tone: 'neutral',
        caption: `${String(state.castTotal)} cast`,
      },
      {
        id: 'counted',
        label: 'Counter in DynamoDB',
        value: state.counter,
        maximum: scale,
        unit: 'votes',
        tone: state.counter < state.castTotal - state.inFlight ? 'fault' : 'ok',
        caption: `${String(state.counter)} counted`,
      },
    ],
    ledger: {
      caption: 'Bursts',
      columns: ['#', 'Counting', 'Cast', 'Counted', 'Lost'],
      rows: state.bursts
        .slice(-6)
        .reverse()
        .map((burst) => ({
          tone: burstTone(burst),
          cells: [
            String(burst.id),
            modeLabel[burst.mode],
            String(burst.cast),
            String(burst.counted),
            burst.settledAt === undefined ? '' : String(burst.cast - burst.counted),
          ],
        })),
    },
  };
};

export const demonstration: Demonstration<Event, Levers> = {
  seed: 5,
  steps: [
    { kind: 'dispatch', event: { type: 'cast' } },
    { kind: 'advance', duration: 1000 },
    { kind: 'lever', name: 'writeMode', value: 'atomic-increment' },
    { kind: 'dispatch', event: { type: 'cast' } },
    { kind: 'advance', duration: 1000 },
    { kind: 'dispatch', event: { type: 'mint-from-api' } },
    { kind: 'dispatch', event: { type: 'mint' } },
    { kind: 'advance', duration: 5000 },
  ],
};

export const actionEvent = (actionId: string): Event | undefined => {
  if (actionId === 'cast' || actionId === 'mint' || actionId === 'mint-from-api') {
    return { type: actionId };
  }
  return undefined;
};
