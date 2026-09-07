import type { BenchDefinition } from '../core/definition';
import type { Demonstration } from '../core/demonstration';
import { median, type Presenter } from '../core/presentation';
import type { Scenario, StepContext, Tone } from '../core/simulation';

export type Mode = 'queued' | 'synchronous';
export type ProviderHealth = 'healthy' | 'slow' | 'server-fault' | 'client-fault';
export type Traffic = 'manual' | 'steady';

export interface Levers {
  mode: Mode;
  providerHealth: ProviderHealth;
  traffic: Traffic;
}

export type RegistrationStatus =
  'queued' | 'processing' | 'waiting-retry' | 'processed' | 'recorded-fault' | 'failed' | 'lost';

export interface Registration {
  id: number;
  status: RegistrationStatus;
  attempts: number;
  lastStatusCode?: number;
  createdAt: number;
  settledAt?: number;
}

export interface State {
  registrations: Registration[];
  queue: number[];
  workerBusy: boolean;
  signupLatencies: number[];
  providerLatencies: number[];
  supportInbox: number[];
  nextId: number;
  createdTotal: number;
}

export type Event =
  | { type: 'signup' }
  | { type: 'dequeue' }
  | {
      type: 'provider-response';
      registrationId: number;
      statusCode: number;
      latency: number;
      via: 'api' | 'worker';
    }
  | { type: 'retry'; registrationId: number }
  | { type: 'requeue'; registrationId: number }
  | { type: 'requeue-failed' }
  | { type: 'traffic-tick' };

export const definition: BenchDefinition = {
  stations: [
    { id: 'user', label: 'User', kind: 'actor' },
    { id: 'api', label: 'API', kind: 'service', note: 'Express' },
    { id: 'db', label: 'MySQL', kind: 'store', note: 'registration rows' },
    { id: 'queue', label: 'Queue', kind: 'queue', note: 'BullMQ on Redis' },
    { id: 'worker', label: 'Worker', kind: 'service' },
    { id: 'provider', label: 'Bank provider', kind: 'external', note: 'slow, may fail' },
    { id: 'support', label: 'Support', kind: 'actor' },
  ],
  wires: [
    { from: 'user', to: 'api' },
    { from: 'api', to: 'db' },
    { from: 'api', to: 'queue' },
    { from: 'queue', to: 'worker' },
    { from: 'worker', to: 'provider' },
    { from: 'worker', to: 'db' },
    { from: 'support', to: 'queue', dashed: true, label: 're-queue' },
    { from: 'api', to: 'provider', dashed: true, label: 'what it replaced' },
  ],
  levers: [
    {
      id: 'providerHealth',
      label: 'Bank provider',
      options: [
        { value: 'healthy', label: 'Healthy' },
        { value: 'slow', label: 'Slow' },
        { value: 'server-fault', label: 'Answers 503' },
        { value: 'client-fault', label: 'Answers 422' },
      ],
    },
    {
      id: 'mode',
      label: 'Sign-up path',
      options: [
        { value: 'queued', label: 'Queued job' },
        { value: 'synchronous', label: 'What it replaced' },
      ],
    },
    {
      id: 'traffic',
      label: 'Traffic',
      options: [
        { value: 'manual', label: 'Manual' },
        { value: 'steady', label: 'Steady' },
      ],
    },
  ],
  actions: [
    { id: 'signup', label: 'Sign up' },
    { id: 'requeue-failed', label: 'Re-queue failed' },
  ],
  rowActions: true,
};

export const maxAttempts = 3;
export const backoffBase = 1000;
const steadyInterval = 1800;
const meterWindow = 8;
const registrationLimit = 80;

const providerLatency = (health: ProviderHealth, context: StepContext<Event>): number => {
  const jitter = context.random.between(0.85, 1.15);
  if (health === 'slow') {
    return Math.round(3000 * jitter);
  }
  return Math.round(400 * jitter);
};

const providerStatusCode = (health: ProviderHealth): number => {
  if (health === 'server-fault') {
    return 503;
  }
  if (health === 'client-fault') {
    return 422;
  }
  return 201;
};

const pushSample = (samples: number[], sample: number): number[] =>
  [...samples, sample].slice(-meterWindow);

const updateRegistration = (
  state: State,
  registrationId: number,
  patch: Partial<Registration>,
): State => ({
  ...state,
  registrations: trimSettled(
    state.registrations.map((registration) =>
      registration.id === registrationId ? { ...registration, ...patch } : registration,
    ),
    state.queue,
    state.supportInbox,
  ),
});

const findRegistration = (state: State, registrationId: number): Registration | undefined =>
  state.registrations.find((registration) => registration.id === registrationId);

const describeBackoff = (attempt: number): number => backoffBase * 2 ** (attempt - 1);

const settledStatuses: readonly RegistrationStatus[] = ['processed', 'lost'];

const trimSettled = (
  registrations: Registration[],
  queue: readonly number[],
  supportInbox: readonly number[],
): Registration[] => {
  let excess = registrations.length - registrationLimit;
  if (excess <= 0) {
    return registrations;
  }
  return registrations.filter((registration) => {
    const disposable =
      excess > 0 &&
      settledStatuses.includes(registration.status) &&
      !queue.includes(registration.id) &&
      !supportInbox.includes(registration.id);
    if (disposable) {
      excess -= 1;
    }
    return !disposable;
  });
};

const startProviderCall = (
  registrationId: number,
  from: 'api' | 'worker',
  context: StepContext<Event>,
  levers: Levers,
): void => {
  const latency = providerLatency(levers.providerHealth, context);
  const statusCode = providerStatusCode(levers.providerHealth);
  context.send(from, 'provider', 'pending', latency / 2);
  context.schedule(latency, {
    type: 'provider-response',
    registrationId,
    statusCode,
    latency,
    via: from,
  });
};

const signUpQueued = (state: State, context: StepContext<Event>): State => {
  const id = state.nextId;
  const queued: Registration = { id, status: 'queued', attempts: 0, createdAt: context.now };
  const apiLatency = Math.round(context.random.between(3, 9));
  context.send('user', 'api', 'neutral', 60);
  context.send('api', 'db', 'neutral', 80);
  context.send('api', 'queue', 'pending', 80);
  context.log('api', 'ok', `202 Accepted · registration #${String(id)} · ${String(apiLatency)} ms`);
  const shouldWake = !state.workerBusy && state.queue.length === 0;
  if (shouldWake) {
    context.schedule(100, { type: 'dequeue' });
  }
  return {
    ...state,
    nextId: id + 1,
    registrations: trimSettled([...state.registrations, queued], state.queue, state.supportInbox),
    queue: [...state.queue, id],
    signupLatencies: pushSample(state.signupLatencies, apiLatency),
  };
};

const signUpSynchronous = (state: State, context: StepContext<Event>, levers: Levers): State => {
  const id = state.nextId;
  context.send('user', 'api', 'neutral', 60);
  context.log('api', 'pending', `sign-up #${String(id)} waits for the provider`);
  startProviderCall(id, 'api', context, levers);
  return {
    ...state,
    nextId: id + 1,
    registrations: [
      ...state.registrations,
      { id, status: 'processing', attempts: 1, createdAt: context.now },
    ],
  };
};

const dequeue = (state: State, context: StepContext<Event>, levers: Levers): State => {
  const [registrationId, ...rest] = state.queue;
  if (state.workerBusy || registrationId === undefined) {
    return state;
  }
  const registration = findRegistration(state, registrationId);
  if (registration === undefined) {
    context.schedule(0, { type: 'dequeue' });
    return { ...state, queue: rest };
  }
  context.send('queue', 'worker', 'pending', 80);
  const attempts = registration.attempts + 1;
  context.log(
    'worker',
    'pending',
    `takes #${String(registrationId)} · attempt ${String(attempts)} of ${String(maxAttempts)}`,
  );
  startProviderCall(registrationId, 'worker', context, levers);
  return updateRegistration({ ...state, queue: rest, workerBusy: true }, registrationId, {
    status: 'processing',
    attempts,
  });
};

const settleQueued = (
  state: State,
  event: Extract<Event, { type: 'provider-response' }>,
  context: StepContext<Event>,
): State => {
  const registration = findRegistration(state, event.registrationId);
  const freed: State = {
    ...state,
    workerBusy: false,
    providerLatencies: pushSample(state.providerLatencies, event.latency),
  };
  if (state.queue.length > 0) {
    context.schedule(50, { type: 'dequeue' });
  }
  if (registration === undefined) {
    return freed;
  }
  const id = event.registrationId;
  if (event.statusCode < 300) {
    context.send('worker', 'db', 'ok', 80);
    context.log(
      'worker',
      'ok',
      `#${String(id)} · ${String(event.statusCode)} from provider · account created`,
    );
    return updateRegistration({ ...freed, createdTotal: freed.createdTotal + 1 }, id, {
      status: 'processed',
      lastStatusCode: event.statusCode,
      settledAt: context.now,
    });
  }
  if (event.statusCode < 500) {
    context.send('worker', 'db', 'fault', 80);
    context.log(
      'worker',
      'fault',
      `#${String(id)} · ${String(event.statusCode)} from provider · recorded, not retried · surfaced to support`,
    );
    return updateRegistration({ ...freed, supportInbox: [...freed.supportInbox, id] }, id, {
      status: 'recorded-fault',
      lastStatusCode: event.statusCode,
      settledAt: context.now,
    });
  }
  if (registration.attempts < maxAttempts) {
    const backoff = describeBackoff(registration.attempts);
    context.schedule(backoff, { type: 'retry', registrationId: id });
    context.log(
      'worker',
      'fault',
      `#${String(id)} · ${String(event.statusCode)} from provider · retry in ${String(backoff / 1000)} s`,
    );
    return updateRegistration(freed, id, {
      status: 'waiting-retry',
      lastStatusCode: event.statusCode,
    });
  }
  context.send('worker', 'db', 'fault', 80);
  context.log(
    'worker',
    'fault',
    `#${String(id)} · gave up after ${String(maxAttempts)} attempts · surfaced to support`,
  );
  return updateRegistration({ ...freed, supportInbox: [...freed.supportInbox, id] }, id, {
    status: 'failed',
    lastStatusCode: event.statusCode,
    settledAt: context.now,
  });
};

const settleSynchronous = (
  state: State,
  event: Extract<Event, { type: 'provider-response' }>,
  context: StepContext<Event>,
): State => {
  const id = event.registrationId;
  const withLatency = {
    ...state,
    signupLatencies: pushSample(state.signupLatencies, event.latency),
  };
  if (event.statusCode < 300) {
    context.send('api', 'user', 'ok', 60);
    context.log('api', 'ok', `201 Created · #${String(id)} · ${String(event.latency)} ms`);
    return updateRegistration({ ...withLatency, createdTotal: withLatency.createdTotal + 1 }, id, {
      status: 'processed',
      lastStatusCode: event.statusCode,
      settledAt: context.now,
    });
  }
  context.send('api', 'user', 'fault', 60);
  context.log(
    'api',
    'fault',
    `502 Bad Gateway · #${String(id)} · ${String(event.latency)} ms · nothing recorded`,
  );
  return updateRegistration(withLatency, id, {
    status: 'lost',
    lastStatusCode: event.statusCode,
    settledAt: context.now,
  });
};

const requeue = (state: State, registrationId: number, context: StepContext<Event>): State => {
  const registration = findRegistration(state, registrationId);
  if (registration === undefined) {
    return state;
  }
  if (registration.status === 'processed') {
    context.log(
      'support',
      'refused',
      `re-queue #${String(registrationId)} refused · already processed`,
    );
    return state;
  }
  if (registration.status !== 'failed' && registration.status !== 'recorded-fault') {
    context.log(
      'support',
      'refused',
      `re-queue #${String(registrationId)} refused · still in flight`,
    );
    return state;
  }
  context.send('support', 'queue', 'pending', 80);
  context.log('support', 'neutral', `re-queued #${String(registrationId)}`);
  if (!state.workerBusy && state.queue.length === 0) {
    context.schedule(100, { type: 'dequeue' });
  }
  return updateRegistration(
    {
      ...state,
      queue: [...state.queue, registrationId],
      supportInbox: state.supportInbox.filter((id) => id !== registrationId),
    },
    registrationId,
    { status: 'queued', attempts: 0, settledAt: undefined },
  );
};

export const scenario: Scenario<State, Event, Levers> = {
  id: 'queued-bank-onboarding',
  defaultLevers: { mode: 'queued', providerHealth: 'healthy', traffic: 'manual' },
  initialState: () => ({
    registrations: [],
    queue: [],
    workerBusy: false,
    signupLatencies: [],
    providerLatencies: [],
    supportInbox: [],
    nextId: 1,
    createdTotal: 0,
  }),
  boot: (context) => {
    context.schedule(steadyInterval, { type: 'traffic-tick' });
  },
  handle: (state, event, context, levers) => {
    switch (event.type) {
      case 'signup':
        return levers.mode === 'queued'
          ? signUpQueued(state, context)
          : signUpSynchronous(state, context, levers);
      case 'dequeue':
        return dequeue(state, context, levers);
      case 'provider-response':
        return event.via === 'api'
          ? settleSynchronous(state, event, context)
          : settleQueued(state, event, context);
      case 'retry':
        if (!state.workerBusy && state.queue.length === 0) {
          context.schedule(0, { type: 'dequeue' });
        }
        return { ...state, queue: [event.registrationId, ...state.queue] };
      case 'requeue':
        return requeue(state, event.registrationId, context);
      case 'requeue-failed':
        return state.supportInbox.reduce(
          (current, registrationId) => requeue(current, registrationId, context),
          state,
        );
      case 'traffic-tick':
        context.schedule(steadyInterval, { type: 'traffic-tick' });
        return levers.traffic === 'steady'
          ? scenario.handle(state, { type: 'signup' }, context, levers)
          : state;
    }
  },
};

const statusLabel: Record<RegistrationStatus, string> = {
  queued: 'queued',
  processing: 'with the worker',
  'waiting-retry': 'waiting to retry',
  processed: 'account created',
  'recorded-fault': 'recorded for support',
  failed: 'gave up, with support',
  lost: 'lost, nothing recorded',
};

const statusTone: Record<RegistrationStatus, Tone> = {
  queued: 'pending',
  processing: 'pending',
  'waiting-retry': 'fault',
  processed: 'ok',
  'recorded-fault': 'fault',
  failed: 'fault',
  lost: 'fault',
};

const healthTone: Record<ProviderHealth, Tone> = {
  healthy: 'ok',
  slow: 'pending',
  'server-fault': 'fault',
  'client-fault': 'fault',
};

const healthBadge: Record<ProviderHealth, string | undefined> = {
  healthy: undefined,
  slow: 'slow',
  'server-fault': '503',
  'client-fault': '422',
};

const describeLatency = (samples: readonly number[]): string =>
  samples.length === 0 ? 'no calls yet' : `${String(Math.round(median(samples)))} ms median`;

const healthReadout: Record<ProviderHealth, (provider: number) => string> = {
  healthy: (provider) => `Provider healthy at ${String(provider)} ms.`,
  slow: (provider) => `Provider slow at ${String(provider)} ms.`,
  'server-fault': () => 'Provider answering 503.',
  'client-fault': () => 'Provider answering 422.',
};

const countWithStatus = (state: State, statuses: readonly RegistrationStatus[]): number =>
  state.registrations.filter((registration) => statuses.includes(registration.status)).length;

const headlineFor = (state: State, levers: Levers): string => {
  if (state.registrations.length === 0) {
    return levers.mode === 'queued'
      ? 'Sign-up answers in milliseconds. The provider’s health is the worker’s problem, on purpose.'
      : 'What it replaced: every sign-up waits for the provider and inherits its failures.';
  }
  const created = state.createdTotal;
  if (levers.mode === 'synchronous') {
    const waited = Math.round(median(state.signupLatencies));
    const lost = countWithStatus(state, ['lost']);
    return `Every sign-up now waits for the provider: ${String(waited)} ms median. ${String(created)} created, ${String(lost)} lost with nothing recorded.`;
  }
  const signup = Math.round(median(state.signupLatencies));
  const provider = Math.round(median(state.providerLatencies));
  const inFlight = countWithStatus(state, ['queued', 'processing', 'waiting-retry']);
  return `${healthReadout[levers.providerHealth](provider)} Sign-up still ${String(signup)} ms. ${String(created)} created, ${String(inFlight)} in flight, ${String(state.supportInbox.length)} with support.`;
};

export const present: Presenter<State, Levers> = (state, levers) => {
  const signup = median(state.signupLatencies);
  const provider = median(state.providerLatencies);
  const headline = headlineFor(state, levers);
  return {
    headline,
    stations: {
      queue: {
        badge: state.queue.length > 0 ? String(state.queue.length) : undefined,
        tone: 'pending',
      },
      worker: { tone: state.workerBusy ? 'pending' : 'neutral' },
      provider: {
        tone: healthTone[levers.providerHealth],
        badge: healthBadge[levers.providerHealth],
      },
      support: {
        badge: state.supportInbox.length > 0 ? String(state.supportInbox.length) : undefined,
        tone: 'fault',
      },
    },
    meters: [
      {
        id: 'signup',
        label: 'Sign-up latency',
        value: signup,
        maximum: 4000,
        unit: 'ms',
        tone: signup < 50 ? 'ok' : 'fault',
        caption: describeLatency(state.signupLatencies),
      },
      {
        id: 'provider',
        label: 'Provider latency',
        value: provider,
        maximum: 4000,
        unit: 'ms',
        tone: 'neutral',
        caption: describeLatency(state.providerLatencies),
      },
    ],
    ledger: {
      caption: 'Registrations',
      columns: ['#', 'Status', 'Attempts', 'Last answer'],
      rows: state.registrations
        .slice(-6)
        .reverse()
        .map((registration) => ({
          tone: statusTone[registration.status],
          action:
            registration.status === 'failed' || registration.status === 'recorded-fault'
              ? { id: `requeue:${String(registration.id)}`, label: 'Re-queue' }
              : undefined,
          cells: [
            String(registration.id),
            statusLabel[registration.status],
            String(registration.attempts),
            registration.lastStatusCode === undefined ? '' : String(registration.lastStatusCode),
          ],
        })),
    },
  };
};

export const demonstration: Demonstration<Event, Levers> = {
  seed: 7,
  steps: [
    { kind: 'dispatch', event: { type: 'signup' } },
    { kind: 'advance', duration: 1200 },
    { kind: 'lever', name: 'providerHealth', value: 'server-fault' },
    { kind: 'dispatch', event: { type: 'signup' } },
    { kind: 'advance', duration: 9000 },
    { kind: 'lever', name: 'providerHealth', value: 'client-fault' },
    { kind: 'dispatch', event: { type: 'signup' } },
    { kind: 'advance', duration: 1500 },
    { kind: 'dispatch', event: { type: 'requeue', registrationId: 1 } },
    { kind: 'lever', name: 'providerHealth', value: 'healthy' },
    { kind: 'dispatch', event: { type: 'requeue-failed' } },
    { kind: 'advance', duration: 3000 },
  ],
};

export const actionEvent = (actionId: string): Event | undefined => {
  if (actionId === 'signup') {
    return { type: 'signup' };
  }
  if (actionId === 'requeue-failed') {
    return { type: 'requeue-failed' };
  }
  const [verb, argument] = actionId.split(':');
  if (verb === 'requeue' && argument !== undefined) {
    return { type: 'requeue', registrationId: Number(argument) };
  }
  return undefined;
};

export const invitation =
  'Press Sign up, then flip the bank provider to 503 and watch the worker back off while sign-ups keep answering. Flip to 422 and watch the fault get recorded instead of retried. Then switch to what it replaced.';

export const measures = 'latencies and counts';
