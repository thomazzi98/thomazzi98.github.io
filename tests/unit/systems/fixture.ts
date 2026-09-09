import type { SystemInput } from '../../../src/systems/schema';

const cite = (path: string, lines?: [number, number]) => ({ path, lines });

export const fixtureSystem: SystemInput = {
  id: 'ledger',
  name: 'Ledger',
  shortName: 'Ledger',
  tagline: 'A fixture system for the model tests.',
  problem: ['Requests must be recorded before they are answered.'],
  thesis: 'Record first, answer second.',
  repository: {
    owner: 'thomazzi98',
    name: 'ledger',
    defaultBranch: 'main',
    pinnedCommit: 'a'.repeat(40),
    pinnedOn: '2026-09-09',
    firstCommitOn: '2026-09-01',
    commitCount: 12,
    packageManager: 'npm@11',
    runtime: 'Node.js 24',
  },
  maturity: {
    label: 'complete',
    statement: 'Every route is wired and tested.',
    evidence: [cite('README.md')],
  },
  stack: [
    {
      technology: 'postgresql',
      role: 'The only durable store.',
      evidence: [cite('docker-compose.yml')],
    },
  ],
  nodes: [
    {
      id: 'client',
      label: 'Client',
      kind: 'actor',
      purpose: 'Sends requests.',
      evidence: [cite('README.md')],
    },
    {
      id: 'api',
      label: 'API',
      kind: 'process',
      purpose: 'Accepts requests.',
      evidence: [cite('src/api.ts')],
    },
    {
      id: 'database',
      label: 'PostgreSQL',
      kind: 'store',
      purpose: 'Keeps the ledger.',
      evidence: [cite('migrations/0001.sql')],
    },
  ],
  edges: [
    {
      id: 'client-api',
      from: 'client',
      to: 'api',
      label: 'POST /entries',
      protocol: 'https',
      evidence: [cite('src/api.ts', [10, 20])],
    },
    {
      id: 'api-database',
      from: 'api',
      to: 'database',
      label: 'INSERT entry',
      protocol: 'sql',
      evidence: [cite('src/repository.ts', [5, 9])],
    },
  ],
  flows: [
    {
      id: 'record-entry',
      name: 'Record an entry',
      kind: 'request',
      summary: 'The request is written before it is answered.',
      levers: [
        {
          id: 'database',
          label: 'Database',
          options: [
            { value: 'healthy', label: 'Healthy' },
            { value: 'down', label: 'Down' },
          ],
          defaultValue: 'healthy',
        },
      ],
      steps: [
        { at: 0, ledger: 'entry.received', tone: 'flight', edge: 'client-api' },
        {
          at: 600,
          ledger: 'entry.inserted',
          tone: 'ok',
          edge: 'api-database',
          when: [{ lever: 'database', value: 'healthy' }],
          status: { machine: 'entry', value: 'recorded' },
        },
        {
          at: 600,
          ledger: 'insert.failed',
          tone: 'fault',
          node: 'database',
          when: [{ lever: 'database', value: 'down' }],
        },
        {
          at: 1200,
          ledger: 'entry.answered 201',
          tone: 'ok',
          node: 'api',
          when: [{ lever: 'database', value: 'healthy' }],
        },
        {
          at: 1200,
          ledger: 'entry.answered 503',
          tone: 'fault',
          node: 'api',
          when: [{ lever: 'database', value: 'down' }],
        },
      ],
    },
  ],
  stateMachines: [
    {
      id: 'entry',
      name: 'Entry lifecycle',
      statuses: [
        { id: 'pending', terminal: false },
        { id: 'recorded', terminal: true },
      ],
      transitions: [{ from: 'pending', to: 'recorded', trigger: 'INSERTED' }],
      evidence: [cite('src/entry.ts')],
    },
  ],
  decisions: [
    {
      id: 'postgres-only',
      title: 'PostgreSQL is the only store',
      decision: 'No broker.',
      cost: 'Polling instead of push.',
      themes: ['durability'],
      evidence: [cite('docs/adr/0001.md')],
    },
  ],
  fragments: [
    {
      id: 'insert',
      title: 'The insert',
      path: 'src/repository.ts',
      lines: [5, 9],
      language: 'ts',
      demonstrates: 'The write happens before the answer.',
    },
  ],
  verification: {
    layers: [
      {
        name: 'Unit',
        tool: 'Vitest',
        proves: 'The rules hold.',
        examples: [{ path: 'src/entry.test.ts', proves: 'Terminal statuses are closed.' }],
      },
    ],
    evidence: [cite('vitest.config.ts')],
  },
};

export const firstOf = <Item>(list: readonly Item[]): Item => {
  const item = list[0];
  if (item === undefined) {
    throw new Error('The fixture list is empty.');
  }
  return item;
};
