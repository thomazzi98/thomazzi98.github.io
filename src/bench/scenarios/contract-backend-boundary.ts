import type { BenchDefinition } from '../core/definition';
import type { Demonstration } from '../core/demonstration';
import type { Presenter } from '../core/presentation';
import type { Scenario, StepContext, Tone } from '../core/simulation';

export type KeyLocation = 'backend' | 'panel';

export interface Levers {
  keyLocation: KeyLocation;
}

export type ActionKind = 'operator-allocate' | 'user-buy' | 'view-source' | 'upgrade-contract';

export interface Transaction {
  id: number;
  action: 'operator allocation' | 'user purchase';
  signedBy: string;
  keyWas: string;
  exposed: boolean;
}

export interface State {
  transactions: Transaction[];
  exposures: number;
  frontEndReleases: number;
  contractVersion: number;
  nextId: number;
}

export type Event =
  { type: 'act'; action: ActionKind } | { type: 'confirmed'; transactionId: number };

export const definition: BenchDefinition = {
  stations: [
    { id: 'panel', label: 'Pre-sale panel', kind: 'service', note: 'Next.js · public host' },
    { id: 'wallet', label: 'User wallet', kind: 'actor' },
    { id: 'backend', label: 'Backend', kind: 'boundary', note: 'ABIs, addresses, key' },
    { id: 'db', label: 'MySQL', kind: 'store', note: 'users, referrals, phases' },
    { id: 'chain', label: 'BNB Chain', kind: 'external', note: 'upgradeable contracts' },
  ],
  wires: [
    { from: 'panel', to: 'backend', label: 'REST' },
    { from: 'backend', to: 'chain', label: 'operator-signed' },
    { from: 'wallet', to: 'chain', label: 'user-signed' },
    { from: 'backend', to: 'db' },
    { from: 'panel', to: 'chain', dashed: true, label: 'never' },
  ],
  levers: [
    {
      id: 'keyLocation',
      label: 'The operator key lives in',
      options: [
        { value: 'backend', label: 'The backend' },
        { value: 'panel', label: 'The panel bundle' },
      ],
    },
  ],
  actions: [
    { id: 'operator-allocate', label: 'Operator: allocate pre-sale' },
    { id: 'user-buy', label: 'User: buy a miner' },
    { id: 'view-source', label: 'Open the panel’s source' },
    { id: 'upgrade-contract', label: 'Upgrade a contract' },
  ],
};

const confirmation = 900;

const operatorAllocate = (state: State, context: StepContext<Event>, levers: Levers): State => {
  const id = state.nextId;
  if (levers.keyLocation === 'backend') {
    context.send('panel', 'backend', 'neutral', 80);
    context.send('backend', 'chain', 'ok', 200);
    context.log(
      'backend',
      'ok',
      `allocation #${String(id)} · signed with the operator key · sent to the chain`,
    );
  }
  if (levers.keyLocation === 'panel') {
    context.send('panel', 'chain', 'fault', 200);
    context.log(
      'panel',
      'fault',
      `allocation #${String(id)} · signed in the browser with the embedded operator key`,
    );
  }
  context.schedule(confirmation, { type: 'confirmed', transactionId: id });
  return {
    ...state,
    nextId: id + 1,
    transactions: [
      ...state.transactions,
      {
        id,
        action: 'operator allocation',
        signedBy: levers.keyLocation === 'backend' ? 'backend' : 'panel, in the browser',
        keyWas: levers.keyLocation === 'backend' ? 'on the server' : 'in a public bundle',
        exposed: levers.keyLocation === 'panel',
      },
    ],
  };
};

const userBuy = (state: State, context: StepContext<Event>): State => {
  const id = state.nextId;
  context.send('wallet', 'chain', 'ok', 200);
  context.log(
    'wallet',
    'ok',
    `purchase #${String(id)} · the user signs in their own wallet · no key of ours involved`,
  );
  context.schedule(confirmation, { type: 'confirmed', transactionId: id });
  return {
    ...state,
    nextId: id + 1,
    transactions: [
      ...state.transactions,
      {
        id,
        action: 'user purchase',
        signedBy: 'the user’s wallet',
        keyWas: 'theirs',
        exposed: false,
      },
    ],
  };
};

const viewSource = (state: State, context: StepContext<Event>, levers: Levers): State => {
  if (levers.keyLocation === 'backend') {
    context.log(
      'panel',
      'ok',
      'view-source: no key, no ABI, no node URL · the bundle only knows a REST URL',
    );
    return state;
  }
  context.log(
    'panel',
    'fault',
    'view-source: the operator private key is in the bundle · anyone reading it can act as the operator',
  );
  return { ...state, exposures: state.exposures + 1 };
};

const upgradeContract = (state: State, context: StepContext<Event>, levers: Levers): State => {
  const version = state.contractVersion + 1;
  context.send('backend', 'chain', 'neutral', 200);
  if (levers.keyLocation === 'backend') {
    context.log(
      'backend',
      'ok',
      `contract v${String(version)} · new ABI registered in the backend · the panel ships unchanged`,
    );
    return { ...state, contractVersion: version };
  }
  context.log(
    'panel',
    'fault',
    `contract v${String(version)} · the panel embeds the ABI · rebuild and redeploy the front end`,
  );
  return { ...state, contractVersion: version, frontEndReleases: state.frontEndReleases + 1 };
};

const confirmed = (state: State, transactionId: number, context: StepContext<Event>): State => {
  const transaction = state.transactions.find((candidate) => candidate.id === transactionId);
  if (transaction === undefined) {
    return state;
  }
  if (transaction.action === 'operator allocation') {
    context.send('backend', 'db', 'ok', 80);
  }
  context.log(
    'chain',
    transaction.exposed ? 'fault' : 'ok',
    `#${String(transactionId)} confirmed · ${transaction.action} · key was ${transaction.keyWas}`,
  );
  return state;
};

export const scenario: Scenario<State, Event, Levers> = {
  id: 'contract-backend-boundary',
  defaultLevers: { keyLocation: 'backend' },
  initialState: () => ({
    transactions: [],
    exposures: 0,
    frontEndReleases: 0,
    contractVersion: 1,
    nextId: 1,
  }),
  boot: () => undefined,
  handle: (state, event, context, levers) => {
    if (event.type === 'confirmed') {
      return confirmed(state, event.transactionId, context);
    }
    switch (event.action) {
      case 'operator-allocate':
        return operatorAllocate(state, context, levers);
      case 'user-buy':
        return userBuy(state, context);
      case 'view-source':
        return viewSource(state, context, levers);
      case 'upgrade-contract':
        return upgradeContract(state, context, levers);
    }
  },
};

export const present: Presenter<State, Levers> = (state, levers) => {
  const exposed = levers.keyLocation === 'panel';
  const panelTone: Tone = exposed ? 'fault' : 'ok';
  return {
    headline: exposed
      ? 'The operator key ships in the bundle. Whoever reads the source can act as the operator, and every contract change means a front-end release.'
      : 'The panel talks to a backend. The backend talks to the chain. The panel never can, and it holds nothing worth stealing.',
    stations: {
      panel: { tone: panelTone, badge: exposed ? 'key inside' : 'no secrets' },
      backend: { tone: exposed ? 'neutral' : 'ok', badge: `ABI v${String(state.contractVersion)}` },
      chain: {
        tone: 'neutral',
        badge:
          state.transactions.length > 0 ? `${String(state.transactions.length)} tx` : undefined,
      },
    },
    meters: [
      {
        id: 'releases',
        label: 'Front-end releases forced by contract changes',
        value: state.frontEndReleases,
        maximum: Math.max(3, state.frontEndReleases),
        unit: 'releases',
        tone: state.frontEndReleases > 0 ? 'fault' : 'ok',
        caption: `${String(state.frontEndReleases)} so far`,
      },
      {
        id: 'exposures',
        label: 'Times the operator key was readable in public',
        value: state.exposures,
        maximum: Math.max(3, state.exposures),
        unit: 'exposures',
        tone: state.exposures > 0 ? 'fault' : 'ok',
        caption: state.exposures === 0 ? 'never' : `${String(state.exposures)} times`,
      },
    ],
    ledger: {
      caption: 'Transactions',
      columns: ['#', 'Action', 'Signed by', 'The key was'],
      rows: state.transactions
        .slice(-6)
        .reverse()
        .map((transaction) => ({
          tone: transaction.exposed ? 'fault' : 'ok',
          cells: [
            String(transaction.id),
            transaction.action,
            transaction.signedBy,
            transaction.keyWas,
          ],
        })),
    },
  };
};

export const demonstration: Demonstration<Event, Levers> = {
  seed: 9,
  steps: [
    { kind: 'dispatch', event: { type: 'act', action: 'view-source' } },
    { kind: 'dispatch', event: { type: 'act', action: 'operator-allocate' } },
    { kind: 'dispatch', event: { type: 'act', action: 'user-buy' } },
    { kind: 'advance', duration: 1500 },
    { kind: 'dispatch', event: { type: 'act', action: 'upgrade-contract' } },
    { kind: 'lever', name: 'keyLocation', value: 'panel' },
    { kind: 'dispatch', event: { type: 'act', action: 'view-source' } },
    { kind: 'dispatch', event: { type: 'act', action: 'operator-allocate' } },
    { kind: 'advance', duration: 1500 },
    { kind: 'dispatch', event: { type: 'act', action: 'upgrade-contract' } },
  ],
};

const actions: readonly ActionKind[] = [
  'operator-allocate',
  'user-buy',
  'view-source',
  'upgrade-contract',
];

export const actionEvent = (actionId: string): Event | undefined => {
  const action = actions.find((candidate) => candidate === actionId);
  return action === undefined ? undefined : { type: 'act', action };
};

export const invitation =
  'Open the panel’s source and find nothing worth stealing. Move the operator key into the bundle and open it again. Then upgrade a contract in each world.';

export const measures = 'counts';
