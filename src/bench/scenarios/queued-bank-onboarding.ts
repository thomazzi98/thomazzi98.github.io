import type { BenchDefinition } from '../core/definition';
import type { Scenario, StepContext } from '../core/simulation';

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
};

export const maxAttempts = 3;
export const backoffBase = 1000;
const steadyInterval = 1800;
const meterWindow = 8;

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
  registrations: state.registrations.map((registration) =>
    registration.id === registrationId ? { ...registration, ...patch } : registration,
  ),
});

const findRegistration = (state: State, registrationId: number): Registration | undefined =>
  state.registrations.find((registration) => registration.id === registrationId);

const describeBackoff = (attempt: number): number => backoffBase * 2 ** (attempt - 1);

const startProviderCall = (
  state: State,
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
    registrations: [
      ...state.registrations,
      { id, status: 'queued', attempts: 0, createdAt: context.now },
    ],
    queue: [...state.queue, id],
    signupLatencies: pushSample(state.signupLatencies, apiLatency),
  };
};

const signUpSynchronous = (state: State, context: StepContext<Event>, levers: Levers): State => {
  const id = state.nextId;
  context.send('user', 'api', 'neutral', 60);
  context.log('api', 'pending', `sign-up #${String(id)} waits for the provider`);
  startProviderCall(state, id, 'api', context, levers);
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
  context.send('queue', 'worker', 'pending', 80);
  const registration = findRegistration(state, registrationId);
  const attempts = (registration?.attempts ?? 0) + 1;
  context.log(
    'worker',
    'pending',
    `takes #${String(registrationId)} · attempt ${String(attempts)} of ${String(maxAttempts)}`,
  );
  startProviderCall(state, registrationId, 'worker', context, levers);
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
  if (registration === undefined) {
    return state;
  }
  const freed: State = {
    ...state,
    workerBusy: false,
    providerLatencies: pushSample(state.providerLatencies, event.latency),
  };
  if (state.queue.length > 0) {
    context.schedule(50, { type: 'dequeue' });
  }
  const id = event.registrationId;
  if (event.statusCode < 300) {
    context.send('worker', 'db', 'ok', 80);
    context.log(
      'worker',
      'ok',
      `#${String(id)} · ${String(event.statusCode)} from provider · account created`,
    );
    return updateRegistration(freed, id, {
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
    return updateRegistration(withLatency, id, {
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
