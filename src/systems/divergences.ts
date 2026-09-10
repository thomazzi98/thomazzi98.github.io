import { findSystem } from './index';
import type { Evidence } from './schema';
import type { PatternSystemId } from './shared-patterns';

export interface DivergenceReading {
  readonly note: string;
  readonly evidence: readonly Evidence[];
}

export interface Divergence {
  readonly id: string;
  readonly topic: string;
  readonly detail: string;
  readonly systems: Readonly<Record<PatternSystemId, DivergenceReading>>;
}

const cite = (path: string, lines?: [number, number]): Evidence => ({ path, lines });

const packageManagerOf = (id: PatternSystemId): string => {
  const system = findSystem(id);
  if (system === undefined) {
    throw new Error(`The divergences expect ${id} in the registry`);
  }
  return system.repository.packageManager;
};

const cryptopayPackageManager = packageManagerOf('cryptopay');
const platformPackageManager = packageManagerOf('whatsapp-notification-platform');
const gatewayPackageManager = packageManagerOf('mini-payment-gateway');

const pairOfVersions = (first: string, second: string): string =>
  first === second ? `both on ${first}` : `${first} and ${second}`;

export const divergences: readonly Divergence[] = [
  {
    id: 'workspace-tooling',
    topic: 'Workspace tooling',
    detail: `CryptoPay and the gateway are npm workspaces (${pairOfVersions(cryptopayPackageManager, gatewayPackageManager)}). The notification platform is a pnpm workspace (${platformPackageManager}) with a single version catalog and Turborepo running the pipeline.`,
    systems: {
      cryptopay: {
        note: `npm workspaces over packages/* and apps/*, pinned to ${cryptopayPackageManager}.`,
        evidence: [cite('package.json', [12, 20])],
      },
      'whatsapp-notification-platform': {
        note: `pnpm workspace over apps/*, packages/* and tools/*, pinned to ${platformPackageManager}, with Turborepo running the pipeline.`,
        evidence: [
          cite('pnpm-workspace.yaml', [1, 4]),
          cite('docs/adr/0001-monorepo-with-pnpm-and-turborepo.md'),
        ],
      },
      'mini-payment-gateway': {
        note: `npm workspaces over packages/* and apps/*, pinned to ${gatewayPackageManager}.`,
        evidence: [cite('package.json', [13, 21])],
      },
    },
  },
  {
    id: 'composition',
    topic: 'Composition',
    detail:
      'CryptoPay and the gateway construct everything in a hand-written composition root, in dependency order, with no container. The notification platform uses NestJS dependency injection over Fastify, and its worker builds the same module graph without an HTTP server.',
    systems: {
      cryptopay: {
        note: 'A hand-written composition root and an ADR that refuses a dependency injection framework.',
        evidence: [cite('docs/adr/0008-no-dependency-injection-framework.md')],
      },
      'whatsapp-notification-platform': {
        note: 'NestJS over the Fastify adapter for the API; the worker creates the same application context without a server.',
        evidence: [
          cite('apps/api/src/bootstrap.ts', [40, 52]),
          cite('apps/worker/src/bootstrap.ts', [8, 29]),
        ],
      },
      'mini-payment-gateway': {
        note: 'A composition root that builds environment, logger and database explicitly, in dependency order, with no container.',
        evidence: [cite('apps/api/src/composition-root.ts', [15, 33])],
      },
    },
  },
  {
    id: 'data-access',
    topic: 'Data access',
    detail:
      'CryptoPay and the gateway use raw node-postgres with hand-written SQL migrations (17 and 4). The notification platform uses Drizzle as a query builder over pg, with nine hand-written SQL migrations that carry the trigger, the policies and the composite keys.',
    systems: {
      cryptopay: {
        note: 'Raw node-postgres through one database module and 17 hand-written SQL migrations.',
        evidence: [cite('apps/api/src/infrastructure/persistence/database.ts')],
      },
      'whatsapp-notification-platform': {
        note: 'Drizzle as a query builder over the pg pool; the nine migrations stay hand-written SQL.',
        evidence: [
          cite('docs/adr/0004-drizzle-with-hand-written-sql.md'),
          cite('packages/database/src/connection.ts', [1, 6]),
        ],
      },
      'mini-payment-gateway': {
        note: 'Raw node-postgres; every tenant-scoped transaction sets app.organization_id before it works.',
        evidence: [cite('apps/api/src/infrastructure/persistence/database.ts', [51, 62])],
      },
    },
  },
  {
    id: 'frontend',
    topic: 'Frontend',
    detail:
      'CryptoPay ships a Next 16 App Router dashboard and hosted checkout with a server-side BFF that keeps the API key in an httpOnly cookie. The notification platform ships a Vite single page application served by Caddy on the same origin as the API. The gateway has no frontend at the pinned commit.',
    systems: {
      cryptopay: {
        note: 'Next 16 dashboard and checkout; the browser reaches the API only through the BFF route that attaches the key.',
        evidence: [cite('apps/web/src/app/api/bff/[...path]/route.ts', [1, 44])],
      },
      'whatsapp-notification-platform': {
        note: 'A Vite single page application, with Caddy serving it and proxying the API on one origin.',
        evidence: [
          cite('docs/adr/0015-a-vite-single-page-application.md'),
          cite('docker/caddy/Caddyfile', [13, 59]),
        ],
      },
      'mini-payment-gateway': {
        note: 'No frontend: the whole compose file runs postgres, redis, migrate, roles, api and a test profile, and nothing serves a page.',
        evidence: [cite('docker-compose.yml', [1, 149])],
      },
    },
  },
];
