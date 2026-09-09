import type { Evidence, Tone } from './schema';

export const presences = ['present', 'partial', 'absent'] as const;

export type Presence = (typeof presences)[number];

export const presenceTone: Readonly<Record<Presence, Tone>> = {
  present: 'ok',
  partial: 'wait',
  absent: 'neutral',
};

export const patternSystemIds = [
  'cryptopay',
  'whatsapp-notification-platform',
  'mini-payment-gateway',
] as const;

export type PatternSystemId = (typeof patternSystemIds)[number];

export interface PatternPresence {
  readonly presence: Presence;
  readonly note: string;
  readonly nodes: readonly string[];
  readonly evidence: readonly Evidence[];
}

export interface SharedPattern {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly systems: Readonly<Record<PatternSystemId, PatternPresence>>;
}

const cite = (path: string, lines?: [number, number]): Evidence => ({ path, lines });

const cryptopay = {
  compose: 'docker-compose.yml',
  rolesSql: 'docker/roles.sql',
  migrationCore: 'apps/api/migrations/0001_payment_core.sql',
  migrationIdempotency: 'apps/api/migrations/0006_idempotency_scope_and_ownership.sql',
  paymentRepository: 'apps/api/src/infrastructure/persistence/payment.repository.ts',
  idempotencyRepository: 'apps/api/src/infrastructure/persistence/idempotency.repository.ts',
  migrate: 'apps/api/src/infrastructure/persistence/migrate.ts',
  broadcasterPort: 'apps/api/src/application/ports/settlement-broadcaster.port.ts',
  settlePayments: 'apps/api/src/application/settle-payments.use-case.ts',
  finalityPolicy: 'apps/api/src/domain/finality-policy.ts',
  deliverCallbacks: 'apps/api/src/application/deliver-callbacks.use-case.ts',
  webhookSignature: 'packages/shared/src/server/webhook-signature.ts',
  demoReceiver: 'apps/demo-receiver/src/main.ts',
  transitionTable: 'packages/shared/src/payment-transition-table.ts',
  stateMachineDocument: 'docs/state-machine.md',
  verifyDocs: 'scripts/verify-docs.mjs',
  scanSecrets: 'scripts/scan-secrets.mjs',
  preCommit: '.husky/pre-commit',
  ciWorkflow: '.github/workflows/ci.yml',
  eslintConfig: 'eslint.config.js',
  mandatesSpec: 'tools/eslint-mandates.spec.mjs',
  apiKey: 'apps/api/src/infrastructure/crypto/api-key.ts',
  authentication: 'apps/api/src/http/authentication.ts',
  decisionIndex: 'docs/adr/README.md',
};

const platform = {
  compose: 'docker-compose.yml',
  queueDefinitions: 'packages/queue/src/queue-definitions.ts',
  enqueueInTransaction: 'packages/queue/src/enqueue-in-transaction.ts',
  queueModule: 'packages/composition/src/queue/queue.module.ts',
  notificationStatus: 'packages/domain/src/notification/notification-status.ts',
  transitionMigration: 'packages/database/migrations/0002_notification_status_transition_guard.sql',
  statusGuardTest: 'packages/database/src/notification-status-guard.integration.test.ts',
  providerFailure: 'packages/domain/src/notification/provider-failure.ts',
  classifyFailure: 'packages/provider-whatsapp/src/classify-failure.ts',
  dispatchService: 'packages/composition/src/notification/dispatch-notification.service.ts',
  createService: 'packages/composition/src/notification/create-notification.service.ts',
  deliveryMigration: 'packages/database/migrations/0001_notification_delivery_schema.sql',
  idempotencyRepository: 'packages/database/src/repositories/idempotency-key.repository.ts',
  rowLevelSecurityMigration: 'packages/database/migrations/0007_tenant_row_level_security.sql',
  tenantScope: 'packages/database/src/tenant-scope.ts',
  tenantScopeTest: 'apps/api/src/public-api/tenant-scope.integration.test.ts',
  webhookModule: 'packages/provider-whatsapp/src/webhook.ts',
  ingestService: 'packages/composition/src/webhook/ingest-webhook.service.ts',
  inboxMigration: 'packages/database/migrations/0004_webhook_delivery_inbox.sql',
  dependencyCruiser: '.dependency-cruiser.cjs',
  purityTest: 'packages/domain/src/purity.test.ts',
  verifyDocumentation: 'tools/scripts/verify-documentation.mjs',
  openApiTest: 'apps/api/src/public-api/openapi.integration.test.ts',
  verifySecrets: 'tools/scripts/verify-secrets.mjs',
  ciWorkflow: '.github/workflows/ci.yml',
  roleScript: 'docker/postgres/init/01-create-application-role.sh',
  apiKeySecurity: 'packages/security/src/api-key.ts',
  apiKeyGuard: 'apps/api/src/http/authentication/api-key.guard.ts',
  bootstrapCli: 'packages/queue/src/cli/bootstrap.ts',
  databaseBootstrap: 'packages/database/src/bootstrap.ts',
  decisionIndex: 'docs/adr/README.md',
};

const gateway = {
  compose: 'docker-compose.yml',
  environment: 'apps/api/src/infrastructure/configuration/environment.ts',
  apiPackage: 'apps/api/package.json',
  transitionTable: 'apps/api/src/domain/payment/payment-transition-table.ts',
  stateMachine: 'apps/api/src/domain/payment/payment-state-machine.ts',
  migrationTenancy: 'apps/api/migrations/0001_identity_and_tenancy.sql',
  migrationIsolation: 'apps/api/migrations/0002_tenant_isolation.sql',
  migrationPayments: 'apps/api/migrations/0003_payments.sql',
  migrationIdempotency: 'apps/api/migrations/0004_idempotency.sql',
  stateMachineDocument: 'docs/state-machine.md',
  verifyDocs: 'scripts/verify-docs.mjs',
  providerOutcome: 'apps/api/src/domain/provider/provider-outcome.ts',
  appmaxProvider: 'apps/api/src/infrastructure/providers/appmax/appmax-provider.ts',
  appmaxMappings: 'apps/api/src/infrastructure/providers/appmax/appmax-mappings.ts',
  paymentCreation: 'apps/api/src/infrastructure/persistence/payment-creation.repository.ts',
  idempotencyIntegration: 'apps/api/src/infrastructure/persistence/idempotency.integration.test.ts',
  tenantIntegration: 'apps/api/src/infrastructure/persistence/tenant-isolation.integration.test.ts',
  rolesSql: 'docker/roles.sql',
  eslintConfig: 'eslint.config.js',
  compositionRoot: 'apps/api/src/composition-root.ts',
  scanSecrets: 'scripts/scan-secrets.mjs',
  installHooks: 'scripts/install-git-hooks.mjs',
  sharedApiKey: 'packages/shared/src/server/api-key.ts',
  authenticate: 'apps/api/src/application/authenticate-api-key.ts',
  migrate: 'apps/api/src/infrastructure/persistence/migrate.ts',
  migrateCli: 'apps/api/src/infrastructure/persistence/migrate-cli.ts',
};

export const sharedPatterns: readonly SharedPattern[] = [
  {
    id: 'postgres-only-store',
    name: 'Postgres as the only durable store and queue',
    description:
      'Everything durable lives in one PostgreSQL: domain rows, work queues, cursors, claims and rate windows. There is no broker and no cache in the write path, so a job and the row that caused it commit or roll back together, and there is no second system for the first one to disagree with.',
    systems: {
      cryptopay: {
        presence: 'present',
        note: 'Two queue tables sit beside the payments: payment_evaluation_queue is claimed with FOR UPDATE SKIP LOCKED under a lease, and webhook_deliveries is an outbox written in the same transaction as the status change.',
        nodes: ['postgres', 'evaluation-queue', 'webhook-outbox'],
        evidence: [
          cite('docs/adr/0001-postgres-as-the-only-durable-store.md'),
          cite(cryptopay.migrationCore, [203, 211]),
          cite(cryptopay.paymentRepository, [636, 655]),
        ],
      },
      'whatsapp-notification-platform': {
        presence: 'present',
        note: 'pg-boss keeps its five queues in a schema of the same Postgres 17 that holds tenants, notifications, the webhook inbox and the GCRA rate limit buckets, and a job is sent inside the caller transaction.',
        nodes: ['postgres', 'job-queue', 'queue-package'],
        evidence: [
          cite('docs/adr/0003-postgres-as-the-only-datastore.md'),
          cite(platform.enqueueInTransaction, [19, 31]),
          cite(platform.queueDefinitions, [13, 78]),
        ],
      },
      'mini-payment-gateway': {
        presence: 'partial',
        note: 'PostgreSQL 18.4 is the only durable store, but there is no queue and no worker yet, and Redis is provisioned in compose and required by the configuration schema while no code connects to it.',
        nodes: ['postgres', 'redis'],
        evidence: [
          cite(gateway.compose, [4, 32]),
          cite(gateway.compose, [34, 46]),
          cite(gateway.environment, [16, 16]),
          cite(gateway.apiPackage, [9, 19]),
        ],
      },
    },
  },
  {
    id: 'table-driven-state-machine',
    name: 'Table-driven state machines with generated documentation',
    description:
      'The lifecycle of a payment or a notification is one table of allowed edges, read by the code that decides transitions instead of being spread across branches. Where a document describes the lifecycle it is rendered from that same table and compared by a script, so the documented lifecycle cannot drift from the enforced one.',
    systems: {
      cryptopay: {
        presence: 'present',
        note: 'packages/shared declares the payment and settlement transition tables, the state machines read them, and scripts/verify-docs.mjs renders docs/state-machine.md from the compiled table and fails when the committed file differs.',
        nodes: ['shared', 'chain-worker'],
        evidence: [
          cite(cryptopay.transitionTable, [1, 21]),
          cite(cryptopay.verifyDocs, [1, 30]),
          cite(cryptopay.stateMachineDocument),
        ],
      },
      'whatsapp-notification-platform': {
        presence: 'partial',
        note: 'notification-status.ts is the table, every repository write is UPDATE ... WHERE status = expected, and a BEFORE UPDATE trigger enforces a seeded copy that a drift test compares; no document is generated from the table, and verify:docs checks links, mermaid blocks, placeholders and the decision index instead.',
        nodes: ['domain', 'database-package', 'postgres'],
        evidence: [
          cite(platform.notificationStatus, [33, 42]),
          cite(platform.transitionMigration, [46, 76]),
          cite(platform.statusGuardTest, [105, 134]),
          cite(platform.verifyDocumentation, [35, 103]),
        ],
      },
      'mini-payment-gateway': {
        presence: 'present',
        note: 'PAYMENT_TRANSITIONS is read by decideTransition, seeded into legal_payment_transitions behind a composite foreign key and a deferred trigger, and rendered into docs/state-machine.md, which scripts/verify-docs.mjs compares byte for byte.',
        nodes: ['domain-payment', 'postgres'],
        evidence: [
          cite(gateway.transitionTable, [1, 12]),
          cite(gateway.stateMachine, [53, 81]),
          cite(gateway.migrationPayments, [243, 276]),
          cite(gateway.verifyDocs, [136, 159]),
          cite(gateway.stateMachineDocument),
        ],
      },
    },
  },
  {
    id: 'unknown-outcome',
    name: 'Unknown outcomes as a first-class result',
    description:
      'A call that may or may not have taken effect is reported as its own result instead of being folded into failure. Nothing retries or fails over on that result until a read of authoritative state says what happened, because guessing in either direction produces a double charge, a double send or a lost message.',
    systems: {
      cryptopay: {
        presence: 'present',
        note: 'The broadcaster answers accepted, rejected or indeterminate; an indeterminate submit keeps its sequence number and its row and is resolved by asking the chain on the next tick, and the finality gate holds a payment while a second provider is unavailable or contradicts.',
        nodes: ['settlement-worker', 'chain-adapters', 'chain-second-opinion'],
        evidence: [
          cite(cryptopay.broadcasterPort, [60, 92]),
          cite(cryptopay.settlePayments, [109, 135]),
          cite(cryptopay.settlePayments, [540, 558]),
          cite(cryptopay.finalityPolicy, [60, 83]),
        ],
      },
      'whatsapp-notification-platform': {
        presence: 'present',
        note: 'Five failure codes form the unknown-outcome set, the tenant chooses RETRY or FAIL_CLOSED, an unresolved attempt is settled before any new send, and a refused connection is deliberately kept out of the set because nothing was written.',
        nodes: ['domain', 'worker', 'provider-whatsapp'],
        evidence: [
          cite(platform.providerFailure, [72, 91]),
          cite(platform.dispatchService, [335, 391]),
          cite(platform.classifyFailure, [126, 141]),
        ],
      },
      'mini-payment-gateway': {
        presence: 'present',
        note: 'unknown_outcome is the default class for a timeout, a 5xx, an unreadable body or an unclassified status, and unknown is a payment status; the six edges out of it all demand an authenticated read or an operator, and nothing produces them yet.',
        nodes: ['domain-provider', 'domain-payment', 'appmax-adapter'],
        evidence: [
          cite(gateway.providerOutcome, [72, 79]),
          cite(gateway.providerOutcome, [125, 131]),
          cite(gateway.appmaxProvider, [177, 183]),
          cite(gateway.transitionTable, [154, 190]),
        ],
      },
    },
  },
  {
    id: 'idempotency-unique-index',
    name: 'Idempotency enforced by a unique index',
    description:
      'A repeated request is recognised by a claim row the database refuses to duplicate, not by a lookup the application performs first. The claim is scoped to the tenant and the environment, written in the same transaction as the work, and carries enough state to tell a replay from a request still in progress.',
    systems: {
      cryptopay: {
        presence: 'present',
        note: 'idempotency_keys is keyed by merchant, environment and key and reserved with INSERT ... ON CONFLICT DO UPDATE; an owner token proves which attempt may write the response, and the outcome is reserved, replay, in_progress or fingerprint_mismatch.',
        nodes: ['api', 'postgres'],
        evidence: [
          cite(cryptopay.migrationIdempotency, [22, 31]),
          cite(cryptopay.idempotencyRepository, [82, 117]),
          cite('apps/api/test/idempotency.spec.ts'),
        ],
      },
      'whatsapp-notification-platform': {
        presence: 'present',
        note: 'A unique index on (application_id, key) backs a claim that is IN_FLIGHT or COMPLETED, written in the create transaction and answered with idempotent-replayed: true on replay; the 24 h expiry is written and nothing enforces it yet.',
        nodes: ['api', 'database-package', 'postgres'],
        evidence: [
          cite(platform.deliveryMigration, [163, 163]),
          cite(platform.idempotencyRepository, [48, 81]),
          cite(platform.createService, [157, 169]),
          cite('docs/adr/0011-idempotency-keys.md'),
        ],
      },
      'mini-payment-gateway': {
        presence: 'present',
        note: 'UNIQUE (organization_id, environment, idempotency_key) is the whole mechanism: claim, payment and completion commit in one transaction, and fifty racing transactions with one key produce exactly one payment.',
        nodes: ['domain-idempotency', 'payment-creation-repository', 'postgres'],
        evidence: [
          cite(gateway.migrationIdempotency, [37, 45]),
          cite(gateway.paymentCreation, [74, 92]),
          cite(gateway.idempotencyIntegration, [166, 184]),
        ],
      },
    },
  },
  {
    id: 'tenant-isolation',
    name: 'Tenant isolation by row level security or database role',
    description:
      'Which rows a request may touch is decided by PostgreSQL rather than by every query remembering a predicate. The strong form is row level security under a role that cannot bypass it. The weaker form is a login role per process with grants and revokes that keep a compromised process away from tables it never needs.',
    systems: {
      cryptopay: {
        presence: 'partial',
        note: 'No row level security. Tenancy is a merchant and environment predicate carried in every query, and isolation is per process: four LOGIN roles with explicit grants and revokes, so the callback worker cannot read a payment and the chain worker cannot read a seed.',
        nodes: ['postgres', 'roles', 'api', 'chain-worker', 'callback-worker', 'settlement-worker'],
        evidence: [
          cite(cryptopay.rolesSql, [1, 37]),
          cite(cryptopay.rolesSql, [60, 67]),
          cite(cryptopay.paymentRepository, [287, 312]),
        ],
      },
      'whatsapp-notification-platform': {
        presence: 'present',
        note: 'API-key requests run as platform_tenant, a role that cannot log in, entered with SET LOCAL ROLE and set_config for one transaction, with USING and WITH CHECK policies on every table that carries application_id; the worker, webhook ingestion and the dashboard run as the login role by design, so the backstop covers the request path only.',
        nodes: ['api', 'database-package', 'postgres'],
        evidence: [
          cite(platform.rowLevelSecurityMigration, [56, 86]),
          cite(platform.tenantScope, [28, 41]),
          cite(platform.tenantScopeTest, [209, 251]),
          cite('docs/adr/0014-row-level-security-as-a-backstop.md'),
        ],
      },
      'mini-payment-gateway': {
        presence: 'present',
        note: 'Every tenant table enables row level security with USING and WITH CHECK on current_organization_id(); the application role owns nothing and holds NOBYPASSRLS, so an unscoped query returns zero rows, and a registry test fails when a table with organization_id has no policy.',
        nodes: ['postgres', 'roles', 'api'],
        evidence: [
          cite(gateway.migrationIsolation, [8, 20]),
          cite(gateway.migrationIsolation, [76, 107]),
          cite(gateway.rolesSql, [21, 34]),
          cite(gateway.tenantIntegration, [231, 275]),
        ],
      },
    },
  },
  {
    id: 'verified-webhooks',
    name: 'Signed or verified webhooks',
    description:
      'A callback that crosses a trust boundary carries a message authentication code over the exact bytes sent, with a timestamp and a constant-time comparison, and the receiver deduplicates on an identifier that survives retries. Where the other side signs nothing, the design says so and refuses to let the unsigned message move money.',
    systems: {
      cryptopay: {
        presence: 'present',
        note: 'Outbound callbacks follow Standard Webhooks: webhook-id, webhook-timestamp and webhook-signature v1 over id.timestamp.body with HMAC-SHA256, verified in constant time across every active secret; the bundled receiver verifies with the same module and deduplicates on webhook-id.',
        nodes: [
          'callback-worker',
          'webhook-outbox',
          'merchant-endpoint',
          'demo-receiver',
          'shared',
        ],
        evidence: [
          cite(cryptopay.webhookSignature, [96, 146]),
          cite(cryptopay.deliverCallbacks, [21, 29]),
          cite(cryptopay.demoReceiver, [106, 131]),
          cite('docs/adr/0006-standard-webhooks.md'),
        ],
      },
      'whatsapp-notification-platform': {
        presence: 'present',
        note: 'Inbound provider callbacks are verified before parsing: HMAC-SHA512 over the raw bytes with a per-session key encrypted at rest, a 300 s timestamp tolerance, one indistinguishable 401, and an inbox keyed by the provider event id with ON CONFLICT DO NOTHING.',
        nodes: ['api', 'provider-whatsapp', 'security', 'waha'],
        evidence: [
          cite(platform.webhookModule, [112, 162]),
          cite(platform.ingestService, [101, 133]),
          cite(platform.inboxMigration),
          cite('docs/adr/0017-webhook-ingestion-and-inbox.md'),
        ],
      },
      'mini-payment-gateway': {
        presence: 'absent',
        note: 'Nothing signs or verifies a webhook and no webhook route exists at the pinned commit. The code treats Appmax webhooks as unsigned, so an event may only prompt a read, and every transition into a funded status requires authenticated_provider_read in the transition table and in a CHECK constraint.',
        nodes: ['appmax-adapter', 'domain-payment', 'postgres'],
        evidence: [
          cite(gateway.transitionTable, [82, 91]),
          cite(gateway.migrationPayments, [232, 237]),
          cite(gateway.appmaxMappings, [88, 108]),
        ],
      },
    },
  },
  {
    id: 'layering-by-tooling',
    name: 'Layering enforced by tooling',
    description:
      'The domain cannot import infrastructure, applications reach adapters only through a composition layer, and browser-safe packages cannot import node builtins. Each rule is a lint or dependency-cruiser check that fails the build, so the boundary is enforced rather than remembered.',
    systems: {
      cryptopay: {
        presence: 'present',
        note: 'no-restricted-imports zones keep viem and Prisma out of the domain and node builtins out of the browser-safe shared entry, a further rule bans chain vocabulary such as blockHash, logIndex, topics, abi, chainId and nonce from domain and application, and tools/eslint-mandates.spec.mjs runs the real configuration against fixtures.',
        nodes: ['shared', 'chain-adapters', 'api'],
        evidence: [
          cite(cryptopay.eslintConfig, [220, 227]),
          cite(cryptopay.mandatesSpec),
          cite('docs/adr/0004-ledger-shaped-chain-port.md'),
        ],
      },
      'whatsapp-notification-platform': {
        presence: 'present',
        note: 'Each package manifest declares what it may depend on and eight dependency-cruiser rules run in CI: the domain reaches nothing, only the worker may import the queue, applications go through composition; a purity test fails the moment the domain gains a runtime dependency.',
        nodes: ['domain', 'composition', 'queue-package'],
        evidence: [
          cite(platform.dependencyCruiser, [10, 78]),
          cite(platform.purityTest, [16, 35]),
          cite('docs/adr/0002-layered-packages-over-a-framework.md'),
        ],
      },
      'mini-payment-gateway': {
        presence: 'present',
        note: 'ESLint no-restricted-imports: the domain may not import pg, undici, fastify, pino or anything under infrastructure or interface, the application layer may import only ports, and the browser-safe surface of shared may not import node builtins.',
        nodes: [
          'domain-payment',
          'domain-provider',
          'domain-idempotency',
          'br-code-validator',
          'shared',
        ],
        evidence: [
          cite(gateway.eslintConfig, [139, 156]),
          cite(gateway.eslintConfig, [177, 195]),
          cite(gateway.compositionRoot, [15, 19]),
        ],
      },
    },
  },
  {
    id: 'docs-verified-by-scripts',
    name: 'Documentation verified by scripts',
    description:
      'A script reads the documentation the way a reader would and fails when it lies: a generated table that differs from the code, a route the API document does not describe, a link to a file that does not exist, a decision record missing from its index. The check runs where the tests run, so prose cannot rot silently.',
    systems: {
      cryptopay: {
        presence: 'present',
        note: 'npm run docs:check regenerates docs/state-machine.md from the compiled transition table and fails on any difference; the static CI job runs it after the secret scan.',
        nodes: ['shared'],
        evidence: [
          cite(cryptopay.verifyDocs, [1, 30]),
          cite(cryptopay.stateMachineDocument),
          cite(cryptopay.ciWorkflow, [18, 39]),
        ],
      },
      'whatsapp-notification-platform': {
        presence: 'present',
        note: 'pnpm verify:docs checks every tracked Markdown file for dead links, mermaid blocks that do not parse, placeholders and decision records missing from docs/adr/README.md, and a test fails if a /v1 route exists without being described in the OpenAPI document or is described without existing.',
        nodes: ['contracts'],
        evidence: [
          cite(platform.verifyDocumentation, [35, 103]),
          cite(platform.openApiTest, [61, 95]),
          cite(platform.ciWorkflow, [59, 71]),
        ],
      },
      'mini-payment-gateway': {
        presence: 'present',
        note: 'node scripts/verify-docs.mjs renders the transition table and compares docs/state-machine.md byte for byte; with no CI workflow committed it runs through npm run docs:check and nothing runs it automatically.',
        nodes: ['domain-payment'],
        evidence: [
          cite(gateway.verifyDocs, [136, 159]),
          cite(gateway.stateMachineDocument, [5, 5]),
          cite(gateway.installHooks, [19, 23]),
        ],
      },
    },
  },
  {
    id: 'secret-scanning',
    name: 'Secret scanning',
    description:
      'A bespoke scanner knows the shape of the credentials the system itself issues and refuses a commit or a build that contains one. It runs in a git hook, in CI where CI exists, and in one repository over the whole history with a self-test of its own detection before each run.',
    systems: {
      cryptopay: {
        presence: 'present',
        note: 'scripts/scan-secrets.mjs runs first in the pre-commit hook and first in the static CI job, and a separate CI job runs gitleaks over the full history.',
        nodes: [],
        evidence: [
          cite(cryptopay.scanSecrets),
          cite(cryptopay.preCommit),
          cite(cryptopay.ciWorkflow, [81, 92]),
        ],
      },
      'whatsapp-notification-platform': {
        presence: 'present',
        note: 'tools/scripts/verify-secrets.mjs reads every tracked file and every commit, tells a real secret from a fixture by entropy and self-tests its detection before each run; the verify CI job checks out with full depth for it.',
        nodes: [],
        evidence: [
          cite(platform.verifySecrets, [43, 80]),
          cite(platform.verifySecrets, [164, 200]),
          cite(platform.ciWorkflow, [28, 33]),
        ],
      },
      'mini-payment-gateway': {
        presence: 'partial',
        note: 'scripts/scan-secrets.mjs scans tracked files for ten credential shapes, including the gateway key format mpg_live_ and mpg_test_, and never prints the match; it runs by hand through npm run scan:secrets, because the installed pre-commit hook runs lint-staged only and there is no CI.',
        nodes: [],
        evidence: [
          cite(gateway.scanSecrets, [1, 45]),
          cite(gateway.scanSecrets, [128, 139]),
          cite(gateway.installHooks, [19, 23]),
        ],
      },
    },
  },
  {
    id: 'least-privilege-roles',
    name: 'Least-privilege database roles',
    description:
      'The application does not connect as the owner of its schema. A one-shot step after the migrations creates login roles with explicit grants and revokes, so each process holds the privileges its job needs and a SQL injection cannot add a table or read a seed.',
    systems: {
      cryptopay: {
        presence: 'present',
        note: 'docker/roles.sql, applied by the roles job after migrate, creates four LOGIN roles: the API on every table minus settlement writes, the chain worker without api_keys or wallet_seeds, the callback worker with the outbox, the attempts and the secrets only, and the settlement worker as the only role granted wallet_seeds by name. No test asserts the refusals, although the script header says one does.',
        nodes: ['roles', 'postgres', 'api', 'chain-worker', 'callback-worker', 'settlement-worker'],
        evidence: [
          cite(cryptopay.rolesSql, [1, 37]),
          cite(cryptopay.rolesSql, [39, 95]),
          cite(cryptopay.compose, [72, 91]),
        ],
      },
      'whatsapp-notification-platform': {
        presence: 'present',
        note: 'Three roles: platform_system owns the schema, platform_application logs in with statement_timeout 5 s and idle_in_transaction_session_timeout 10 s, and platform_tenant cannot log in and receives the narrowest grants that serve the public API with no DELETE; the pg-boss client in both processes still connects as the schema owner.',
        nodes: ['postgres', 'migrate', 'api', 'worker'],
        evidence: [
          cite(platform.roleScript, [10, 31]),
          cite(platform.rowLevelSecurityMigration, [24, 44]),
          cite(platform.queueModule, [36, 50]),
        ],
      },
      'mini-payment-gateway': {
        presence: 'present',
        note: 'One role, payment_gateway_application, with NOSUPERUSER and NOBYPASSRLS, REVOKE CREATE on schema public and no access to schema_migrations, re-applied by the roles job after every migration run; the integration suite asserts that CREATE TABLE and reading schema_migrations both fail.',
        nodes: ['roles', 'postgres', 'api'],
        evidence: [
          cite(gateway.rolesSql, [21, 34]),
          cite(gateway.rolesSql, [32, 57]),
          cite(gateway.compose, [64, 85]),
          cite(gateway.tenantIntegration, [70, 84]),
        ],
      },
    },
  },
  {
    id: 'decision-records',
    name: 'Decision records with costs',
    description:
      'Each significant choice is written as a numbered record naming the decision, the alternatives refused and the cost accepted, and kept next to the code at the commit that made it. The cost section is what keeps the record honest: a decision with no cost was not a decision.',
    systems: {
      cryptopay: {
        presence: 'present',
        note: 'Nine numbered records under docs/adr, each with alternatives and a cost, indexed in docs/adr/README.md.',
        nodes: [],
        evidence: [
          cite(cryptopay.decisionIndex),
          cite('docs/adr/0001-postgres-as-the-only-durable-store.md'),
          cite('docs/adr/0009-per-family-address-derivation.md'),
        ],
      },
      'whatsapp-notification-platform': {
        presence: 'present',
        note: 'Eighteen numbered records under docs/adr, each with alternatives and a cost; verify:docs fails when a record is missing from the index.',
        nodes: [],
        evidence: [
          cite(platform.decisionIndex),
          cite(platform.verifyDocumentation, [81, 103]),
          cite('docs/adr/0018-no-else-and-no-abbreviations.md'),
        ],
      },
      'mini-payment-gateway': {
        presence: 'absent',
        note: 'No decision record files. The rationale for tenant isolation, the lifecycle table, evidence classes and the outcome taxonomy lives in module headers and SQL comments, which is where this site cites it.',
        nodes: [],
        evidence: [
          cite(gateway.migrationIsolation, [1, 6]),
          cite(gateway.transitionTable, [1, 12]),
          cite(gateway.providerOutcome, [1, 8]),
          cite(gateway.rolesSql, [1, 9]),
        ],
      },
    },
  },
  {
    id: 'api-keys-peppered-hmac',
    name: 'API keys as a public identifier plus a peppered secret',
    description:
      'An API key is a prefix, a public identifier indexed in clear and a random secret that is never stored. The database keeps HMAC-SHA256 of the secret under a pepper held only in configuration, the comparison runs in constant time, and a malformed token is refused before it reaches the database.',
    systems: {
      cryptopay: {
        presence: 'present',
        note: 'cp_<env>_<ULID>_<secret>: the environment travels in the key, the digest is HMAC-SHA256 under a pepper, the compare is constant time with the length checked first, and the rate window is counted only after the key is known to be valid.',
        nodes: ['api', 'merchant'],
        evidence: [
          cite(cryptopay.apiKey, [7, 24]),
          cite(cryptopay.apiKey, [62, 96]),
          cite(cryptopay.authentication, [67, 89]),
        ],
      },
      'whatsapp-notification-platform': {
        presence: 'present',
        note: 'wnp_{live|test}_ plus a twelve-character identifier and a thirty-two-character secret from a rejection-sampled alphabet; the identifier is indexed in clear and the secret is stored as HMAC-SHA256 under a pepper that lives in configuration, never in the database.',
        nodes: ['api', 'security', 'client'],
        evidence: [
          cite(platform.apiKeySecurity, [12, 19]),
          cite(platform.apiKeySecurity, [55, 80]),
          cite(platform.apiKeyGuard),
          cite('docs/adr/0010-api-key-format-and-hashing.md'),
        ],
      },
      'mini-payment-gateway': {
        presence: 'present',
        note: 'The verifier is HMAC-SHA256 of identifier.secret under a pepper outside the database, resolved through a SECURITY DEFINER function that returns the hash and never a secret; an unknown identifier still pays for one HMAC and lifecycle checks run only after the secret matches. No route calls it yet.',
        nodes: ['authenticator', 'shared', 'postgres'],
        evidence: [
          cite(gateway.sharedApiKey, [111, 142]),
          cite(gateway.authenticate, [30, 54]),
          cite(gateway.migrationIsolation, [25, 60]),
        ],
      },
    },
  },
  {
    id: 'migrate-before-app',
    name: 'Migrations as a one-shot barrier before the application',
    description:
      'Compose runs a migrate job to completion before any long-running process starts, under an advisory lock and with a checksum per applied file, and the role grants follow the migrations because a GRANT on a table that does not exist yet fails. The application never races its own schema.',
    systems: {
      cryptopay: {
        presence: 'present',
        note: 'migrate applies the 17 SQL files in order under a session advisory lock and refuses an edited file; roles and bootstrap follow, and every service depends on all three having completed.',
        nodes: ['migrate', 'roles', 'bootstrap', 'postgres'],
        evidence: [
          cite(cryptopay.compose, [50, 64]),
          cite(cryptopay.compose, [72, 91]),
          cite(cryptopay.compose, [93, 120]),
          cite(cryptopay.migrate, [104, 130]),
        ],
      },
      'whatsapp-notification-platform': {
        presence: 'present',
        note: 'The migrate service applies migrations under an advisory lock, provisions the pg-boss schema and its queues and grants the runtime roles what they need; api and worker start only on service_completed_successfully.',
        nodes: ['migrate', 'postgres', 'api', 'worker'],
        evidence: [
          cite(platform.compose, [32, 51]),
          cite(platform.bootstrapCli, [12, 87]),
          cite(platform.databaseBootstrap, [18, 37]),
        ],
      },
      'mini-payment-gateway': {
        presence: 'present',
        note: 'The migrator applies each numbered file in its own transaction together with its schema_migrations row, serialised by an advisory lock and stopped by MigrationChecksumMismatchError; the roles job re-runs after every migration and the API waits for both.',
        nodes: ['migrate', 'roles', 'postgres', 'api'],
        evidence: [
          cite(gateway.migrate, [8, 27]),
          cite(gateway.migrate, [63, 66]),
          cite(gateway.migrateCli, [1, 41]),
          cite(gateway.compose, [48, 62]),
          cite(gateway.compose, [64, 85]),
        ],
      },
    },
  },
];

export const findPattern = (id: string): SharedPattern | undefined =>
  sharedPatterns.find((pattern) => pattern.id === id);
