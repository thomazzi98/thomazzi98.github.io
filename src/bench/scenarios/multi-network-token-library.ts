import type { BenchDefinition } from '../core/definition';
import type { Demonstration } from '../core/demonstration';
import type { Presenter } from '../core/presentation';
import type { Scenario, StepContext, Tone } from '../core/simulation';

export type Network = 'ethereum' | 'polygon' | 'bitcoin' | 'bnb';
export type Reading = 'total-supply' | 'balance-of';

export interface Levers {
  network: Network;
}

export interface Call {
  id: number;
  reading: Reading;
  network: Network;
  answeredBy: string;
  result: string;
  tone: Tone;
}

export interface State {
  registered: Network[];
  calls: Call[];
  nextId: number;
}

export type Event =
  { type: 'read'; reading: Reading } | { type: 'answer'; callId: number } | { type: 'register' };

const networkLabel: Record<Network, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  bitcoin: 'Bitcoin',
  bnb: 'BNB Chain',
};

const readingLabel: Record<Reading, string> = {
  'total-supply': 'totalSupply',
  'balance-of': 'balanceOf',
};

export const definition: BenchDefinition = {
  stations: [
    { id: 'caller', label: 'Monitoring', kind: 'actor', note: 'Lambda' },
    { id: 'library', label: 'Token library', kind: 'boundary', note: 'one interface' },
    { id: 'registry', label: 'Registry', kind: 'store', note: 'network → implementation' },
    { id: 'ethereum', label: 'Ethereum', kind: 'external', note: 'ERC-20 contract' },
    { id: 'polygon', label: 'Polygon', kind: 'external', note: 'ERC-20 contract' },
    { id: 'bitcoin', label: 'Bitcoin', kind: 'external', note: 'no contracts' },
    { id: 'bnb', label: 'BNB Chain', kind: 'external', note: 'not registered yet' },
  ],
  wires: [
    { from: 'caller', to: 'library' },
    { from: 'library', to: 'registry', label: 'resolve' },
    { from: 'library', to: 'ethereum' },
    { from: 'library', to: 'polygon' },
    { from: 'library', to: 'bitcoin' },
    { from: 'library', to: 'bnb', dashed: true, label: 'after registering' },
  ],
  levers: [
    {
      id: 'network',
      label: 'The input names',
      options: [
        { value: 'ethereum', label: 'Ethereum' },
        { value: 'polygon', label: 'Polygon' },
        { value: 'bitcoin', label: 'Bitcoin' },
        { value: 'bnb', label: 'BNB Chain' },
      ],
    },
  ],
  actions: [
    { id: 'total-supply', label: 'Ask totalSupply' },
    { id: 'balance-of', label: 'Ask balanceOf' },
    { id: 'register', label: 'Register BNB Chain' },
  ],
};

const resolveLatency = 40;

const networkLatency = (network: Network, context: StepContext<Event>): number => {
  const jitter = context.random.between(0.8, 1.2);
  return Math.round((network === 'bitcoin' ? 900 : 350) * jitter);
};

const resultFor = (reading: Reading, network: Network, context: StepContext<Event>): string => {
  if (network === 'bitcoin') {
    return reading === 'total-supply'
      ? '19.7 M issued, read from the chain'
      : 'UTXO sum for the address';
  }
  const supply = Math.round(context.random.between(1_000_000, 90_000_000));
  return reading === 'total-supply'
    ? `${supply.toLocaleString('en-US')} from the contract`
    : `${String(Math.round(context.random.between(1, 5000)))} tokens from the contract`;
};

const read = (
  state: State,
  reading: Reading,
  context: StepContext<Event>,
  levers: Levers,
): State => {
  const id = state.nextId;
  const network = levers.network;
  context.send('caller', 'library', 'neutral', 60);
  context.send('library', 'registry', 'pending', resolveLatency);
  context.log(
    'library',
    'pending',
    `${readingLabel[reading]} · network resolved from the input: ${networkLabel[network]}`,
  );
  if (!state.registered.includes(network)) {
    context.log(
      'registry',
      'refused',
      `no implementation registered for ${networkLabel[network]} · the core does not guess`,
    );
    return {
      ...state,
      nextId: id + 1,
      calls: [
        ...state.calls,
        { id, reading, network, answeredBy: 'nobody', result: 'refused', tone: 'refused' },
      ],
    };
  }
  const latency = networkLatency(network, context);
  context.send('library', network, 'pending', latency);
  context.schedule(resolveLatency + latency, { type: 'answer', callId: id });
  return {
    ...state,
    nextId: id + 1,
    calls: [
      ...state.calls,
      {
        id,
        reading,
        network,
        answeredBy: `${networkLabel[network]} implementation`,
        result: resultFor(reading, network, context),
        tone: 'pending',
      },
    ],
  };
};

const answer = (state: State, callId: number, context: StepContext<Event>): State => {
  const call = state.calls.find((candidate) => candidate.id === callId);
  if (call === undefined) {
    return state;
  }
  context.send(call.network, 'library', 'ok', 60);
  context.log(
    'library',
    'ok',
    `${readingLabel[call.reading]} on ${networkLabel[call.network]} · ${call.result} · core untouched`,
  );
  return {
    ...state,
    calls: state.calls.map((candidate) =>
      candidate.id === callId ? { ...candidate, tone: 'ok' } : candidate,
    ),
  };
};

const register = (state: State, context: StepContext<Event>): State => {
  if (state.registered.includes('bnb')) {
    context.log('registry', 'neutral', 'BNB Chain is already registered');
    return state;
  }
  context.send('registry', 'library', 'ok', 60);
  context.log(
    'registry',
    'ok',
    'BNB Chain implementation registered · one new file · 0 lines changed in the core',
  );
  return { ...state, registered: [...state.registered, 'bnb'] };
};

export const scenario: Scenario<State, Event, Levers> = {
  id: 'multi-network-token-library',
  defaultLevers: { network: 'polygon' },
  initialState: () => ({
    registered: ['ethereum', 'polygon', 'bitcoin'],
    calls: [],
    nextId: 1,
  }),
  boot: () => undefined,
  handle: (state, event, context, levers) => {
    switch (event.type) {
      case 'read':
        return read(state, event.reading, context, levers);
      case 'answer':
        return answer(state, event.callId, context);
      case 'register':
        return register(state, context);
    }
  },
};

const libraryTone = (lastCall: Call | undefined): Tone => {
  if (lastCall === undefined) {
    return 'neutral';
  }
  return lastCall.tone === 'refused' ? 'fault' : 'ok';
};

const stationTone = (state: State, network: Network): Tone =>
  state.registered.includes(network) ? 'ok' : 'neutral';

export const present: Presenter<State, Levers> = (state, levers) => {
  const lastCall = state.calls.at(-1);
  const headline = (() => {
    if (lastCall?.tone === 'refused') {
      return `The input names ${networkLabel[lastCall.network]} and nothing is registered for it. The library refuses instead of guessing.`;
    }
    if (levers.network === 'bitcoin') {
      return 'Bitcoin has no contracts, so totalSupply means something else there. Same interface, different implementation.';
    }
    return 'One interface. The network is resolved from the input and the call goes to that network’s implementation.';
  })();
  return {
    headline,
    stations: {
      registry: { badge: `${String(state.registered.length)} networks · core v1`, tone: 'ok' },
      ethereum: { tone: stationTone(state, 'ethereum') },
      polygon: { tone: stationTone(state, 'polygon') },
      bitcoin: { tone: stationTone(state, 'bitcoin') },
      bnb: {
        tone: stationTone(state, 'bnb'),
        badge: state.registered.includes('bnb') ? 'registered' : undefined,
      },
      library: {
        tone: libraryTone(lastCall),
      },
    },
    meters: [
      {
        id: 'networks',
        label: 'Networks registered',
        value: state.registered.length,
        maximum: 4,
        unit: 'networks',
        tone: 'ok',
        caption: state.registered.map((network) => networkLabel[network]).join(', '),
      },
    ],
    ledger: {
      caption: 'Calls',
      columns: ['#', 'Function', 'Network', 'Answered by', 'Result'],
      rows: state.calls
        .slice(-6)
        .reverse()
        .map((call) => ({
          tone: call.tone,
          cells: [
            String(call.id),
            readingLabel[call.reading],
            networkLabel[call.network],
            call.answeredBy,
            call.result,
          ],
        })),
    },
  };
};

export const demonstration: Demonstration<Event, Levers> = {
  seed: 13,
  steps: [
    { kind: 'dispatch', event: { type: 'read', reading: 'total-supply' } },
    { kind: 'advance', duration: 800 },
    { kind: 'lever', name: 'network', value: 'bitcoin' },
    { kind: 'dispatch', event: { type: 'read', reading: 'total-supply' } },
    { kind: 'advance', duration: 1500 },
    { kind: 'lever', name: 'network', value: 'bnb' },
    { kind: 'dispatch', event: { type: 'read', reading: 'balance-of' } },
    { kind: 'dispatch', event: { type: 'register' } },
    { kind: 'dispatch', event: { type: 'read', reading: 'balance-of' } },
    { kind: 'advance', duration: 1000 },
  ],
};

export const actionEvent = (actionId: string): Event | undefined => {
  if (actionId === 'total-supply' || actionId === 'balance-of') {
    return { type: 'read', reading: actionId };
  }
  if (actionId === 'register') {
    return { type: 'register' };
  }
  return undefined;
};

export const invitation =
  'Ask totalSupply on Polygon, then on Bitcoin, which has no contracts. Name BNB Chain before it is registered, register it, and ask again.';
