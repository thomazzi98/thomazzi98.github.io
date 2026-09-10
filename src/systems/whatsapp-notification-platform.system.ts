import { repositoryIdentity } from './repositories';
import { defineSystem } from './validate';

const cite = (path: string, lines?: [number, number]) => ({ path, lines });

const notificationRepository = 'packages/database/src/repositories/notification.repository.ts';
const dispatchService = 'packages/composition/src/notification/dispatch-notification.service.ts';
const createService = 'packages/composition/src/notification/create-notification.service.ts';
const maintenanceService =
  'packages/composition/src/notification/notification-maintenance.service.ts';
const ingestService = 'packages/composition/src/webhook/ingest-webhook.service.ts';
const processService = 'packages/composition/src/webhook/process-webhook.service.ts';
const sessionService = 'packages/composition/src/whatsapp/whatsapp-session.service.ts';
const rateLimitService = 'packages/composition/src/rate-limit/rate-limit.service.ts';
const wahaProvider = 'packages/provider-whatsapp/src/waha-provider.ts';
const webhookModule = 'packages/provider-whatsapp/src/webhook.ts';
const classifyFailure = 'packages/provider-whatsapp/src/classify-failure.ts';
const providerFailure = 'packages/domain/src/notification/provider-failure.ts';
const retryPolicy = 'packages/domain/src/notification/retry-policy.ts';
const acknowledgement = 'packages/domain/src/notification/delivery-acknowledgement.ts';
const notificationStatus = 'packages/domain/src/notification/notification-status.ts';
const providerPort = 'packages/domain/src/provider/whatsapp-provider.port.ts';
const tenantScope = 'packages/database/src/tenant-scope.ts';
const idempotencyRepository = 'packages/database/src/repositories/idempotency-key.repository.ts';
const sendAttemptRepository =
  'packages/database/src/repositories/notification-send-attempt.repository.ts';
const webhookDeliveryRepository =
  'packages/database/src/repositories/webhook-delivery.repository.ts';
const sessionRepository = 'packages/database/src/repositories/whatsapp-session.repository.ts';
const apiKeyRepository = 'packages/database/src/repositories/api-key.repository.ts';
const rateLimitRepository = 'packages/database/src/repositories/rate-limit.repository.ts';
const rateLimitMigration = 'packages/database/migrations/0006_rate_limit_function.sql';
const rowLevelSecurityMigration = 'packages/database/migrations/0007_tenant_row_level_security.sql';
const deliveryMigration = 'packages/database/migrations/0001_notification_delivery_schema.sql';
const transitionMigration =
  'packages/database/migrations/0002_notification_status_transition_guard.sql';
const inboxMigration = 'packages/database/migrations/0004_webhook_delivery_inbox.sql';
const queueDefinitions = 'packages/queue/src/queue-definitions.ts';
const queueClient = 'packages/queue/src/queue-client.ts';
const enqueueInTransaction = 'packages/queue/src/enqueue-in-transaction.ts';
const grantSendPrivileges = 'packages/queue/src/grant-send-privileges.ts';
const bootstrapCli = 'packages/queue/src/cli/bootstrap.ts';
const queueModule = 'packages/composition/src/queue/queue.module.ts';
const jobRunner = 'apps/worker/src/jobs/job-runner.service.ts';
const dispatchHandler = 'apps/worker/src/jobs/notification-dispatch.handler.ts';
const apiKeyGuard = 'apps/api/src/http/authentication/api-key.guard.ts';
const rateLimitGuard = 'apps/api/src/http/rate-limit/rate-limit.guard.ts';
const notificationsController = 'apps/api/src/public-api/notifications/notifications.controller.ts';
const webhookController = 'apps/api/src/public-api/webhooks/whatsapp-webhook.controller.ts';
const healthController = 'apps/api/src/health/health.controller.ts';
const problemFilter = 'apps/api/src/http/filters/problem-details.filter.ts';
const rawBody = 'apps/api/src/http/raw-body.ts';
const correlationHook = 'apps/api/src/http/correlation/correlation.hook.ts';
const apiBootstrap = 'apps/api/src/bootstrap.ts';
const compose = 'docker-compose.yml';
const caddyfile = 'docker/caddy/Caddyfile';
const workspace = 'pnpm-workspace.yaml';
const environmentSchema = 'packages/configuration/src/environment-schema.ts';
const apiKeySecurity = 'packages/security/src/api-key.ts';
const apiKeyFormat = 'packages/domain/src/tenant/api-key-format.ts';
const apiKeyService = 'packages/composition/src/tenancy/api-key.service.ts';
const logger = 'packages/observability/src/logger.ts';
const connection = 'packages/database/src/connection.ts';
const databaseHealth = 'packages/composition/src/database/database-health.service.ts';
const queueHealth = 'packages/composition/src/queue/queue-health.service.ts';
const stubServer = 'tools/waha-stub/src/create-stub-server.ts';
const stubFailureModes = 'tools/waha-stub/src/failure-modes.ts';
const stubWebhookSender = 'tools/waha-stub/src/webhook-sender.ts';
const dependencyCruiser = '.dependency-cruiser.cjs';
const dispatchIntegrationTest = 'apps/worker/src/jobs/notification-dispatch.integration.test.ts';
const webhookProcessTest = 'apps/worker/src/jobs/webhook-process.integration.test.ts';
const notificationsApiTest = 'apps/api/src/public-api/notifications.integration.test.ts';
const webhooksApiTest = 'apps/api/src/public-api/webhooks.integration.test.ts';
const tenantScopeTest = 'apps/api/src/public-api/tenant-scope.integration.test.ts';
const tenantIsolationTest = 'packages/database/src/tenant-isolation.integration.test.ts';
const statusGuardTest = 'packages/database/src/notification-status-guard.integration.test.ts';
const healthTest = 'apps/api/src/health/health.controller.test.ts';
const ciWorkflow = '.github/workflows/ci.yml';

export const system = defineSystem({
  id: 'whatsapp-notification-platform',
  name: 'WhatsApp Notification Platform',
  shortName: 'WNP',
  tagline:
    'Multi-tenant WhatsApp delivery that accepts in one transaction, sends from a worker, and lets provider receipts tell the truth.',
  problem: [
    'An application that sends WhatsApp messages through a gateway gets a synchronous call that can fail for a dozen reasons, no retry policy, no record, and no answer to what happened to the message it sent on Tuesday. The gateway itself is an unofficial integration whose account can be banned for sending like a machine.',
    'The platform sits in between. It accepts a notification, answers 202 in one database transaction that also enqueues the dispatch job, and hands delivery to a worker that paces sends, retries what deserves retrying, and refuses what cannot succeed. Provider receipts, not hope, move a notification to DELIVERED.',
    'Tenants share one Postgres. Every query is scoped by application, composite foreign keys make a cross-tenant reference impossible to write, and row level security under a role that cannot log in turns a forgotten predicate into an empty result instead of a leak.',
  ],
  thesis:
    'Delivery is at-least-once and the platform says so: it records an attempt before the network call, settles an unknown outcome before acting again, and merges receipts by maximum so it never claims more than it knows.',
  repository: {
    ...repositoryIdentity('whatsapp-notification-platform'),
    pinnedOn: '2026-09-09',
    firstCommitOn: '2026-09-07',
    commitCount: 46,
    license: 'MIT',
    packageManager: 'pnpm@11.26.0',
    runtime: 'Node.js 24',
  },
  maturity: {
    label: 'complete',
    statement:
      'Every public route is served, described by a generated OpenAPI document that a test compares against the router, and exercised by four test layers (unit, component, integration, end to end), the last a browser suite against the production images. The provider path is validated against a deterministic stub in CI; the README and the performance notes state the limits that remain: at-least-once delivery, a rate limiter that fails open, no load test, and no measurement against the real gateway.',
    evidence: [
      cite('apps/api/src/public-api/openapi.integration.test.ts', [61, 95]),
      cite(ciWorkflow, [23, 210]),
      cite('README.md', [176, 192]),
      cite('README.md', [233, 282]),
      cite('docs/performance.md', [165, 178]),
    ],
  },
  stack: [
    {
      technology: 'nodejs',
      role: 'Runtime for the API, the worker, the migrate barrier and the WAHA stub; Node 24 on a Debian slim image.',
      evidence: [
        cite('package.json', [8, 11]),
        cite('tools/docker/node-service.Dockerfile', [8, 17]),
      ],
    },
    {
      technology: 'typescript',
      role: 'Every package and application on one strict base configuration. Layering is enforced by manifests and dependency-cruiser; no tsconfig declares project references.',
      evidence: [cite(workspace, [39, 39]), cite('tsconfig.base.json')],
    },
    {
      technology: 'pnpm',
      role: 'Workspace manager with a single version catalog, so two packages cannot drift onto different versions of Zod or Drizzle.',
      evidence: [cite('package.json', [7, 7]), cite(workspace, [1, 4]), cite(workspace, [35, 37])],
    },
    {
      technology: 'nestjs',
      role: 'Dependency injection for both processes; the worker builds the same module graph as the API without an HTTP server.',
      evidence: [
        cite(workspace, [55, 58]),
        cite(apiBootstrap, [40, 52]),
        cite('apps/worker/src/bootstrap.ts', [8, 29]),
      ],
    },
    {
      technology: 'fastify',
      role: 'HTTP engine under the Nest adapter, pinned to 5.12.3 by a workspace override, plus the WAHA stub server.',
      evidence: [
        cite(workspace, [24, 29]),
        cite(apiBootstrap, [25, 38]),
        cite(stubServer, [69, 74]),
      ],
    },
    {
      technology: 'postgresql',
      role: 'The only datastore: domain tables, the job queue, the GCRA rate limiter, and the webhook inbox, on Postgres 17.',
      evidence: [cite(compose, [7, 30]), cite('docs/adr/0003-postgres-as-the-only-datastore.md')],
    },
    {
      technology: 'drizzle',
      role: 'Query builder over pg with nine hand-written SQL migrations that carry the trigger, the policies and the composite keys.',
      evidence: [
        cite(workspace, [48, 50]),
        cite(connection, [1, 6]),
        cite('docs/adr/0004-drizzle-with-hand-written-sql.md'),
      ],
    },
    {
      technology: 'pg-boss',
      role: 'Job queue in the pgboss schema; jobs are sent through the caller Drizzle transaction so a notification and its dispatch commit together.',
      evidence: [
        cite(workspace, [71, 71]),
        cite(enqueueInTransaction, [19, 31]),
        cite(queueClient, [28, 46]),
      ],
    },
    {
      technology: 'zod',
      role: 'Validates the environment at boot, every request body and parameter, provider responses and job payloads; the OpenAPI document is derived from the same schemas.',
      evidence: [
        cite(workspace, [46, 46]),
        cite(environmentSchema, [31, 161]),
        cite(wahaProvider, [31, 67]),
        cite('packages/queue/src/job-payloads.ts', [9, 19]),
      ],
    },
    {
      technology: 'pino',
      role: 'Structured logs with a 25-name event vocabulary, correlation context stamped on every line, redaction, and a bounded error serializer.',
      evidence: [
        cite(workspace, [47, 47]),
        cite(logger, [102, 141]),
        cite('packages/observability/src/log-events.ts', [6, 36]),
      ],
    },
    {
      technology: 'react',
      role: 'Dashboard as a Vite single page application with React Router and TanStack Query, built to static files.',
      evidence: [cite(workspace, [77, 83]), cite('apps/web/src/main.tsx', [1, 38])],
    },
    {
      technology: 'caddy',
      role: 'Serves the built dashboard and proxies /v1, /dashboard, /webhooks, /health and /ready to the API, so there is one origin and no CORS.',
      evidence: [cite(caddyfile, [13, 59]), cite('tools/docker/web.Dockerfile', [31, 34])],
    },
    {
      technology: 'vitest',
      role: 'Unit, component and integration runner; integration projects start one Postgres per run through Testcontainers.',
      evidence: [
        cite(workspace, [40, 40]),
        cite('apps/worker/vitest.config.mts'),
        cite('packages/testing/src/postgres-harness.ts', [29, 60]),
      ],
    },
    {
      technology: 'playwright',
      role: 'End-to-end suite against the production images with the stub provider, with axe scans over each route.',
      evidence: [
        cite(workspace, [104, 107]),
        cite('apps/end-to-end/playwright.config.ts', [13, 34]),
      ],
    },
  ],
  nodes: [
    {
      id: 'client',
      label: 'Integrating application',
      kind: 'actor',
      purpose:
        'A machine caller that creates and reads notifications over /v1 with a bearer API key.',
      notes: [
        'Optional Idempotency-Key header. The claim is written with an expiry 24 h ahead that nothing enforces yet.',
      ],
      evidence: [cite('README.md', [24, 33]), cite(notificationsController, [50, 53])],
    },
    {
      id: 'operator',
      label: 'Operator browser',
      kind: 'actor',
      purpose:
        'A person who signs in, connects a WhatsApp number by scanning a code, and watches deliveries.',
      notes: [
        'Session cookie wnp_session, HttpOnly and SameSite=Lax, plus an x-csrf-token header on every unsafe method.',
        'Session lifecycle endpoints exist only on the dashboard surface: pairing needs a phone in front of a screen.',
      ],
      evidence: [
        cite('apps/web/src/api/client.ts', [99, 140]),
        cite('apps/api/src/dashboard-api/authentication/authentication.controller.ts', [78, 86]),
        cite(
          'apps/api/src/dashboard-api/whatsapp-sessions/whatsapp-sessions.controller.ts',
          [33, 42],
        ),
      ],
    },
    {
      id: 'web',
      label: 'web (Caddy + SPA)',
      kind: 'frontend',
      purpose:
        'Caddy on :8080 serves the Vite bundle and reverse-proxies the API paths, so cookie, bundle and API share one origin.',
      technologies: ['caddy', 'react', 'vite', 'docker'],
      notes: [
        'Sets nosniff, X-Frame-Options DENY, Referrer-Policy and a self-only CSP; removes the Server header. No HSTS: auto_https is off and the stack is served over plain HTTP on loopback.',
        'The bundle carries no API URL; it talks to the origin it was served from.',
      ],
      evidence: [
        cite(caddyfile, [13, 59]),
        cite('tools/docker/web.Dockerfile', [27, 34]),
        cite(compose, [114, 137]),
        cite('apps/web/vite.config.ts', [7, 26]),
      ],
    },
    {
      id: 'api',
      label: 'api (NestJS on Fastify)',
      kind: 'process',
      purpose:
        'Authenticates keys and sessions, meters, validates, writes the notification and its job in one transaction, ingests provider callbacks, and drives the connection lifecycle.',
      technologies: ['nodejs', 'nestjs', 'fastify', 'zod', 'pino', 'docker'],
      notes: [
        'Answers 202 for a created notification: accepted, not delivered. Nothing on the request path talks to WhatsApp.',
        '/health checks no dependency; /ready checks database and queue and answers 503 with the reason. WAHA is deliberately absent from both.',
        'Registers its own JSON parser so /webhooks/* keeps the raw bytes the provider signed.',
        'Trusts exactly one proxy hop, the Caddy in front of it.',
      ],
      evidence: [
        cite(apiBootstrap, [17, 69]),
        cite('apps/api/src/api.module.ts', [30, 63]),
        cite(healthController, [30, 73]),
        cite(compose, [53, 107]),
      ],
    },
    {
      id: 'worker',
      label: 'worker',
      kind: 'process',
      purpose:
        'Same image as the API with a different command. Claims notifications, paces and sends them, applies receipts, and runs the repair pass every minute.',
      technologies: ['nodejs', 'nestjs', 'pg-boss', 'pino', 'docker'],
      notes: [
        'Subscribes to notification.dispatch, notification.dispatch.dead, webhook.process and maintenance.reconcile; batch size 5, polling 2 s, LISTEN/NOTIFY on top.',
        'Runs repository SQL as the login role, not under tenant scope: dispatch legitimately spans every tenant.',
        'Graceful stop waits up to 30 s for in-flight jobs; compose grants 45 s before SIGKILL.',
      ],
      evidence: [
        cite('apps/worker/src/bootstrap.ts', [16, 49]),
        cite(jobRunner, [73, 123]),
        cite(queueModule, [72, 88]),
        cite(compose, [142, 175]),
      ],
    },
    {
      id: 'migrate',
      label: 'migrate (one-shot)',
      kind: 'job',
      purpose:
        'Applies migrations under an advisory lock, provisions the queue schema and its five queues, and grants the runtime roles what they need, then exits.',
      technologies: ['nodejs', 'drizzle', 'pg-boss', 'docker'],
      notes: [
        'The API and the worker start only after this service completed successfully, which removes the race of several processes migrating at once.',
        'Grants platform_tenant SELECT and INSERT on the pgboss schema and makes the login role a member of platform_tenant on every start.',
      ],
      evidence: [
        cite(bootstrapCli, [12, 87]),
        cite('packages/database/src/bootstrap.ts', [18, 37]),
        cite(compose, [32, 51]),
      ],
    },
    {
      id: 'postgres',
      label: 'PostgreSQL 17',
      kind: 'store',
      purpose:
        'The only durable store: tenants, notifications and their timeline, send attempts, idempotency claims, the webhook inbox and the rate limit buckets.',
      technologies: ['postgresql'],
      notes: [
        'Three roles: platform_system owns the schema, platform_application logs in for requests, platform_tenant cannot log in and is assumed per transaction.',
        'A BEFORE UPDATE trigger refuses any status change not in notification_status_transitions; notification_events is append-only by REVOKE.',
        'The application role carries statement_timeout 5 s and idle_in_transaction_session_timeout 10 s.',
      ],
      evidence: [
        cite(compose, [7, 30]),
        cite('docker/postgres/init/01-create-application-role.sh', [10, 31]),
        cite(rowLevelSecurityMigration, [16, 44]),
        cite(transitionMigration, [46, 76]),
      ],
    },
    {
      id: 'job-queue',
      label: 'pg-boss queue (pgboss schema)',
      kind: 'queue',
      purpose:
        'Five declared queues in a schema inside the same Postgres, so a job row commits with the domain row that caused it.',
      technologies: ['pg-boss', 'postgresql'],
      notes: [
        'notification.dispatch: exclusive policy keyed by notification id, expires in 120 s, retryLimit 3 with backoff, dead-letters to notification.dispatch.dead. These are infrastructure retries, separate from the business budget of five attempts.',
        'whatsapp.session.poll is declared and provisioned but nothing sends to it and nothing works it.',
        'The pg-boss client in the API and the worker connects on DATABASE_SYSTEM_URL; only the transactional enqueue runs on the request connection as platform_tenant.',
      ],
      evidence: [
        cite(queueDefinitions, [13, 78]),
        cite(queueClient, [65, 106]),
        cite(queueModule, [36, 50]),
        cite(jobRunner, [73, 117]),
      ],
    },
    {
      id: 'waha',
      label: 'WAHA (WhatsApp gateway)',
      kind: 'external',
      purpose:
        'The unofficial WhatsApp HTTP gateway, image devlikeapro/waha:noweb-2026.8.2, holding the paired account and calling back with receipts.',
      notes: [
        'Compose profile whatsapp. Bound to 127.0.0.1:3201 only: its API has no per-tenant authorization, so it is infrastructure this platform speaks to, never a boundary anyone else may reach.',
        'Its send endpoint accepts no idempotency key, which is the root of the at-least-once guarantee.',
        'Answers to the hostname waha, the same alias the stub uses; exactly one of the two runs.',
      ],
      evidence: [
        cite(compose, [177, 230]),
        cite('docs/adr/0007-at-least-once-delivery.md', [5, 13]),
        cite('docs/architecture.md', [38, 40]),
      ],
    },
    {
      id: 'waha-stub',
      label: 'waha-stub',
      kind: 'process',
      purpose:
        'A deterministic in-repo Fastify stand-in for WAHA: session lifecycle, a six-code QR budget, signed webhooks, and failure modes chosen by the last four digits of the recipient.',
      technologies: ['nodejs', 'fastify'],
      notes: [
        'Compose profile stub on 127.0.0.1:3200, same alias waha. CI drives the whole delivery path against it.',
        'Suffix 0500 answers 500, 0401 answers 401, 0429 answers 429 with retry-after 90, 0422 answers 422, 0408 never answers, 0499 resets the socket, 0404 is not on WhatsApp.',
        'Reports a different message identifier on the send and on the receipt, as the real engine does.',
      ],
      evidence: [
        cite(stubServer, [58, 88]),
        cite(stubServer, [233, 285]),
        cite(stubFailureModes, [17, 44]),
        cite(compose, [232, 266]),
      ],
    },
    {
      id: 'domain',
      label: '@platform/domain',
      kind: 'package',
      purpose:
        'The rules: the status transition table, the failure taxonomy, retry backoff, acknowledgement merging, phone parsing, and the ports every adapter implements.',
      technologies: ['typescript'],
      notes: [
        'Declares no runtime dependency at all; a unit test fails the moment one is added.',
        'Every port is an interface plus a Symbol token, so it is injectable without a framework import.',
      ],
      evidence: [
        cite('packages/domain/package.json', [19, 26]),
        cite('packages/domain/src/purity.test.ts', [16, 35]),
        cite(notificationStatus, [33, 42]),
        cite(providerPort, [96, 112]),
      ],
    },
    {
      id: 'contracts',
      label: '@platform/contracts',
      kind: 'package',
      purpose:
        'Request and response schemas shared by the API and the dashboard, and the OpenAPI document generated from them.',
      technologies: ['typescript', 'zod'],
      notes: [
        'A test fails if a /v1 route exists without being described, or is described without existing.',
      ],
      evidence: [
        cite('packages/contracts/package.json', [18, 21]),
        cite('apps/api/src/public-api/openapi.integration.test.ts', [61, 95]),
      ],
    },
    {
      id: 'database-package',
      label: '@platform/database',
      kind: 'package',
      purpose:
        'Drizzle schema, the SQL migrations, the repositories with their compare-and-swap writes, and withTenantScope.',
      technologies: ['typescript', 'drizzle', 'postgresql'],
      notes: [
        'Every status write is UPDATE ... WHERE status = expected; zero rows is a result, not an exception.',
      ],
      evidence: [
        cite('packages/database/package.json', [22, 26]),
        cite(tenantScope, [28, 41]),
        cite(notificationRepository, [408, 437]),
      ],
    },
    {
      id: 'queue-package',
      label: '@platform/queue',
      kind: 'package',
      purpose:
        'Queue names and options, transactional enqueue through fromDrizzle, the client factory that demands an error listener, and the migrate CLI.',
      technologies: ['typescript', 'pg-boss'],
      notes: [
        'A dependency-cruiser rule forbids apps/api from importing it: only the worker knows the queue.',
      ],
      evidence: [
        cite(enqueueInTransaction, [19, 31]),
        cite(queueClient, [7, 26]),
        cite(dependencyCruiser, [42, 51]),
      ],
    },
    {
      id: 'provider-whatsapp',
      label: '@platform/provider-whatsapp',
      kind: 'package',
      purpose:
        'The WAHA adapter behind the provider port: request plumbing with global fetch, HTTP and transport failure classification, and webhook verification and translation.',
      technologies: ['typescript', 'zod'],
      notes: [
        'Every operation returns a ProviderResult value; failures are data, not exceptions.',
        'Reads three observed shapes of the send response and reduces them to the identifier the receipt will name.',
      ],
      evidence: [
        cite(wahaProvider, [47, 67]),
        cite(wahaProvider, [119, 155]),
        cite(classifyFailure, [19, 29]),
        cite(webhookModule, [112, 134]),
      ],
    },
    {
      id: 'security',
      label: '@platform/security',
      kind: 'package',
      purpose:
        'API key generation and keyed hashing, Argon2id passwords, opaque session tokens, AES-256-GCM for the webhook signing keys, and the clock, random and UUIDv7 ports.',
      technologies: ['typescript'],
      evidence: [
        cite(apiKeySecurity, [55, 93]),
        cite('packages/security/src/encryption.ts', [7, 37]),
        cite('packages/security/src/runtime.ts', [21, 54]),
      ],
    },
    {
      id: 'configuration',
      label: '@platform/configuration',
      kind: 'package',
      purpose:
        'One flat Zod schema keyed by the real variable names; it validates the process environment before Nest is built and generates .env.example.',
      technologies: ['typescript', 'zod'],
      notes: [
        'Five secrets have no default (the WAHA key, the pepper, the encryption key, the cursor key, the recipient salt) and the process refuses to boot without them; production refuses insecure cookies, identical database roles and placeholder secrets.',
      ],
      evidence: [
        cite(environmentSchema, [31, 161]),
        cite('apps/api/src/main.ts', [8, 25]),
        cite('packages/configuration/src/parse-configuration.test.ts', [124, 157]),
      ],
    },
    {
      id: 'observability',
      label: '@platform/observability',
      kind: 'package',
      purpose:
        'The pino logger, AsyncLocalStorage correlation context, the event vocabulary, redaction paths and recipient hashing.',
      technologies: ['typescript', 'pino'],
      notes: [
        'No metrics and no tracing. The chain correlationId, notificationId, providerMessageId, webhookEventId is stitched through logs.',
      ],
      evidence: [
        cite('packages/observability/src/correlation-context.ts', [1, 28]),
        cite(logger, [62, 100]),
        cite('packages/observability/src/redaction.ts', [19, 50]),
      ],
    },
    {
      id: 'composition',
      label: '@platform/composition',
      kind: 'package',
      purpose:
        'The composition root: services and Nest modules that bind ports to adapters. The only thing the applications wire.',
      technologies: ['typescript', 'nestjs'],
      notes: [
        'Binds WHATSAPP_PROVIDER_PORT to WahaProvider in one module; nothing outside it names WAHA.',
      ],
      evidence: [
        cite('packages/composition/package.json', [18, 31]),
        cite('packages/composition/src/provider/whatsapp-provider.module.ts', [6, 33]),
        cite(dependencyCruiser, [33, 41]),
      ],
    },
    {
      id: 'testing',
      label: '@platform/testing',
      kind: 'package',
      purpose:
        'The Testcontainers Postgres harness, fixtures that age claims and plant unresolved attempts, and the NOINHERIT probe role that proves the request path enters tenant scope.',
      technologies: ['typescript', 'testcontainers'],
      evidence: [
        cite('packages/testing/src/postgres-harness.ts', [15, 109]),
        cite('packages/testing/src/request-path-probe.ts', [4, 25]),
      ],
    },
  ],
  edges: [
    {
      id: 'client-api',
      from: 'client',
      to: 'api',
      label: 'POST /v1/notifications',
      protocol: 'http',
      authentication:
        'Authorization: Bearer wnp_{live|test}_{12 char identifier}{32 char secret}; ApiKeyGuard, then ApiKeyRateLimitGuard per key; scope notifications:write.',
      payload:
        'JSON recipient in international format, body 1 to 4096 characters, optional whatsAppSessionId, scheduledAt, maximumAttempts, metadata; optional Idempotency-Key header. Answer 202 with the notification, idempotent-replayed: true on a replay.',
      failureHandling:
        'One 401 for malformed, unknown, expired and revoked keys; 403 for a missing scope; 429 with retry-after and ratelimit-* headers; 409 for an in-flight key and 422 for a reused key; every error is RFC 9457 problem+json with the correlation id.',
      evidence: [
        cite(notificationsController, [50, 111]),
        cite(apiKeyGuard, [48, 86]),
        cite(rateLimitGuard, [69, 103]),
        cite(problemFilter, [37, 68]),
        cite('packages/contracts/src/notifications.ts', [11, 28]),
      ],
    },
    {
      id: 'operator-web',
      from: 'operator',
      to: 'web',
      label: 'Dashboard on one origin',
      protocol: 'http',
      authentication:
        'Cookie wnp_session (opaque 256-bit token stored as SHA-256), HttpOnly, SameSite=Lax, Secure when SECURITY_COOKIE_SECURE is on, which production requires; x-csrf-token derived by HMAC from the session id on every non-GET request.',
      payload:
        'Static bundle from /srv, then JSON calls to /dashboard/* with credentials same-origin.',
      failureHandling:
        '401 sends the SPA back to sign-in; a missing or forged CSRF token is 403; sign-in is rate limited per address and an account locks for 15 minutes after 10 failures.',
      evidence: [
        cite('apps/web/src/api/client.ts', [99, 140]),
        cite('apps/api/src/dashboard-api/authentication/authentication.controller.ts', [78, 86]),
        cite('apps/api/src/http/authentication/dashboard-session.guard.ts', [31, 65]),
        cite('packages/composition/src/authentication/authentication.service.ts', [174, 214]),
      ],
    },
    {
      id: 'web-api',
      from: 'web',
      to: 'api',
      label: 'reverse_proxy api:3000',
      protocol: 'http',
      payload:
        '/v1/*, /dashboard/*, /webhooks/*, /health and /ready forwarded untouched; everything else falls back to index.html.',
      failureHandling:
        'The API trusts one proxy hop for the client address, which is what the sign-in limiter is keyed on.',
      evidence: [cite(caddyfile, [19, 33]), cite(apiBootstrap, [31, 38])],
    },
    {
      id: 'api-postgres',
      from: 'api',
      to: 'postgres',
      label: 'Tenant-scoped transaction',
      protocol: 'sql',
      authentication:
        'Login role platform_application; each API-key request opens a transaction, issues SET LOCAL ROLE platform_tenant and set_config(app.current_application_id, ..., true), both transaction-local.',
      payload:
        'Resolve session, claim idempotency key, insert notification and first event, complete the key; the dashboard and the health probes run as the login role.',
      failureHandling:
        'Pool errors are logged instead of terminating the process; connection timeout 2 s; statement timeout 5 s on the role; a failed transaction releases the idempotency claim.',
      evidence: [
        cite(tenantScope, [28, 41]),
        cite(createService, [225, 307]),
        cite(connection, [32, 63]),
        cite('packages/composition/src/database/database.module.ts', [27, 45]),
      ],
    },
    {
      id: 'api-job-queue',
      from: 'api',
      to: 'job-queue',
      label: 'boss.send inside the request transaction',
      protocol: 'sql',
      authentication:
        'The job row is written on the request connection as platform_tenant, which the migrate step granted SELECT and INSERT on the pgboss schema.',
      payload:
        'notification.dispatch {correlationId, notificationId, applicationId} with singletonKey = notification id and startAfter for a scheduled send; webhook.process {correlationId, webhookDeliveryId}.',
      failureHandling:
        'Rollback discards the job with the row. A queue the bootstrap never declared, or a login role that cannot read pgboss.queue, surfaces as /ready 503 rather than as a 500 on a request.',
      evidence: [
        cite(enqueueInTransaction, [19, 31]),
        cite(createService, [279, 290]),
        cite(grantSendPrivileges, [34, 70]),
        cite(queueHealth, [11, 21]),
      ],
    },
    {
      id: 'worker-job-queue',
      from: 'worker',
      to: 'job-queue',
      label: 'work() with polling and LISTEN/NOTIFY',
      protocol: 'sql',
      authentication:
        'The pg-boss client connects on DATABASE_SYSTEM_URL and supervises: maintenance, archiving and the cron schedule run only here.',
      payload:
        'Batches of up to 5 dispatch or webhook jobs every 2 s, one maintenance.reconcile job per minute, dead letters every 60 s; each job settled on its own.',
      failureHandling:
        'A dispatch job expires after 120 s and is redelivered up to 3 times before dead-lettering; the abort signal of an expired job cancels the in-flight provider request.',
      evidence: [
        cite(queueModule, [36, 50]),
        cite(queueClient, [28, 46]),
        cite(jobRunner, [73, 154]),
        cite(dispatchHandler, [56, 63]),
      ],
    },
    {
      id: 'worker-postgres',
      from: 'worker',
      to: 'postgres',
      label: 'Claim, attempt ledger, transitions',
      protocol: 'sql',
      authentication:
        'Login role platform_application without tenant scope; the policies leave every role but platform_tenant unrestricted.',
      payload:
        'UPDATE ... SET status = PROCESSING WHERE status IN (QUEUED, RETRYING); attempt_count + 1 gated on the claim token; each transition with its timeline event and, when needed, the next job in the same transaction.',
      failureHandling:
        'Zero rows on the claim means another worker owns it and the job completes; the reaper returns claims older than 300 s to RETRYING.',
      evidence: [
        cite(notificationRepository, [263, 334]),
        cite(dispatchService, [667, 752]),
        cite(maintenanceService, [80, 129]),
        cite(rowLevelSecurityMigration, [47, 55]),
      ],
    },
    {
      id: 'worker-waha',
      from: 'worker',
      to: 'waha',
      label: 'check-exists, then sendText',
      protocol: 'http',
      authentication: 'x-api-key: WAHA_API_KEY on every request.',
      payload:
        'GET /api/contacts/check-exists?phone=&session= on every attempt until a send succeeds; the resolved chat id is stored with the SENT transition. POST /api/sendText {session, chatId, text, linkPreview: false}; 30 s timeout joined with the job abort signal.',
      failureHandling:
        'HTTP status maps to a failure code: 401 and 403 unauthorized, 404 session missing, 422 invalid request or session not ready, 429 rate limited with Retry-After, 500, 502, 503 and 504 server error, anything else provider_unknown_error. ECONNREFUSED and its kin are certainly not sent; any later transport error is an unknown outcome.',
      evidence: [
        cite(wahaProvider, [119, 155]),
        cite(wahaProvider, [255, 328]),
        cite(classifyFailure, [19, 29]),
        cite(classifyFailure, [86, 141]),
      ],
    },
    {
      id: 'api-waha',
      from: 'api',
      to: 'waha',
      label: 'Session lifecycle and QR code',
      protocol: 'http',
      authentication: 'x-api-key: WAHA_API_KEY.',
      payload:
        'POST /api/sessions with a per-session webhook URL and HMAC key, start, stop, logout, DELETE, and GET /api/{session}/auth/qr; the platform writes its row and encrypts the signing key before the provider ever learns the session name.',
      failureHandling:
        'A refused creation deletes the reservation; provider failures become 502 whatsapp_provider_unavailable; a missing session is an answer, not an error.',
      evidence: [
        cite(sessionService, [100, 148]),
        cite(sessionService, [180, 207]),
        cite(wahaProvider, [157, 253]),
        cite(problemFilter, [55, 58]),
      ],
    },
    {
      id: 'waha-api-webhook',
      from: 'waha',
      to: 'api',
      label: 'POST /webhooks/whatsapp/{sessionId}',
      protocol: 'webhook',
      authentication:
        'HMAC-SHA512 over the exact request bytes in x-webhook-hmac, per-session key held AES-256-GCM encrypted at rest; x-webhook-timestamp within 300 s when present, a missing header is accepted; verified before the body is parsed.',
      payload:
        'Envelope {id, timestamp, session, event, payload}; events message.ack, session.status and state.change. pnpm setup:env writes WAHA_WEBHOOK_PUBLIC_URL=http://api:3000, so callbacks go straight to the API; Caddy also proxies /webhooks/*.',
      failureHandling:
        'Unknown session, missing signature, unreadable key and wrong signature all answer 401; a stale timestamp 401; an unparseable body 400; accepted and duplicate both 202.',
      evidence: [
        cite(webhookController, [41, 87]),
        cite(ingestService, [101, 146]),
        cite(webhookModule, [112, 162]),
        cite(environmentSchema, [108, 115]),
        cite(stubWebhookSender, [37, 52]),
      ],
    },
    {
      id: 'api-postgres-inbox',
      from: 'api',
      to: 'postgres',
      label: 'Inbox row and webhook.process job',
      protocol: 'sql',
      authentication:
        'Login role; the session is looked up by id alone because a callback carries no tenant.',
      payload:
        'INSERT INTO webhook_deliveries ... ON CONFLICT (whatsapp_session_id, provider_event_id) DO NOTHING, then the job, in one transaction.',
      failureHandling:
        'A repeated provider event id inserts nothing and enqueues nothing; the endpoint still answers 202.',
      evidence: [
        cite(ingestService, [148, 177]),
        cite(webhookDeliveryRepository, [43, 64]),
        cite(sessionRepository, [73, 91]),
        cite(inboxMigration, [18, 19]),
      ],
    },
    {
      id: 'migrate-postgres',
      from: 'migrate',
      to: 'postgres',
      label: 'Migrations under an advisory lock',
      protocol: 'sql',
      authentication: 'System role platform_system, the schema owner.',
      payload:
        'pg_advisory_lock on a fixed key, Drizzle migrator over packages/database/migrations, then GRANT platform_tenant TO the login role read from DATABASE_APPLICATION_URL.',
      failureHandling:
        'A second instance waits on the lock and observes the completed state; any failure exits 1 and the dependants never start.',
      evidence: [
        cite('packages/database/src/bootstrap.ts', [18, 37]),
        cite(bootstrapCli, [34, 43]),
        cite(bootstrapCli, [78, 86]),
        cite(tenantScope, [50, 74]),
      ],
    },
    {
      id: 'migrate-job-queue',
      from: 'migrate',
      to: 'job-queue',
      label: 'Provision the pgboss schema and queues',
      protocol: 'sql',
      authentication: 'System role; the only pg-boss client that runs with migrate: true.',
      payload:
        'createQueue for each definition, dead letter targets first, then SELECT and INSERT on the schema and default privileges for future partitions granted to platform_tenant and the login role.',
      failureHandling: 'Idempotent: an existing queue has its options updated.',
      evidence: [cite(queueClient, [48, 106]), cite(bootstrapCli, [45, 51])],
    },
    {
      id: 'api-migrate',
      from: 'api',
      to: 'migrate',
      label: 'depends_on: service_completed_successfully',
      protocol: 'orchestration',
      payload: 'The API starts only after the barrier exited 0 and Postgres is healthy.',
      evidence: [cite(compose, [74, 78])],
    },
    {
      id: 'worker-migrate',
      from: 'worker',
      to: 'migrate',
      label: 'depends_on: service_completed_successfully',
      protocol: 'orchestration',
      payload: 'The worker starts only after the barrier exited 0, so every queue it works exists.',
      evidence: [cite(compose, [160, 164])],
    },
    {
      id: 'api-composition',
      from: 'api',
      to: 'composition',
      label: 'Modules and services from the composition root',
      protocol: 'in-process',
      payload:
        'Controllers receive CreateNotificationService, IngestWebhookService, guards and health services; a dependency-cruiser rule forbids importing an adapter directly.',
      evidence: [cite('apps/api/src/api.module.ts', [1, 27]), cite(dependencyCruiser, [33, 51])],
    },
    {
      id: 'worker-composition',
      from: 'worker',
      to: 'composition',
      label: 'The same module graph without a server',
      protocol: 'in-process',
      payload:
        'DispatchNotificationService, ProcessWebhookService and NotificationMaintenanceService, plus queue names and payload schemas from @platform/queue, which only the worker may import.',
      evidence: [
        cite('apps/worker/src/worker.module.ts', [1, 42]),
        cite(dependencyCruiser, [42, 51]),
      ],
    },
    {
      id: 'composition-domain',
      from: 'composition',
      to: 'domain',
      label: 'Rules and port tokens',
      protocol: 'in-process',
      payload:
        'Transition checks, failure classification, retry arithmetic, acknowledgement merging and the CLOCK, RANDOM, IDENTIFIER and WHATSAPP_PROVIDER port symbols.',
      evidence: [cite(dispatchService, [16, 34]), cite(processService, [11, 26])],
    },
    {
      id: 'composition-provider',
      from: 'composition',
      to: 'provider-whatsapp',
      label: 'WHATSAPP_PROVIDER_PORT bound to WahaProvider',
      protocol: 'in-process',
      payload: 'One factory with base URL, API key and request timeout from configuration.',
      evidence: [
        cite('packages/composition/src/provider/whatsapp-provider.module.ts', [15, 33]),
        cite(providerPort, [96, 112]),
      ],
    },
    {
      id: 'provider-domain',
      from: 'provider-whatsapp',
      to: 'domain',
      label: 'Implements the port, speaks in domain values',
      protocol: 'in-process',
      payload:
        'ProviderResult, ProviderFailure codes, ProviderEvent and the permissive session status parser.',
      evidence: [cite(wahaProvider, [1, 19]), cite(webhookModule, [3, 9])],
    },
    {
      id: 'composition-database',
      from: 'composition',
      to: 'database-package',
      label: 'Repositories and withTenantScope',
      protocol: 'in-process',
      payload: 'One pool on DATABASE_APPLICATION_URL, pool size 10, statement timeout 5 s.',
      evidence: [
        cite('packages/composition/src/database/database.module.ts', [27, 45]),
        cite(createService, [3, 11]),
      ],
    },
    {
      id: 'composition-queue',
      from: 'composition',
      to: 'queue-package',
      label: 'Queue client and transactional enqueue',
      protocol: 'in-process',
      payload:
        'createQueueClient with a mandatory error listener; enqueueInTransaction from the create, dispatch, maintenance and ingest services.',
      evidence: [cite(queueModule, [21, 56]), cite(maintenanceService, [157, 175])],
    },
    {
      id: 'web-contracts',
      from: 'web',
      to: 'contracts',
      label: 'Shared request and response types',
      protocol: 'in-process',
      payload:
        'The dashboard imports the schemas the API validates with, so a session response cannot drift from what the endpoint sends.',
      evidence: [
        cite('apps/web/package.json', [16, 23]),
        cite('apps/api/src/dashboard-api/authentication/authentication.controller.ts', [38, 46]),
      ],
    },
  ],
  flows: [
    {
      id: 'create-notification',
      name: 'Create a notification',
      kind: 'request',
      summary:
        'Authenticate, meter, validate, then claim the idempotency key, write the row, its first event and the dispatch job in one tenant-scoped transaction with no network call inside, and answer 202.',
      levers: [
        {
          id: 'idempotency',
          label: 'Idempotency-Key',
          options: [
            { value: 'fresh', label: 'New key' },
            { value: 'replay', label: 'Same key, same body' },
            { value: 'mismatch', label: 'Same key, different body' },
          ],
          defaultValue: 'fresh',
        },
      ],
      steps: [
        {
          at: 0,
          ledger: 'POST /v1/notifications Idempotency-Key: 7d1f...',
          tone: 'flight',
          edge: 'client-api',
          evidence: [cite(notificationsController, [66, 101])],
        },
        {
          at: 500,
          ledger: 'correlation.opened x-correlation-id echoed on the reply',
          tone: 'ok',
          node: 'api',
          evidence: [cite(correlationHook, [41, 49])],
        },
        {
          at: 1500,
          ledger:
            'apikey.parsed offline; one indexed lookup, HMAC-SHA256 under the pepper, timingSafeEqual',
          tone: 'flight',
          edge: 'api-postgres',
          evidence: [
            cite(apiKeyService, [87, 130]),
            cite(apiKeyRepository, [70, 105]),
            cite(apiKeySecurity, [69, 80]),
          ],
        },
        {
          at: 2100,
          ledger:
            'consume_rate_limit(apikey:..., 60/min, burst 10) -> allowed; ratelimit-remaining: 9',
          tone: 'ok',
          edge: 'api-postgres',
          evidence: [cite(rateLimitGuard, [69, 85]), cite(rateLimitRepository, [43, 81])],
        },
        {
          at: 3100,
          ledger: 'body.validated recipient +55..., body 1..4096, metadata',
          tone: 'ok',
          node: 'api',
          evidence: [cite('packages/contracts/src/notifications.ts', [11, 28])],
        },
        {
          at: 3600,
          ledger:
            'BEGIN; SET LOCAL ROLE platform_tenant; set_config(app.current_application_id, ..., true)',
          tone: 'flight',
          edge: 'api-postgres',
          evidence: [cite(tenantScope, [28, 41]), cite(createService, [225, 227])],
        },
        {
          at: 4200,
          ledger:
            'session.resolved prefer WORKING, accept any: a disconnected number queues rather than rejects',
          tone: 'ok',
          node: 'postgres',
          evidence: [cite(createService, [102, 133])],
        },
        {
          at: 4700,
          ledger:
            'idempotency.claim INSERT ... ON CONFLICT (application_id, key) DO NOTHING; expires_at = now + 24 h',
          tone: 'flight',
          edge: 'api-postgres',
          evidence: [cite(idempotencyRepository, [40, 81]), cite(createService, [144, 169])],
        },
        {
          at: 5200,
          ledger: 'idempotency.claimed IN_FLIGHT',
          tone: 'ok',
          node: 'postgres',
          status: { machine: 'idempotency-claim', value: 'IN_FLIGHT' },
          when: [{ lever: 'idempotency', value: 'fresh' }],
          evidence: [cite(createService, [171, 173])],
        },
        {
          at: 5200,
          ledger: 'idempotency.exists COMPLETED, same fingerprint -> replay the original',
          tone: 'ok',
          node: 'postgres',
          when: [{ lever: 'idempotency', value: 'replay' }],
          evidence: [cite(createService, [175, 187])],
        },
        {
          at: 5200,
          ledger: 'idempotency.exists fingerprint differs -> idempotency_key_reused',
          tone: 'fault',
          node: 'postgres',
          when: [{ lever: 'idempotency', value: 'mismatch' }],
          evidence: [cite(createService, [175, 180])],
        },
        {
          at: 5700,
          ledger: 'notification.inserted QUEUED; notification.created event (recipient masked)',
          tone: 'ok',
          edge: 'api-postgres',
          status: { machine: 'notification', value: 'QUEUED' },
          when: [{ lever: 'idempotency', value: 'fresh' }],
          evidence: [cite(createService, [248, 277])],
        },
        {
          at: 6700,
          ledger:
            'job.sent notification.dispatch singletonKey=notificationId, on the same transaction',
          tone: 'flight',
          edge: 'api-job-queue',
          when: [{ lever: 'idempotency', value: 'fresh' }],
          evidence: [cite(createService, [279, 290]), cite(enqueueInTransaction, [19, 31])],
        },
        {
          at: 7200,
          ledger: 'idempotency.completed responseStatus 201, resourceId=notificationId',
          tone: 'ok',
          node: 'postgres',
          status: { machine: 'idempotency-claim', value: 'COMPLETED' },
          when: [{ lever: 'idempotency', value: 'fresh' }],
          evidence: [cite(createService, [292, 301]), cite(idempotencyRepository, [83, 104])],
        },
        {
          at: 7700,
          ledger: 'COMMIT: row, event, job and claim together; no network call happened inside',
          tone: 'ok',
          node: 'postgres',
          when: [{ lever: 'idempotency', value: 'fresh' }],
          evidence: [cite(createService, [195, 207])],
        },
        {
          at: 8300,
          ledger: '202 Accepted {id, status: QUEUED}',
          tone: 'ok',
          edge: 'client-api',
          when: [{ lever: 'idempotency', value: 'fresh' }],
          evidence: [cite(notificationsController, [66, 75])],
        },
        {
          at: 5700,
          ledger: 'notification.read original row by resourceId',
          tone: 'ok',
          node: 'postgres',
          when: [{ lever: 'idempotency', value: 'replay' }],
          evidence: [cite(createService, [241, 246])],
        },
        {
          at: 6300,
          ledger: '202 Accepted idempotent-replayed: true',
          tone: 'ok',
          edge: 'client-api',
          when: [{ lever: 'idempotency', value: 'replay' }],
          evidence: [cite(notificationsController, [103, 108])],
        },
        {
          at: 5700,
          ledger: 'transaction rolled back; nothing written, the original claim stands',
          tone: 'fault',
          node: 'api',
          when: [{ lever: 'idempotency', value: 'mismatch' }],
          evidence: [cite(createService, [175, 180]), cite(createService, [195, 207])],
        },
        {
          at: 6300,
          ledger: '422 problem+json idempotency_key_reused',
          tone: 'fault',
          edge: 'client-api',
          when: [{ lever: 'idempotency', value: 'mismatch' }],
          evidence: [cite(problemFilter, [61, 63])],
        },
      ],
      assertedBy: [
        cite(notificationsApiTest, [267, 385]),
        cite(notificationsApiTest, [530, 549]),
        cite(tenantScopeTest, [280, 300]),
        cite('packages/queue/src/transactional-enqueue.integration.test.ts', [86, 170]),
      ],
    },
    {
      id: 'dispatch-and-send',
      name: 'Dispatch and send',
      kind: 'asynchronous',
      summary:
        'The worker claims with a compare-and-swap, checks the window, the ledger, the session and the pacing slot, spends an attempt before the network call, sends, and records SENT, which means accepted by WhatsApp and nothing more.',
      levers: [
        {
          id: 'session',
          label: 'WhatsApp connection',
          options: [
            { value: 'working', label: 'WORKING' },
            { value: 'scan-qr-code', label: 'SCAN_QR_CODE' },
          ],
          defaultValue: 'working',
        },
      ],
      steps: [
        {
          at: 0,
          ledger: 'job.fetched notification.dispatch (batch 5, poll 2 s, woken by NOTIFY)',
          tone: 'flight',
          edge: 'worker-job-queue',
          evidence: [cite(jobRunner, [74, 85]), cite(queueClient, [34, 37])],
        },
        {
          at: 600,
          ledger: 'correlation.restored correlationId -> notificationId -> applicationId',
          tone: 'ok',
          node: 'worker',
          evidence: [cite(dispatchHandler, [46, 48])],
        },
        {
          at: 1100,
          ledger: 'claim QUEUED -> PROCESSING WHERE status IN (QUEUED, RETRYING), claimToken set',
          tone: 'ok',
          edge: 'worker-postgres',
          status: { machine: 'notification', value: 'PROCESSING' },
          evidence: [cite(notificationRepository, [277, 296]), cite(dispatchService, [129, 163])],
        },
        {
          at: 1700,
          ledger: 'delivery window 24 h: open',
          tone: 'ok',
          node: 'worker',
          evidence: [cite(dispatchService, [201, 206]), cite(dispatchService, [697, 706])],
        },
        {
          at: 2200,
          ledger: 'attempts.unresolved none: no earlier send is still in doubt',
          tone: 'ok',
          node: 'worker',
          evidence: [cite(dispatchService, [708, 713]), cite(sendAttemptRepository, [86, 104])],
        },
        {
          at: 2700,
          ledger: 'session WORKING',
          tone: 'ok',
          node: 'postgres',
          when: [{ lever: 'session', value: 'working' }],
          evidence: [cite(dispatchService, [715, 744])],
        },
        {
          at: 2700,
          ledger: 'session SCAN_QR_CODE: a human has to scan; not a delivery failure',
          tone: 'wait',
          node: 'postgres',
          when: [{ lever: 'session', value: 'scan-qr-code' }],
          evidence: [cite(dispatchService, [731, 744])],
        },
        {
          at: 3200,
          ledger: 'PROCESSING -> RETRYING session_not_ready, floor 300 s, no attempt charged',
          tone: 'wait',
          edge: 'worker-postgres',
          status: { machine: 'notification', value: 'RETRYING' },
          when: [{ lever: 'session', value: 'scan-qr-code' }],
          evidence: [cite(dispatchService, [524, 562]), cite(retryPolicy, [21, 26])],
        },
        {
          at: 3800,
          ledger: 'job.sent startAfter=nextAttemptAt in the same transaction as the transition',
          tone: 'ok',
          edge: 'worker-job-queue',
          when: [{ lever: 'session', value: 'scan-qr-code' }],
          evidence: [cite(dispatchService, [632, 654])],
        },
        {
          at: 3200,
          ledger:
            'reserveSendSlot next_send_allowed_at <= now() -> reserved; next slot in 30..60 s, randomised',
          tone: 'flight',
          edge: 'worker-postgres',
          when: [{ lever: 'session', value: 'working' }],
          evidence: [cite(sessionRepository, [146, 190]), cite(deliveryMigration, [137, 139])],
        },
        {
          at: 3800,
          ledger: 'GET /api/contacts/check-exists?phone=...&session=wnp-...',
          tone: 'flight',
          edge: 'worker-waha',
          when: [{ lever: 'session', value: 'working' }],
          evidence: [cite(wahaProvider, [255, 296])],
        },
        {
          at: 4400,
          ledger:
            'recipient.resolved chatId from the provider; written to the row only when the send commits',
          tone: 'ok',
          node: 'worker',
          when: [{ lever: 'session', value: 'working' }],
          evidence: [cite(dispatchService, [393, 446]), cite(dispatchService, [270, 285])],
        },
        {
          at: 4900,
          ledger:
            'beginAttempt attempt_count 0 -> 1 WHERE claim_token matches; attempt row committed before the network call',
          tone: 'ok',
          edge: 'worker-postgres',
          status: { machine: 'send-attempt', value: 'UNRESOLVED' },
          when: [{ lever: 'session', value: 'working' }],
          evidence: [cite(notificationRepository, [298, 334]), cite(dispatchService, [448, 476])],
        },
        {
          at: 5500,
          ledger: 'POST /api/sendText {session, chatId, text, linkPreview: false}',
          tone: 'flight',
          edge: 'worker-waha',
          when: [{ lever: 'session', value: 'working' }],
          evidence: [cite(wahaProvider, [298, 315])],
        },
        {
          at: 6300,
          ledger:
            'accepted: key.id STUB000001 (NOWEB shape), reduced to the identifier the receipt will name',
          tone: 'ok',
          node: 'waha',
          when: [{ lever: 'session', value: 'working' }],
          evidence: [cite(wahaProvider, [47, 67]), cite(stubServer, [269, 284])],
        },
        {
          at: 6800,
          ledger: 'attempt.resolved SUCCEEDED providerMessageId',
          tone: 'ok',
          edge: 'worker-postgres',
          status: { machine: 'send-attempt', value: 'SUCCEEDED' },
          when: [{ lever: 'session', value: 'working' }],
          evidence: [cite(dispatchService, [265, 268]), cite(sendAttemptRepository, [68, 84])],
        },
        {
          at: 7300,
          ledger:
            'PROCESSING -> SENT, claim released, notification.sent event: accepted by WhatsApp, received by nobody yet',
          tone: 'ok',
          edge: 'worker-postgres',
          status: { machine: 'notification', value: 'SENT' },
          when: [{ lever: 'session', value: 'working' }],
          evidence: [cite(dispatchService, [270, 302])],
        },
        {
          at: 7900,
          ledger: 'job.completed dispatch finished: sent',
          tone: 'ok',
          node: 'worker',
          when: [{ lever: 'session', value: 'working' }],
          evidence: [cite(dispatchHandler, [65, 73])],
        },
      ],
      assertedBy: [
        cite(dispatchIntegrationTest, [192, 273]),
        cite(dispatchIntegrationTest, [443, 476]),
        cite(dispatchIntegrationTest, [544, 561]),
        cite('apps/end-to-end/tests/delivery.spec.ts', [13, 30]),
      ],
    },
    {
      id: 'delivery-receipt',
      name: 'Delivery receipt',
      kind: 'asynchronous',
      summary:
        'The provider posts a signed acknowledgement; the API verifies it over the raw bytes, files it in the inbox and answers 202; the worker merges it by maximum and moves SENT to DELIVERED. A later READ sets read_at and changes nothing else.',
      levers: [
        {
          id: 'receipt',
          label: 'Callback',
          options: [
            { value: 'fresh', label: 'New event id' },
            { value: 'duplicate', label: 'Redelivered event id' },
          ],
          defaultValue: 'fresh',
        },
      ],
      steps: [
        {
          at: 0,
          ledger:
            'POST /webhooks/whatsapp/{sessionId} x-webhook-hmac, x-webhook-timestamp; event message.ack ack=2',
          tone: 'flight',
          edge: 'waha-api-webhook',
          evidence: [cite(stubWebhookSender, [37, 52]), cite(webhookController, [41, 50])],
        },
        {
          at: 600,
          ledger: 'raw body retained: /webhooks/* keeps the exact bytes',
          tone: 'ok',
          node: 'api',
          evidence: [cite(rawBody, [30, 55])],
        },
        {
          at: 1100,
          ledger: 'session.found by id alone; signing key decrypted (AES-256-GCM)',
          tone: 'ok',
          node: 'api',
          evidence: [cite(ingestService, [101, 117]), cite(sessionRepository, [73, 91])],
        },
        {
          at: 1600,
          ledger: 'signature.verified HMAC-SHA512 over the raw bytes, constant time',
          tone: 'ok',
          node: 'api',
          evidence: [cite(webhookModule, [112, 134]), cite(ingestService, [118, 120])],
        },
        {
          at: 2100,
          ledger: 'timestamp within 300 s (absent is accepted); only now is the JSON parsed',
          tone: 'ok',
          node: 'api',
          evidence: [cite(ingestService, [122, 146]), cite(webhookModule, [136, 162])],
        },
        {
          at: 2600,
          ledger:
            'inbox.insert ON CONFLICT (whatsapp_session_id, provider_event_id) DO NOTHING + webhook.process job, one transaction',
          tone: 'flight',
          edge: 'api-postgres-inbox',
          status: { machine: 'webhook-delivery', value: 'RECEIVED' },
          when: [{ lever: 'receipt', value: 'fresh' }],
          evidence: [cite(ingestService, [148, 171]), cite(webhookDeliveryRepository, [43, 64])],
        },
        {
          at: 2600,
          ledger:
            'inbox.conflict already filed: nothing inserted, no job; webhook.duplicate logged',
          tone: 'ok',
          edge: 'api-postgres-inbox',
          when: [{ lever: 'receipt', value: 'duplicate' }],
          evidence: [cite(ingestService, [161, 175])],
        },
        {
          at: 3200,
          ledger:
            '202 {accepted: true}: recorded, not interpreted; the same answer for a redelivery',
          tone: 'ok',
          edge: 'waha-api-webhook',
          evidence: [cite(webhookController, [33, 43]), cite(webhookController, [86, 86])],
        },
        {
          at: 3800,
          ledger: 'job.fetched webhook.process',
          tone: 'flight',
          edge: 'worker-job-queue',
          when: [{ lever: 'receipt', value: 'fresh' }],
          evidence: [cite(jobRunner, [97, 107])],
        },
        {
          at: 4300,
          ledger: 'delivery.claimed processing_attempts + 1 WHERE processed_at IS NULL',
          tone: 'ok',
          edge: 'worker-postgres',
          when: [{ lever: 'receipt', value: 'fresh' }],
          evidence: [cite(webhookDeliveryRepository, [76, 92]), cite(processService, [213, 225])],
        },
        {
          at: 4800,
          ledger:
            'event.translated message_acknowledgement DEVICE fromUs; identifier normalised to the one the send stored',
          tone: 'ok',
          node: 'worker',
          when: [{ lever: 'receipt', value: 'fresh' }],
          evidence: [cite(webhookModule, [61, 92])],
        },
        {
          at: 5300,
          ledger: 'notification.found by (whatsapp_session_id, provider_message_id)',
          tone: 'ok',
          node: 'postgres',
          when: [{ lever: 'receipt', value: 'fresh' }],
          evidence: [cite(notificationRepository, [158, 182]), cite(deliveryMigration, [173, 173])],
        },
        {
          at: 5800,
          ledger: 'ack.merged max(PENDING, DEVICE) = DEVICE',
          tone: 'ok',
          node: 'worker',
          when: [{ lever: 'receipt', value: 'fresh' }],
          evidence: [cite(acknowledgement, [38, 53]), cite(processService, [127, 138])],
        },
        {
          at: 6300,
          ledger: 'SENT -> DELIVERED delivered_at set; notification.acknowledged event',
          tone: 'ok',
          edge: 'worker-postgres',
          status: { machine: 'notification', value: 'DELIVERED' },
          when: [{ lever: 'receipt', value: 'fresh' }],
          evidence: [cite(processService, [154, 197]), cite(processService, [247, 266])],
        },
        {
          at: 6800,
          ledger: 'delivery.processed APPLIED DEVICE',
          tone: 'ok',
          edge: 'worker-postgres',
          status: { machine: 'webhook-delivery', value: 'APPLIED' },
          when: [{ lever: 'receipt', value: 'fresh' }],
          evidence: [cite(processService, [235, 243])],
        },
        {
          at: 7800,
          ledger: 'second callback: message.ack ack=3 READ, verified and filed the same way',
          tone: 'flight',
          edge: 'waha-api-webhook',
          when: [{ lever: 'receipt', value: 'fresh' }],
          evidence: [cite(ingestService, [101, 177])],
        },
        {
          at: 8800,
          ledger:
            'ack.merged max(DEVICE, READ) = READ; read_at set; status stays DELIVERED, which is terminal',
          tone: 'ok',
          edge: 'worker-postgres',
          status: { machine: 'notification', value: 'DELIVERED' },
          when: [{ lever: 'receipt', value: 'fresh' }],
          evidence: [cite(processService, [158, 172]), cite(processService, [252, 266])],
        },
        {
          at: 9300,
          ledger: 'delivery.processed APPLIED READ',
          tone: 'ok',
          node: 'worker',
          when: [{ lever: 'receipt', value: 'fresh' }],
          evidence: [cite(processService, [235, 243])],
        },
      ],
      assertedBy: [
        cite(webhookProcessTest, [102, 178]),
        cite(webhookProcessTest, [247, 270]),
        cite(webhooksApiTest, [325, 490]),
        cite('apps/end-to-end/tests/delivery.spec.ts', [13, 48]),
      ],
    },
    {
      id: 'provider-failure',
      name: 'The provider fails the send',
      kind: 'failure',
      summary:
        'A 5xx and a 429 are classified retryable with the attempt resolved FAILED; a timeout is an unknown outcome, resolved UNKNOWN and settled by the application policy before anything is sent again.',
      levers: [
        {
          id: 'provider',
          label: 'WAHA answers',
          options: [
            { value: 'server-error', label: '500' },
            { value: 'rate-limited', label: '429 retry-after: 90' },
            { value: 'timeout', label: 'No answer' },
          ],
          defaultValue: 'server-error',
        },
        {
          id: 'policy',
          label: 'unknown_outcome_policy',
          options: [
            { value: 'retry', label: 'RETRY' },
            { value: 'fail-closed', label: 'FAIL_CLOSED' },
          ],
          defaultValue: 'retry',
        },
      ],
      steps: [
        {
          at: 0,
          ledger: 'job.fetched notification.dispatch',
          tone: 'flight',
          edge: 'worker-job-queue',
          evidence: [cite(jobRunner, [74, 85])],
        },
        {
          at: 600,
          ledger: 'claim QUEUED -> PROCESSING',
          tone: 'ok',
          edge: 'worker-postgres',
          status: { machine: 'notification', value: 'PROCESSING' },
          evidence: [cite(notificationRepository, [277, 296])],
        },
        {
          at: 1200,
          ledger: 'beginAttempt attempt 1 committed, outcome NULL',
          tone: 'ok',
          edge: 'worker-postgres',
          status: { machine: 'send-attempt', value: 'UNRESOLVED' },
          evidence: [cite(dispatchService, [448, 476])],
        },
        {
          at: 1800,
          ledger: 'POST /api/sendText',
          tone: 'flight',
          edge: 'worker-waha',
          evidence: [cite(wahaProvider, [298, 315])],
        },
        {
          at: 2600,
          ledger:
            '500 Internal engine failure -> provider_server_error RETRYABLE; the request was answered, so it is not an unknown outcome',
          tone: 'fault',
          node: 'waha',
          when: [{ lever: 'provider', value: 'server-error' }],
          evidence: [
            cite(classifyFailure, [19, 29]),
            cite(providerFailure, [49, 91]),
            cite(stubFailureModes, [61, 70]),
          ],
        },
        {
          at: 2600,
          ledger: '429 retry-after: 90 -> provider_rate_limited RETRYABLE, retryAfterSeconds 90',
          tone: 'fault',
          node: 'waha',
          when: [{ lever: 'provider', value: 'rate-limited' }],
          evidence: [cite(classifyFailure, [52, 84]), cite(stubFailureModes, [53, 70])],
        },
        {
          at: 4600,
          ledger:
            'no answer; AbortSignal.timeout fires after 30 s (WAHA_REQUEST_TIMEOUT_MILLISECONDS)',
          tone: 'wait',
          node: 'waha',
          when: [{ lever: 'provider', value: 'timeout' }],
          evidence: [cite(wahaProvider, [119, 126]), cite(environmentSchema, [105, 107])],
        },
        {
          at: 5200,
          ledger:
            'classified provider_timeout: the request may have reached WhatsApp; unknown outcome',
          tone: 'unknown',
          node: 'worker',
          when: [{ lever: 'provider', value: 'timeout' }],
          evidence: [cite(classifyFailure, [120, 141]), cite(providerFailure, [72, 91])],
        },
        {
          at: 3200,
          ledger: 'attempt.resolved FAILED provider_server_error',
          tone: 'fault',
          edge: 'worker-postgres',
          status: { machine: 'send-attempt', value: 'FAILED' },
          when: [{ lever: 'provider', value: 'server-error' }],
          evidence: [cite(dispatchService, [304, 333])],
        },
        {
          at: 3200,
          ledger: 'attempt.resolved FAILED provider_rate_limited',
          tone: 'fault',
          edge: 'worker-postgres',
          status: { machine: 'send-attempt', value: 'FAILED' },
          when: [{ lever: 'provider', value: 'rate-limited' }],
          evidence: [cite(dispatchService, [304, 333])],
        },
        {
          at: 5800,
          ledger: 'attempt.resolved UNKNOWN provider_timeout',
          tone: 'unknown',
          edge: 'worker-postgres',
          status: { machine: 'send-attempt', value: 'UNKNOWN' },
          when: [{ lever: 'provider', value: 'timeout' }],
          evidence: [cite(dispatchService, [344, 358])],
        },
        {
          at: 3800,
          ledger: 'backoff attempt 1: 60 s x 3^0 with equal jitter -> 30..60 s',
          tone: 'wait',
          node: 'worker',
          when: [{ lever: 'provider', value: 'server-error' }],
          evidence: [cite(retryPolicy, [10, 19]), cite(retryPolicy, [28, 44])],
        },
        {
          at: 3800,
          ledger: 'floor max(0, retryAfterSeconds 90) outranks the curve -> 90 s',
          tone: 'wait',
          node: 'worker',
          when: [{ lever: 'provider', value: 'rate-limited' }],
          evidence: [cite(dispatchService, [531, 540])],
        },
        {
          at: 6400,
          ledger: 'policy RETRY: accept a possible duplicate rather than a possible silent loss',
          tone: 'unknown',
          node: 'worker',
          when: [
            { lever: 'provider', value: 'timeout' },
            { lever: 'policy', value: 'retry' },
          ],
          evidence: [cite(dispatchService, [335, 343]), cite(dispatchService, [372, 391])],
        },
        {
          at: 6400,
          ledger: 'policy FAIL_CLOSED: stop rather than risk sending twice',
          tone: 'fault',
          node: 'worker',
          when: [
            { lever: 'provider', value: 'timeout' },
            { lever: 'policy', value: 'fail-closed' },
          ],
          evidence: [cite(dispatchService, [360, 370])],
        },
        {
          at: 4400,
          ledger:
            'PROCESSING -> RETRYING next_attempt_at; retry_scheduled event; next job enqueued in the same transaction',
          tone: 'wait',
          edge: 'worker-postgres',
          status: { machine: 'notification', value: 'RETRYING' },
          when: [{ lever: 'provider', value: 'server-error' }],
          evidence: [cite(dispatchService, [524, 562]), cite(dispatchService, [594, 630])],
        },
        {
          at: 4400,
          ledger: 'PROCESSING -> RETRYING next_attempt_at = now + 90 s',
          tone: 'wait',
          edge: 'worker-postgres',
          status: { machine: 'notification', value: 'RETRYING' },
          when: [{ lever: 'provider', value: 'rate-limited' }],
          evidence: [cite(dispatchService, [524, 562])],
        },
        {
          at: 7000,
          ledger: 'PROCESSING -> RETRYING provider_outcome_unknown, written to the timeline',
          tone: 'unknown',
          edge: 'worker-postgres',
          status: { machine: 'notification', value: 'RETRYING' },
          when: [
            { lever: 'provider', value: 'timeout' },
            { lever: 'policy', value: 'retry' },
          ],
          evidence: [cite(dispatchService, [384, 390])],
        },
        {
          at: 7000,
          ledger: 'PROCESSING -> FAILED unknown_outcome_fail_closed, with the cause in the reason',
          tone: 'fault',
          edge: 'worker-postgres',
          status: { machine: 'notification', value: 'FAILED' },
          when: [
            { lever: 'provider', value: 'timeout' },
            { lever: 'policy', value: 'fail-closed' },
          ],
          evidence: [cite(dispatchService, [360, 370]), cite(dispatchService, [564, 592])],
        },
        {
          at: 7600,
          ledger:
            'job.completed; the queue retry budget is untouched, the business budget of 5 attempts is what counts',
          tone: 'ok',
          node: 'worker',
          evidence: [cite(queueDefinitions, [13, 23]), cite(dispatchHandler, [65, 73])],
        },
      ],
      assertedBy: [
        cite(dispatchIntegrationTest, [275, 401]),
        cite('packages/provider-whatsapp/src/waha-provider.integration.test.ts', [297, 426]),
        cite('packages/domain/src/notification/provider-failure.test.ts', [74, 103]),
        cite('apps/end-to-end/tests/delivery.spec.ts', [63, 79]),
      ],
    },
    {
      id: 'worker-killed-after-send',
      name: 'Worker killed after the provider accepted',
      kind: 'recovery',
      summary:
        'The at-least-once window: the attempt is committed, WhatsApp accepts, the worker dies before SENT commits. The reaper returns the claim without refunding the attempt, and the next dispatch settles the unresolved attempt as UNKNOWN before the tenant policy decides.',
      levers: [
        {
          id: 'policy',
          label: 'unknown_outcome_policy',
          options: [
            { value: 'retry', label: 'RETRY' },
            { value: 'fail-closed', label: 'FAIL_CLOSED' },
          ],
          defaultValue: 'retry',
        },
      ],
      steps: [
        {
          at: 0,
          ledger: 'claim QUEUED -> PROCESSING',
          tone: 'ok',
          edge: 'worker-postgres',
          status: { machine: 'notification', value: 'PROCESSING' },
          evidence: [cite(notificationRepository, [277, 296])],
        },
        {
          at: 600,
          ledger:
            'beginAttempt attempt 1 committed, outcome NULL: durable evidence a request may reach WhatsApp',
          tone: 'ok',
          edge: 'worker-postgres',
          status: { machine: 'send-attempt', value: 'UNRESOLVED' },
          evidence: [cite(dispatchService, [216, 222]), cite(sendAttemptRepository, [40, 48])],
        },
        {
          at: 1200,
          ledger: 'POST /api/sendText',
          tone: 'flight',
          edge: 'worker-waha',
          evidence: [cite(wahaProvider, [298, 315])],
        },
        {
          at: 1800,
          ledger: 'accepted: the message is with WhatsApp',
          tone: 'ok',
          node: 'waha',
          evidence: [cite(stubServer, [269, 284])],
        },
        {
          at: 2300,
          ledger: 'worker killed before PROCESSING -> SENT commits',
          tone: 'fault',
          node: 'worker',
          evidence: [cite('docs/adr/0007-at-least-once-delivery.md', [5, 13])],
        },
        {
          at: 2900,
          ledger:
            'row stays PROCESSING with its claim; attempt 1 unresolved: whether WhatsApp acted on it is unknowable',
          tone: 'unknown',
          node: 'postgres',
          evidence: [
            cite(notificationRepository, [364, 382]),
            cite(sendAttemptRepository, [40, 48]),
          ],
        },
        {
          at: 3500,
          ledger:
            'job expires after 120 s; pg-boss redelivers (retryLimit 3, retryDelay 10 s, backoff)',
          tone: 'wait',
          node: 'job-queue',
          evidence: [cite(queueDefinitions, [42, 50])],
        },
        {
          at: 4100,
          ledger:
            'redelivered job: claim finds PROCESSING -> not_claimable; completes without throwing',
          tone: 'wait',
          node: 'worker',
          evidence: [cite(dispatchService, [667, 676])],
        },
        {
          at: 4900,
          ledger: 'maintenance.reconcile cron * * * * *',
          tone: 'wait',
          edge: 'worker-job-queue',
          evidence: [cite(jobRunner, [13, 20]), cite(jobRunner, [109, 117])],
        },
        {
          at: 5500,
          ledger:
            'reaper: claimed_at older than 300 s -> PROCESSING -> RETRYING, notification.claim_reaped; budget not refunded',
          tone: 'ok',
          edge: 'worker-postgres',
          status: { machine: 'notification', value: 'RETRYING' },
          evidence: [cite(maintenanceService, [72, 129]), cite(environmentSchema, [92, 95])],
        },
        {
          at: 6100,
          ledger:
            'dispatch job re-enqueued with the original correlationId (exclusive policy accepts it once the old job is gone)',
          tone: 'ok',
          edge: 'worker-job-queue',
          evidence: [cite(maintenanceService, [157, 175]), cite(queueDefinitions, [27, 42])],
        },
        {
          at: 6700,
          ledger: 'claim RETRYING -> PROCESSING',
          tone: 'ok',
          edge: 'worker-postgres',
          status: { machine: 'notification', value: 'PROCESSING' },
          evidence: [cite(notificationRepository, [277, 296])],
        },
        {
          at: 7300,
          ledger:
            'attempts.unresolved attempt 1 found: acknowledge the ambiguity before acting on it',
          tone: 'unknown',
          node: 'worker',
          evidence: [cite(dispatchService, [656, 666]), cite(dispatchService, [708, 713])],
        },
        {
          at: 7900,
          ledger: 'attempt 1 resolved UNKNOWN provider_outcome_unknown',
          tone: 'unknown',
          edge: 'worker-postgres',
          status: { machine: 'send-attempt', value: 'UNKNOWN' },
          evidence: [cite(dispatchService, [344, 358])],
        },
        {
          at: 8500,
          ledger:
            'PROCESSING -> RETRYING provider_outcome_unknown; the next pass may deliver a duplicate, and says so',
          tone: 'wait',
          edge: 'worker-postgres',
          status: { machine: 'notification', value: 'RETRYING' },
          when: [{ lever: 'policy', value: 'retry' }],
          evidence: [cite(dispatchService, [384, 390])],
        },
        {
          at: 8500,
          ledger: 'PROCESSING -> FAILED unknown_outcome_fail_closed',
          tone: 'fault',
          edge: 'worker-postgres',
          status: { machine: 'notification', value: 'FAILED' },
          when: [{ lever: 'policy', value: 'fail-closed' }],
          evidence: [cite(dispatchService, [360, 370])],
        },
        {
          at: 9100,
          ledger:
            'no pass sends in the same breath it resolves: this attempt returned retry_scheduled without a provider call',
          tone: 'ok',
          node: 'worker',
          when: [{ lever: 'policy', value: 'retry' }],
          evidence: [cite(dispatchIntegrationTest, [402, 422])],
        },
      ],
      assertedBy: [
        cite(dispatchIntegrationTest, [402, 441]),
        cite(dispatchIntegrationTest, [563, 605]),
        cite('packages/queue/src/queue-definitions.test.ts', [44, 51]),
      ],
    },
    {
      id: 'postgres-stopped',
      name: 'Postgres stops under a running API',
      kind: 'failure',
      summary:
        'Both processes survive the loss of their only datastore: pool and queue client errors are listened to and reduced before they are logged, /health keeps answering 200, /ready answers 503 with the reason, and readiness returns on its own when the database does.',
      steps: [
        {
          at: 0,
          ledger: 'postgres stopped',
          tone: 'fault',
          node: 'postgres',
          evidence: [cite('docs/architecture.md', [213, 227])],
        },
        {
          at: 600,
          ledger:
            'pool.error logged health.dependency.degraded database; the process survives the idle client failure',
          tone: 'fault',
          node: 'api',
          evidence: [
            cite(connection, [48, 54]),
            cite('packages/composition/src/database/database.module.ts', [38, 43]),
          ],
        },
        {
          at: 1200,
          ledger: 'queue client error listener fires; no unhandled error event, no restart storm',
          tone: 'fault',
          node: 'api',
          evidence: [cite(queueClient, [16, 25]), cite(queueModule, [41, 46])],
        },
        {
          at: 1800,
          ledger:
            'error serialised to type, message, code, stack, cause; the driver client with host and role is dropped',
          tone: 'ok',
          node: 'api',
          evidence: [cite(logger, [62, 100])],
        },
        {
          at: 2400,
          ledger: 'GET /health',
          tone: 'flight',
          edge: 'web-api',
          evidence: [cite(caddyfile, [28, 30])],
        },
        {
          at: 2900,
          ledger: '200 {status: ok}: liveness touches no dependency',
          tone: 'ok',
          node: 'api',
          evidence: [cite(healthController, [30, 45])],
        },
        {
          at: 3400,
          ledger: 'GET /ready',
          tone: 'flight',
          edge: 'web-api',
          evidence: [cite(caddyfile, [31, 33])],
        },
        {
          at: 3900,
          ledger: 'database check: acquiring a client hits the 2 s connection timeout',
          tone: 'fault',
          node: 'api',
          evidence: [cite(databaseHealth, [22, 69]), cite(connection, [43, 45])],
        },
        {
          at: 4400,
          ledger: 'queue check: SELECT name FROM pgboss.queue fails with the reason Postgres gave',
          tone: 'fault',
          node: 'api',
          evidence: [cite(queueHealth, [39, 71])],
        },
        {
          at: 4900,
          ledger: '503 {status: not_ready, checks: {database: down, queue: down}} with reasons',
          tone: 'fault',
          edge: 'web-api',
          evidence: [cite(healthController, [55, 73])],
        },
        {
          at: 5500,
          ledger:
            'POST /v1/notifications meanwhile: key lookup fails before the limiter runs -> 500 problem+json, correlation id, no internals',
          tone: 'fault',
          node: 'api',
          evidence: [
            cite(apiKeyService, [95, 105]),
            cite(notificationsController, [50, 53]),
            cite(problemFilter, [118, 152]),
          ],
        },
        {
          at: 7000,
          ledger: 'postgres back',
          tone: 'ok',
          node: 'postgres',
          evidence: [cite('docs/architecture.md', [213, 216])],
        },
        {
          at: 7600,
          ledger: 'GET /ready -> 200 without a restart',
          tone: 'ok',
          edge: 'web-api',
          evidence: [cite(healthController, [55, 73])],
        },
      ],
      assertedBy: [
        cite(healthTest, [60, 153]),
        cite('packages/composition/src/database/database-health.service.test.ts', [40, 65]),
        cite('packages/composition/src/queue/queue-health.service.test.ts', [35, 80]),
      ],
    },
    {
      id: 'receipt-before-send-commits',
      name: 'Receipt arrives before the send commits',
      kind: 'recovery',
      summary:
        'The provider can report delivery before the worker has committed SENT. The processor throws inside a 60 s grace window so the queue retries with backoff; after the window the callback is filed as UNMATCHED rather than lost or retried forever.',
      levers: [
        {
          id: 'send',
          label: 'The send transaction',
          options: [
            { value: 'commits', label: 'Commits within 60 s' },
            { value: 'never', label: 'Never commits' },
          ],
          defaultValue: 'commits',
        },
      ],
      steps: [
        {
          at: 0,
          ledger: 'POST /api/sendText',
          tone: 'flight',
          edge: 'worker-waha',
          evidence: [cite(wahaProvider, [298, 315])],
        },
        {
          at: 600,
          ledger: 'accepted; WAHA emits message.ack ack=2 before the worker has committed',
          tone: 'ok',
          node: 'waha',
          evidence: [cite(processService, [39, 47])],
        },
        {
          at: 1100,
          ledger: 'POST /webhooks/whatsapp/{sessionId} ack=2, verified',
          tone: 'flight',
          edge: 'waha-api-webhook',
          evidence: [cite(ingestService, [101, 133])],
        },
        {
          at: 1700,
          ledger: 'inbox row + webhook.process job committed; 202',
          tone: 'ok',
          edge: 'api-postgres-inbox',
          status: { machine: 'webhook-delivery', value: 'RECEIVED' },
          evidence: [cite(ingestService, [148, 177])],
        },
        {
          at: 2200,
          ledger: 'job.fetched webhook.process',
          tone: 'flight',
          edge: 'worker-job-queue',
          evidence: [cite(jobRunner, [97, 107])],
        },
        {
          at: 2700,
          ledger: 'findByProviderMessageId: no row carries this identifier yet',
          tone: 'unknown',
          node: 'postgres',
          evidence: [cite(processService, [118, 125])],
        },
        {
          at: 3200,
          ledger:
            'received_at younger than 60 s: throw "does not exist yet" -> job back to the queue (retryDelay 5 s, backoff, retryLimit 5)',
          tone: 'wait',
          node: 'worker',
          evidence: [
            cite(processService, [39, 47]),
            cite(processService, [141, 152]),
            cite(queueDefinitions, [58, 65]),
          ],
        },
        {
          at: 3800,
          ledger: 'PROCESSING -> SENT commits with providerMessageId',
          tone: 'ok',
          edge: 'worker-postgres',
          status: { machine: 'notification', value: 'SENT' },
          when: [{ lever: 'send', value: 'commits' }],
          evidence: [cite(dispatchService, [270, 299])],
        },
        {
          at: 4600,
          ledger: 'webhook.process retried',
          tone: 'flight',
          edge: 'worker-job-queue',
          when: [{ lever: 'send', value: 'commits' }],
          evidence: [cite('apps/worker/src/jobs/webhook-process.handler.ts', [18, 24])],
        },
        {
          at: 5200,
          ledger: 'notification.found; ack.merged max(PENDING, DEVICE) = DEVICE',
          tone: 'ok',
          node: 'postgres',
          when: [{ lever: 'send', value: 'commits' }],
          evidence: [cite(processService, [118, 138])],
        },
        {
          at: 5800,
          ledger: 'SENT -> DELIVERED',
          tone: 'ok',
          edge: 'worker-postgres',
          status: { machine: 'notification', value: 'DELIVERED' },
          when: [{ lever: 'send', value: 'commits' }],
          evidence: [cite(processService, [154, 197])],
        },
        {
          at: 6300,
          ledger: 'delivery.processed APPLIED',
          tone: 'ok',
          edge: 'worker-postgres',
          status: { machine: 'webhook-delivery', value: 'APPLIED' },
          when: [{ lever: 'send', value: 'commits' }],
          evidence: [cite(processService, [235, 243])],
        },
        {
          at: 3800,
          ledger: 'the send never commits, or the message was not ours',
          tone: 'fault',
          node: 'postgres',
          when: [{ lever: 'send', value: 'never' }],
          evidence: [cite(processService, [39, 47])],
        },
        {
          at: 6300,
          ledger: 'retries keep finding nothing until received_at is older than 60 s',
          tone: 'wait',
          node: 'worker',
          when: [{ lever: 'send', value: 'never' }],
          evidence: [cite(processService, [141, 152])],
        },
        {
          at: 7000,
          ledger: 'delivery.processed UNMATCHED: recorded with its reason, not retried forever',
          tone: 'unknown',
          edge: 'worker-postgres',
          status: { machine: 'webhook-delivery', value: 'UNMATCHED' },
          when: [{ lever: 'send', value: 'never' }],
          evidence: [cite(processService, [150, 152]), cite(webhookDeliveryRepository, [94, 108])],
        },
      ],
      assertedBy: [cite(webhookProcessTest, [193, 211]), cite(webhookProcessTest, [127, 154])],
    },
    {
      id: 'api-key-refused',
      name: 'A key is refused, or runs out of allowance',
      kind: 'security',
      summary:
        'A malformed token never reaches the database; a well-formed forgery costs one indexed lookup and one constant-time compare and gets the same 401 as an expired or revoked key; a valid key over its GCRA allowance gets 429 with an exact retry-after.',
      levers: [
        {
          id: 'credential',
          label: 'Bearer token',
          options: [
            { value: 'malformed', label: 'Not wnp_ shaped' },
            { value: 'forged', label: 'Well formed, wrong secret' },
            { value: 'exhausted', label: 'Valid, over the limit' },
          ],
          defaultValue: 'forged',
        },
      ],
      steps: [
        {
          at: 0,
          ledger: 'POST /v1/notifications Authorization: Bearer ...',
          tone: 'flight',
          edge: 'client-api',
          evidence: [cite(notificationsController, [50, 53])],
        },
        {
          at: 500,
          ledger: 'bearer prefix present; anything else is refused before parsing',
          tone: 'ok',
          node: 'api',
          evidence: [cite(apiKeyGuard, [52, 57])],
        },
        {
          at: 1000,
          ledger:
            'tryParseApiKey: not wnp_{live|test}_ plus 44 alphanumerics -> undefined; no query issued',
          tone: 'fault',
          node: 'api',
          when: [{ lever: 'credential', value: 'malformed' }],
          evidence: [cite(apiKeyFormat, [63, 95]), cite(apiKeyService, [95, 99])],
        },
        {
          at: 1500,
          ledger:
            'apikey.rejected reason unknown_or_inactive_key, ip logged; the token is never quoted',
          tone: 'fault',
          node: 'api',
          when: [{ lever: 'credential', value: 'malformed' }],
          evidence: [cite(apiKeyGuard, [37, 46]), cite(apiKeyFormat, [48, 55])],
        },
        {
          at: 2000,
          ledger: '401 problem+json "The API key is invalid."',
          tone: 'fault',
          edge: 'client-api',
          when: [{ lever: 'credential', value: 'malformed' }],
          evidence: [cite(apiKeyGuard, [59, 63])],
        },
        {
          at: 1000,
          ledger:
            'lookup key_identifier WHERE revoked_at IS NULL AND not expired AND application not archived',
          tone: 'flight',
          edge: 'api-postgres',
          when: [{ lever: 'credential', value: 'forged' }],
          evidence: [cite(apiKeyRepository, [70, 105])],
        },
        {
          at: 1600,
          ledger:
            'HMAC-SHA256(secret, pepper) differs from key_hash; timingSafeEqual, length-guarded',
          tone: 'fault',
          node: 'api',
          when: [{ lever: 'credential', value: 'forged' }],
          evidence: [cite(apiKeySecurity, [55, 80]), cite(apiKeyService, [109, 113])],
        },
        {
          at: 2100,
          ledger:
            'apikey.rejected: malformed, unknown, expired, revoked and suspended all answer alike',
          tone: 'fault',
          node: 'api',
          when: [{ lever: 'credential', value: 'forged' }],
          evidence: [cite(apiKeyService, [87, 94])],
        },
        {
          at: 2600,
          ledger: '401 problem+json',
          tone: 'fault',
          edge: 'client-api',
          when: [{ lever: 'credential', value: 'forged' }],
          evidence: [cite(apiKeyGuard, [59, 63])],
        },
        {
          at: 1000,
          ledger: 'key authenticated; scope notifications:write present',
          tone: 'ok',
          edge: 'api-postgres',
          when: [{ lever: 'credential', value: 'exhausted' }],
          evidence: [cite(apiKeyGuard, [65, 85])],
        },
        {
          at: 1600,
          ledger:
            'consume_rate_limit(apikey:<id>, 60 per minute, burst 10): decision and write in one INSERT ... ON CONFLICT DO UPDATE ... WHERE',
          tone: 'flight',
          edge: 'api-postgres',
          when: [{ lever: 'credential', value: 'exhausted' }],
          evidence: [cite(rateLimitGuard, [49, 81]), cite(rateLimitMigration, [44, 63])],
        },
        {
          at: 2200,
          ledger:
            'theoretical arrival too far ahead: refused; retry_after computed to the second, not to the next window',
          tone: 'fault',
          node: 'postgres',
          when: [{ lever: 'credential', value: 'exhausted' }],
          evidence: [cite(rateLimitMigration, [90, 101])],
        },
        {
          at: 2700,
          ledger: 'headers ratelimit-limit 60, ratelimit-remaining 0, ratelimit-reset, retry-after',
          tone: 'fault',
          node: 'api',
          when: [{ lever: 'credential', value: 'exhausted' }],
          evidence: [cite(rateLimitGuard, [13, 26]), cite(rateLimitGuard, [87, 90])],
        },
        {
          at: 3200,
          ledger: '429 problem+json Too Many Requests, the same shape as every other error',
          tone: 'fault',
          edge: 'client-api',
          when: [{ lever: 'credential', value: 'exhausted' }],
          evidence: [cite(rateLimitGuard, [92, 102]), cite(notificationsApiTest, [611, 632])],
        },
        {
          at: 3800,
          ledger:
            'the limiter fails open when its own statement fails: ratelimit.degraded logged, request served unmetered',
          tone: 'ok',
          node: 'api',
          evidence: [cite(rateLimitService, [65, 94])],
        },
      ],
      assertedBy: [
        cite('apps/api/src/dashboard-api/tenancy.integration.test.ts', [396, 525]),
        cite(notificationsApiTest, [551, 610]),
        cite('packages/database/src/repositories/rate-limit.integration.test.ts', [42, 153]),
        cite('apps/end-to-end/tests/rate-limiting.spec.ts'),
      ],
    },
  ],
  stateMachines: [
    {
      id: 'notification',
      name: 'Notification lifecycle',
      statuses: [
        {
          id: 'SCHEDULED',
          terminal: false,
          tone: 'wait',
          note: 'Created with scheduledAt; not a state a worker may dispatch from.',
        },
        { id: 'QUEUED', terminal: false, tone: 'wait' },
        {
          id: 'PROCESSING',
          terminal: false,
          tone: 'flight',
          note: 'Held under a claim token; the one state a claim cannot be taken from and the one state that cannot be cancelled.',
        },
        {
          id: 'SENT',
          terminal: false,
          tone: 'ok',
          note: 'Accepted by WhatsApp. Requires provider_message_id by CHECK constraint.',
        },
        {
          id: 'DELIVERED',
          terminal: true,
          tone: 'ok',
          note: 'Acknowledgement DEVICE or higher. READ and PLAYED set read_at and leave the status alone.',
        },
        {
          id: 'RETRYING',
          terminal: false,
          tone: 'wait',
          note: 'Requires next_attempt_at by CHECK constraint.',
        },
        {
          id: 'FAILED',
          terminal: true,
          tone: 'fault',
          note: 'No outgoing edge: a retry creates a new row that points back through retry_of_notification_id.',
        },
        { id: 'CANCELLED', terminal: true, tone: 'neutral' },
      ],
      transitions: [
        {
          from: 'SCHEDULED',
          to: 'QUEUED',
          trigger: 'promoteScheduled',
          guard: 'scheduled_at <= now()',
        },
        { from: 'SCHEDULED', to: 'CANCELLED', trigger: 'POST /v1/notifications/{id}/cancel' },
        {
          from: 'QUEUED',
          to: 'PROCESSING',
          trigger: 'claimForDispatch',
          guard:
            'UPDATE ... WHERE status IN (QUEUED, RETRYING); zero rows means someone else owns it',
        },
        { from: 'QUEUED', to: 'CANCELLED', trigger: 'POST /v1/notifications/{id}/cancel' },
        {
          from: 'PROCESSING',
          to: 'SENT',
          trigger: 'provider accepted the message',
          guard: 'attempt resolved SUCCEEDED first',
        },
        {
          from: 'PROCESSING',
          to: 'RETRYING',
          trigger:
            'retryable failure, unknown outcome under RETRY, session not ready, pacing deferral, or claim reaped',
          guard:
            'for a failure, attempt number below maximum_attempts; the session, pacing and reaper paths charge no attempt',
        },
        {
          from: 'PROCESSING',
          to: 'FAILED',
          trigger:
            'permanent failure, budget exhausted, delivery window expired, or unknown outcome under FAIL_CLOSED',
        },
        { from: 'SENT', to: 'DELIVERED', trigger: 'acknowledgement merged to DEVICE or higher' },
        {
          from: 'SENT',
          to: 'FAILED',
          trigger: 'acknowledgement ERROR',
          guard: 'provider_acknowledgement_error, PERMANENT: never resent',
        },
        {
          from: 'RETRYING',
          to: 'PROCESSING',
          trigger: 'claimForDispatch when the next attempt is due',
        },
        { from: 'RETRYING', to: 'CANCELLED', trigger: 'POST /v1/notifications/{id}/cancel' },
        {
          from: 'RETRYING',
          to: 'FAILED',
          trigger: 'declared in both tables',
          guard:
            'no service issues it at the pinned commit; every failure transition expects PROCESSING',
        },
      ],
      notes: [
        'Eight statuses and twelve transitions, declared once in TypeScript and seeded into notification_status_transitions; an integration test asserts the two tables are identical.',
        'Enforced at two runtime levels: every repository write is a compare-and-swap on the expected status, and a BEFORE UPDATE trigger raises on any change not in the table. ADR 0006 also names an aggregate transitionTo(); no such function exists in the code.',
        'Cancelling a PROCESSING notification answers 409 notification_not_cancellable.',
      ],
      evidence: [
        cite(notificationStatus, [20, 44]),
        cite(transitionMigration, [29, 71]),
        cite(notificationRepository, [408, 437]),
        cite(statusGuardTest, [105, 134]),
        cite('packages/composition/src/notification/notification-query.service.ts', [176, 228]),
      ],
    },
    {
      id: 'send-attempt',
      name: 'Send attempt ledger',
      statuses: [
        {
          id: 'UNRESOLVED',
          terminal: false,
          tone: 'flight',
          note: 'outcome IS NULL and request_finished_at IS NULL, by CHECK constraint. Committed before the provider is contacted.',
        },
        { id: 'SUCCEEDED', terminal: true, tone: 'ok' },
        {
          id: 'FAILED',
          terminal: true,
          tone: 'fault',
          note: 'A classified failure whose request was answered or never written.',
        },
        {
          id: 'UNKNOWN',
          terminal: true,
          tone: 'unknown',
          note: 'Timeout, abort, connection lost, unreadable response, or an attempt found unresolved by a later dispatch.',
        },
      ],
      transitions: [
        { from: 'UNRESOLVED', to: 'SUCCEEDED', trigger: 'provider returned a message identifier' },
        { from: 'UNRESOLVED', to: 'FAILED', trigger: 'failure without unknown outcome' },
        {
          from: 'UNRESOLVED',
          to: 'UNKNOWN',
          trigger: 'unknown-outcome failure, or the next dispatch finds the row still unresolved',
        },
      ],
      notes: [
        'One row per (notification_id, attempt_number), unique. A row still UNRESOLVED when the notification comes round again means one thing: a process died with a send in flight.',
      ],
      evidence: [
        cite(sendAttemptRepository, [6, 48]),
        cite('packages/database/migrations/0003_worker_dispatch_support.sql', [10, 10]),
        cite(deliveryMigration, [168, 168]),
        cite(dispatchService, [478, 492]),
      ],
    },
    {
      id: 'idempotency-claim',
      name: 'Idempotency claim',
      statuses: [
        {
          id: 'IN_FLIGHT',
          terminal: false,
          tone: 'flight',
          note: 'Inserted with ON CONFLICT DO NOTHING; a concurrent request for the same key waits on the speculative insertion lock.',
        },
        {
          id: 'COMPLETED',
          terminal: true,
          tone: 'ok',
          note: 'Holds responseStatus, responseBody and resourceId for replays.',
        },
      ],
      transitions: [
        {
          from: 'IN_FLIGHT',
          to: 'COMPLETED',
          trigger: 'complete() in the same transaction as the notification',
          guard: 'lock_token matches',
        },
      ],
      notes: [
        'A different fingerprint under the same key answers 422; an IN_FLIGHT claim answers 409 rather than blocking.',
        'expires_at is written 24 h ahead, but nothing reads or deletes by it at the pinned commit: a claim stands until its row is removed by hand. The repository offers deleteExpired and a stale-claim takeover; nothing calls either.',
      ],
      evidence: [
        cite(idempotencyRepository, [29, 31]),
        cite(idempotencyRepository, [40, 143]),
        cite(deliveryMigration, [16, 16]),
        cite(createService, [135, 193]),
      ],
    },
    {
      id: 'webhook-delivery',
      name: 'Webhook inbox row',
      statuses: [
        {
          id: 'RECEIVED',
          terminal: false,
          tone: 'wait',
          note: 'outcome IS NULL and processed_at IS NULL, by CHECK constraint; unique on (whatsapp_session_id, provider_event_id).',
        },
        { id: 'APPLIED', terminal: true, tone: 'ok' },
        {
          id: 'IGNORED',
          terminal: true,
          tone: 'neutral',
          note: 'Inbound message, an event type with no rule, or an acknowledgement already at that level. A job redelivered after processing logs IGNORED but leaves the row and its first outcome alone.',
        },
        {
          id: 'UNMATCHED',
          terminal: true,
          tone: 'neutral',
          note: 'No notification carried the identifier after the 60 s grace window.',
        },
      ],
      transitions: [
        {
          from: 'RECEIVED',
          to: 'APPLIED',
          trigger: 'acknowledgement merged or session status recorded',
        },
        { from: 'RECEIVED', to: 'IGNORED', trigger: 'nothing to apply' },
        {
          from: 'RECEIVED',
          to: 'UNMATCHED',
          trigger: 'markProcessed after the grace window',
          guard: 'received_at older than 60 s',
        },
      ],
      evidence: [
        cite(webhookDeliveryRepository, [6, 8]),
        cite(webhookDeliveryRepository, [76, 108]),
        cite(inboxMigration, [14, 15]),
        cite(processService, [39, 47]),
        cite(processService, [200, 244]),
      ],
    },
  ],
  decisions: [
    {
      id: 'adr-0002',
      title: 'Layering enforced by package boundaries, not by convention',
      decision:
        'The domain depends on nothing, adapters depend on the domain plus their own infrastructure, composition depends on the adapters, and applications depend on composition and contracts only. Enforced by each manifest and by eight dependency-cruiser rules in CI. The ADR also names TypeScript project references and says the domain declares Zod; no tsconfig declares a reference and the domain manifest declares nothing.',
      alternatives: ['Folders inside one package with a linter rule on import paths.'],
      cost: 'A new port means touching four files. That is the price of the boundary being enforced rather than believed.',
      themes: ['boundaries', 'tooling'],
      evidence: [
        cite('docs/adr/0002-layered-packages-over-a-framework.md'),
        cite(dependencyCruiser, [10, 78]),
        cite('packages/domain/src/purity.test.ts', [16, 35]),
      ],
    },
    {
      id: 'adr-0003',
      title: 'Postgres is the only datastore',
      decision:
        'Durable storage, the job queue (pg-boss tables), the GCRA rate limiter (a plpgsql function over one row per subject) and the webhook inbox all live in one Postgres. Scheduling is a column, not a timer.',
      alternatives: ['Redis for the queue and the rate limits.'],
      cost: 'Losing Postgres loses everything at once, and every rate limit decision is a database round trip. The limiter sits behind a repository so it can move.',
      themes: ['durability', 'operability'],
      evidence: [
        cite('docs/adr/0003-postgres-as-the-only-datastore.md'),
        cite(rateLimitMigration, [15, 28]),
        cite(queueDefinitions, [24, 51]),
      ],
    },
    {
      id: 'adr-0005',
      title: 'Transactional enqueue instead of an outbox table',
      decision:
        'boss.send runs through fromDrizzle(transaction, sql), so the idempotency claim, the notification, the first event, the job and the completed claim commit or roll back together. The queue table is the outbox and there is nothing to relay.',
      alternatives: ['A hand-written outbox table plus a relay process.'],
      cost: 'The queue is tied to the same database as the domain, and the request transaction now spans the tenant role, which therefore needs INSERT on the queue tables. The soundness rests on the handler making no network call, which the ADR says a test asserts; no such test exists at the pinned commit.',
      themes: ['durability', 'correctness'],
      evidence: [
        cite('docs/adr/0005-transactional-enqueue-over-outbox.md'),
        cite(enqueueInTransaction, [6, 31]),
        cite(createService, [195, 207]),
        cite(grantSendPrivileges, [34, 45]),
      ],
    },
    {
      id: 'adr-0006',
      title: 'The notification state machine is enforced more than once',
      decision:
        'One transition table, expressed in TypeScript and seeded into notification_status_transitions. Every repository write is UPDATE ... WHERE status = expected, and a BEFORE UPDATE trigger raises on any change not in the table, so psql and data-fix migrations cannot bypass it either. No FAILED to QUEUED and no PROCESSING to CANCELLED.',
      alternatives: [
        'A single guard in application code, consulted only by the paths that remember to consult it.',
      ],
      cost: 'Fixtures cannot fabricate a notification in a state it could not have reached, and the table exists twice, so a drift test is mandatory. The ADR describes a third level, an aggregate transitionTo(); the code has none.',
      themes: ['correctness'],
      evidence: [
        cite('docs/adr/0006-state-machine-enforced-three-times.md'),
        cite(transitionMigration, [46, 71]),
        cite(notificationRepository, [408, 437]),
        cite(statusGuardTest, [105, 134]),
      ],
    },
    {
      id: 'adr-0007',
      title: 'At-least-once delivery, stated plainly',
      decision:
        'Claim before send with a compare-and-swap; consume the attempt budget in a transaction that commits before the network call; let each application choose RETRY or FAIL_CLOSED for an unknown outcome; keep a unique index on (whatsapp_session_id, provider_message_id) as the last line.',
      alternatives: [
        'Claiming exactly-once on top of a send endpoint that accepts no idempotency key.',
      ],
      cost: 'The window between the provider accepting and the worker committing is narrow but real, and FAIL_CLOSED is a genuine choice with a genuine cost.',
      themes: ['correctness', 'durability'],
      evidence: [
        cite('docs/adr/0007-at-least-once-delivery.md'),
        cite(notificationRepository, [263, 334]),
        cite(dispatchService, [335, 391]),
        cite(deliveryMigration, [173, 173]),
      ],
    },
    {
      id: 'adr-0008',
      title: 'A provider port, and a stub built before the adapter',
      decision:
        'The domain depends on WhatsAppProviderPort. packages/provider-whatsapp implements it against WAHA; tools/waha-stub implements the subset the adapter uses, deterministically, so the whole path from connect to receipt runs in CI without a phone.',
      alternatives: ['Recording real traffic and replaying it as the primary mechanism.'],
      cost: 'The stub must model the provider awkwardness, not an idealised version: when real WhatsApp reported a different identifier on the send and on the receipt, the stub had to reproduce the mismatch, and a real-WhatsApp check stays a required step.',
      themes: ['boundaries', 'tooling'],
      evidence: [
        cite('docs/adr/0008-provider-port-and-stub.md'),
        cite(providerPort, [76, 112]),
        cite(stubServer, [36, 45]),
        cite(stubServer, [58, 68]),
      ],
    },
    {
      id: 'adr-0010',
      title: 'Split API keys hashed with a keyed hash',
      decision:
        'A token is wnp_{live|test}_ plus a twelve character public identifier and a thirty-two character secret from a rejection-sampled alphabet. The identifier is indexed in clear; the secret is stored as HMAC-SHA256 under a pepper that lives in configuration, never in the database.',
      alternatives: ['Argon2 over the whole token.', 'A plain SHA-256 with no key.'],
      cost: 'Losing the pepper invalidates every key at once, and the constant-time comparison is a property of the primitive that only review protects.',
      themes: ['security'],
      evidence: [
        cite('docs/adr/0010-api-key-format-and-hashing.md'),
        cite(apiKeySecurity, [12, 19]),
        cite(apiKeySecurity, [55, 80]),
        cite('docs/security.md', [199, 201]),
      ],
    },
    {
      id: 'adr-0012',
      title: 'Rate limiting by GCRA inside Postgres',
      decision:
        'The generic cell rate algorithm in a plpgsql function: one row per subject holds the theoretical arrival time, and the decision and the write are a single INSERT ... ON CONFLICT DO UPDATE ... WHERE. WhatsApp pacing is a separate, randomised 30 to 60 s limiter in the worker.',
      alternatives: [
        'A fixed window, which permits twice the allowance across a window boundary.',
        'Read first, write second, which a concurrency test showed lets two callers through.',
      ],
      cost: 'The limiter fails open and logs ratelimit.degraded; the write costs a WAL flush, measured at 37 ms, which is why the repository sets synchronous_commit = off inside its own transaction and brings it to 0.6 ms.',
      themes: ['correctness', 'operability'],
      evidence: [
        cite('docs/adr/0012-gcra-rate-limiting-in-postgres.md'),
        cite(rateLimitMigration, [44, 63]),
        cite(rateLimitRepository, [43, 81]),
        cite('docs/performance.md', [17, 43]),
      ],
    },
    {
      id: 'adr-0013',
      title: 'One origin for the dashboard and the API',
      decision:
        'Caddy serves the built single page application and reverse-proxies /v1, /dashboard and /webhooks to the API. The cookie is first-party, there is no CORS configuration, and the bundle contains no API URL.',
      alternatives: [
        'A dashboard on its own origin with CORS, a credentialed fetch policy and a compiled-in API base URL.',
      ],
      cost: 'One more container.',
      themes: ['security', 'operability'],
      evidence: [cite('docs/adr/0013-single-origin-behind-caddy.md'), cite(caddyfile, [1, 33])],
    },
    {
      id: 'adr-0014',
      title: 'Row level security as a backstop for the public API',
      decision:
        'A platform_tenant role that cannot log in, entered with SET LOCAL ROLE and set_config inside the request transaction; one policy per table carrying application_id, USING and WITH CHECK. Roles other than platform_tenant are unrestricted, so the worker and the dashboard keep running.',
      alternatives: [
        'Forcing row level security on the owner and giving the login role BYPASSRLS.',
        'A second login role and a second connection pool.',
      ],
      cost: 'It covers only what calls withTenantScope. The whole layer is conditional on the request path entering the role, which is why a NOINHERIT probe role now pins every scoped service in a test.',
      themes: ['security'],
      evidence: [
        cite('docs/adr/0014-row-level-security-as-a-backstop.md'),
        cite(rowLevelSecurityMigration, [1, 21]),
        cite(rowLevelSecurityMigration, [56, 86]),
        cite(tenantScope, [28, 41]),
        cite(tenantScopeTest, [209, 251]),
      ],
    },
    {
      id: 'adr-0017',
      title: 'Webhooks are verified, stored, and processed asynchronously',
      decision:
        'The endpoint verifies HMAC-SHA512 over the raw bytes with a constant-time, length-guarded compare, refuses a stale timestamp, inserts into an inbox keyed by the provider event id with ON CONFLICT DO NOTHING, enqueues a job and answers 202. The worker merges acknowledgements by maximum and retries an unmatched receipt for sixty seconds.',
      alternatives: [
        'Interpreting the receipt inside the request, making the provider wait on the database.',
      ],
      cost: 'Duplicate deliveries are free, but a receipt for a message the platform did not send costs a minute of retries before it is filed UNMATCHED.',
      themes: ['correctness', 'security'],
      evidence: [
        cite('docs/adr/0017-webhook-ingestion-and-inbox.md'),
        cite(ingestService, [91, 177]),
        cite(processService, [100, 152]),
        cite(webhookModule, [112, 162]),
      ],
    },
    {
      id: 'adr-0018',
      title: 'No else, and no abbreviated identifiers',
      decision:
        'Both are lint rules: no-restricted-syntax on IfStatement > .alternate bans else and else if, and unicorn/name-replacements maps req, res, cfg, repo, db, tx and the rest to their full words, with the plugin defaults switched off because they push the wrong way.',
      alternatives: [
        'Review guidance, which decays as soon as it depends on reviewers remembering it.',
      ],
      cost: 'Names are longer and a guard clause is occasionally an awkward fit; the rule is uniform so it is never argued per case. The ADR quotes unicorn/prevent-abbreviations; the configured rule is unicorn/name-replacements.',
      themes: ['tooling'],
      evidence: [
        cite('docs/adr/0018-no-else-and-no-abbreviations.md'),
        cite('eslint.config.mjs', [6, 91]),
      ],
    },
  ],
  fragments: [
    {
      id: 'transactional-enqueue',
      title: 'The job rides the caller transaction',
      path: enqueueInTransaction,
      lines: [19, 31],
      language: 'ts',
      demonstrates:
        'pg-boss sends through fromDrizzle(transaction, sql), so the notification row and its dispatch job commit or roll back together; the queue table is the outbox.',
    },
    {
      id: 'claim-for-dispatch',
      title: 'Claim by compare-and-swap',
      path: notificationRepository,
      lines: [277, 296],
      language: 'ts',
      demonstrates:
        'UPDATE ... WHERE status IN (QUEUED, RETRYING) with a claim token. Zero rows means another worker owns it, which makes concurrent double dispatch impossible without a lock.',
    },
    {
      id: 'begin-attempt',
      title: 'Spend the attempt before the network call',
      path: notificationRepository,
      lines: [320, 333],
      language: 'ts',
      demonstrates:
        'attempt_count + 1 gated on the claim token and PROCESSING, committed before the provider is contacted, so a crash or a redelivery can never exceed maximum_attempts.',
    },
    {
      id: 'gcra-single-statement',
      title: 'GCRA in one statement',
      path: rateLimitMigration,
      lines: [53, 63],
      language: 'sql',
      demonstrates:
        'The decision and the write are one INSERT ... ON CONFLICT DO UPDATE ... WHERE, so two requests arriving together cannot both read the same state and both pass.',
    },
    {
      id: 'tenant-scope',
      title: 'Enter the tenant role for one transaction',
      path: tenantScope,
      lines: [28, 41],
      language: 'ts',
      demonstrates:
        'SET LOCAL ROLE platform_tenant and a transaction-local set_config; a pooled connection cannot carry the role or the tenant into whatever runs on it next.',
    },
    {
      id: 'tenant-isolation-policy',
      title: 'One policy for every table with a tenant key',
      path: rowLevelSecurityMigration,
      lines: [73, 81],
      language: 'sql',
      demonstrates:
        'USING and WITH CHECK both read the transaction-local setting; any role other than platform_tenant is unrestricted, which is what keeps the worker and the dashboard working.',
    },
    {
      id: 'webhook-signature',
      title: 'Verify over the exact bytes',
      path: webhookModule,
      lines: [120, 134],
      language: 'ts',
      demonstrates:
        'HMAC-SHA512 of the raw body compared with timingSafeEqual after a length guard; re-serialising the parsed object would compare a different message than the one that was signed.',
    },
    {
      id: 'transport-error-classification',
      title: 'Certainly not sent, or unknown',
      path: classifyFailure,
      lines: [126, 141],
      language: 'ts',
      demonstrates:
        'An abort, a timeout, a refused connection and a mid-flight reset become four different codes; only the pre-connection errors are certain, and the difference decides whether a fail-closed tenant stops.',
    },
    {
      id: 'retry-backoff',
      title: 'Equal jitter on an exponential curve',
      path: retryPolicy,
      lines: [34, 44],
      language: 'ts',
      demonstrates:
        '60 s times 3 to the power of attempt minus one, capped at 3600 s, then half plus a random amount up to the other half, so a retry can never fire in a burst that gets a number banned.',
    },
    {
      id: 'merge-acknowledgements',
      title: 'Receipts merge by maximum, error is sticky',
      path: acknowledgement,
      lines: [43, 53],
      language: 'ts',
      demonstrates:
        'Acknowledgements arrive out of order and repeat, so the stored value is the highest ever seen; an ERROR is never undone by a later receipt.',
    },
    {
      id: 'status-transition-table',
      title: 'The transition table',
      path: notificationStatus,
      lines: [33, 42],
      language: 'ts',
      demonstrates:
        'Eight statuses, twelve edges, three terminal states; no FAILED to QUEUED and no PROCESSING to CANCELLED. The same rows are seeded into Postgres for the trigger.',
    },
    {
      id: 'caddy-single-origin',
      title: 'One origin, five forwarded prefixes',
      path: caddyfile,
      lines: [19, 33],
      language: 'caddyfile',
      demonstrates:
        'Everything the API owns is proxied to api:3000, the webhook path included so the SPA fallback cannot swallow a provider callback.',
    },
  ],
  verification: {
    layers: [
      {
        name: 'Unit and component',
        tool: 'Vitest, Testing Library, axe-core in jsdom',
        proves:
          'The rules hold: the full status matrix, jitter bounds, the failure taxonomy, acknowledgement merging, the log vocabulary, and that every dashboard screen says the right thing and has no accessibility violations.',
        examples: [
          {
            path: 'packages/domain/src/notification/notification-status.test.ts',
            proves:
              'Exactly the documented transitions across the full status matrix; terminal statuses have no outgoing edge.',
          },
          {
            path: 'packages/domain/src/notification/retry-policy.test.ts',
            proves:
              'The jitter window at its exact bounds and a first retry no faster than the pacing window.',
          },
          {
            path: 'packages/domain/src/notification/provider-failure.test.ts',
            proves:
              'Every declared code is classified, and a refused connection is not treated as ambiguous.',
          },
          {
            path: 'packages/observability/src/log-events.test.ts',
            proves: 'No event name in the vocabulary that nothing emits.',
          },
          {
            path: 'apps/web/src/components/timeline.test.tsx',
            proves:
              'The delivery timeline groups by attempt, explains a missing read receipt, and passes axe.',
          },
          {
            path: 'apps/api/src/health/health.controller.test.ts',
            proves:
              '/health never touches a dependency; /ready consults both and reports 503 with the reason.',
          },
        ],
      },
      {
        name: 'Integration',
        tool: 'Vitest with Testcontainers Postgres 17, one container per run, truncation between tests',
        proves:
          'The database enforces what it is supposed to under real concurrency: idempotency races, the compare-and-swap claim, the trigger, the policies, the GCRA statement, and the request path actually entering tenant scope.',
        examples: [
          {
            path: notificationsApiTest,
            proves:
              'One notification for identical requests arriving at the same moment; a dispatch job for every accepted notification and none for a rejected one; 429 as problem+json.',
          },
          {
            path: dispatchIntegrationTest,
            proves:
              'Three workers racing send exactly once; an unresolved attempt is settled before any new send; the reaper returns an abandoned claim without spending an attempt.',
          },
          {
            path: webhookProcessTest,
            proves:
              'Out-of-order receipts keep the highest value; a receipt before its send is retried and one that never matches is UNMATCHED after the grace window.',
          },
          {
            path: tenantScopeTest,
            proves:
              'Served through a NOINHERIT login role with nothing on the scoped tables, every /v1 route succeeds only if SET LOCAL ROLE and set_config really ran.',
          },
          {
            path: tenantIsolationTest,
            proves:
              'A deliberately unscoped SELECT returns one tenant, a write aimed at another is refused, every table with a tenant key has a policy, and the scope dies with its transaction.',
          },
          {
            path: statusGuardTest,
            proves:
              'The seeded transition table deep-equals the TypeScript one, and the trigger refuses reviving FAILED or cancelling PROCESSING.',
          },
        ],
      },
      {
        name: 'End to end',
        tool: 'Playwright with @axe-core/playwright, against the production images with COMPOSE_PROFILES=stub',
        proves:
          'The whole thing works in a browser the way a person uses it: connect, send, watch accepted become delivered, see a retry scheduled after a provider error, and reach only your own tenant with a real key.',
        examples: [
          {
            path: 'apps/end-to-end/tests/delivery.spec.ts',
            proves:
              'Accepted to delivered as the stub reports back; a read receipt changes nothing; a provider error schedules another attempt.',
          },
          {
            path: 'apps/end-to-end/tests/api-keys.spec.ts',
            proves:
              'A key is shown once, reaches only its own application, cannot read another tenant, and stops working the moment it is revoked.',
          },
          {
            path: 'apps/end-to-end/tests/rate-limiting.spec.ts',
            proves: 'The sign-in limiter cannot be evaded by claiming a different address.',
          },
          {
            path: 'apps/end-to-end/tests/accessibility.spec.ts',
            proves: 'axe passes before sign-in and on the screens behind it.',
          },
        ],
      },
    ],
    pipeline: [
      {
        name: 'verify',
        detail:
          'Full-depth checkout, then format:check, lint, typecheck, unit tests, verify:layers, verify:unused, verify:docs, verify:secrets, pnpm audit --prod, build, verify:packaging.',
      },
      {
        name: 'integration',
        detail: 'Build, then the Testcontainers suites against the runner Docker daemon.',
      },
      {
        name: 'images',
        detail:
          'docker bake of api, worker, web, migrate and waha-stub from docker-compose.yml, cached in GHA, never pushed.',
      },
      {
        name: 'end-to-end',
        detail:
          'pnpm setup:env, COMPOSE_PROFILES=stub, docker compose up --wait, Playwright chromium; compose logs and the report are uploaded on failure.',
      },
      {
        name: 'ci-passed',
        detail:
          'The single job branch protection points at; fails unless verify, integration, images and end-to-end all succeeded.',
      },
    ],
    checks: [
      {
        command: 'pnpm verify:layers',
        refuses:
          'An import that crosses a layer: domain reaching infrastructure, an application reaching an adapter, the API importing the queue, an adapter importing composition, a cycle, production code importing a test.',
      },
      {
        command: 'pnpm verify:unused',
        refuses:
          'A file, dependency or export nothing uses, read through the source mapping rather than dist.',
      },
      {
        command: 'pnpm verify:packaging',
        refuses:
          'A package whose main or types points at a file the build never emitted, or that forgets dist in files.',
      },
      {
        command: 'pnpm verify:docs',
        refuses:
          'A dead documentation link, a mermaid block that does not parse, a placeholder, or a decision record missing from the index.',
      },
      {
        command: 'pnpm verify:secrets',
        refuses:
          'A platform API key, a high-entropy configuration secret, a database URL with a password or a private key in the tree or anywhere in history; it self-tests its own detection first.',
      },
      { command: 'pnpm audit --prod', refuses: 'A known vulnerability in anything that ships.' },
    ],
    evidence: [
      cite(ciWorkflow, [23, 210]),
      cite('package.json', [17, 24]),
      cite(dependencyCruiser, [10, 78]),
      cite('tools/scripts/verify-secrets.mjs', [96, 133]),
      cite('tools/scripts/verify-documentation.mjs', [35, 103]),
      cite('tools/scripts/verify-packaging.mjs', [54, 74]),
      cite('packages/testing/src/postgres-harness.ts', [15, 60]),
      cite('apps/end-to-end/playwright.config.ts', [13, 34]),
    ],
  },
  security: [
    {
      concern: 'A stolen database dump turning into usable API keys',
      control:
        'The secret half of a key is stored as HMAC-SHA256 under a pepper held only in configuration; verification is one indexed lookup on the public identifier and one timingSafeEqual.',
      evidence: [
        cite(apiKeySecurity, [55, 80]),
        cite(apiKeyService, [95, 113]),
        cite(environmentSchema, [117, 121]),
      ],
    },
    {
      concern: 'One tenant reading or writing another tenant rows',
      control:
        'Every repository query is scoped by application_id, foreign keys are composite on the tenant, and API-key requests run as platform_tenant under row level security with USING and WITH CHECK on every table that carries the key.',
      evidence: [
        cite(rowLevelSecurityMigration, [56, 86]),
        cite('packages/database/migrations/0008_cross_tenant_references.sql', [41, 59]),
        cite(tenantIsolationTest, [88, 166]),
      ],
    },
    {
      concern: 'Forged or replayed provider callbacks',
      control:
        'HMAC-SHA512 over the raw request bytes with a per-session key encrypted at rest, a 300 s tolerance on the timestamp header when one is sent, verification before parsing, and one indistinguishable 401 for an unknown session, a missing signature and a wrong one.',
      evidence: [
        cite(ingestService, [44, 55]),
        cite(ingestService, [101, 133]),
        cite(webhookModule, [112, 162]),
      ],
    },
    {
      concern: 'Session theft and cross-site request forgery on the dashboard',
      control:
        'An opaque 256-bit token stored as SHA-256 in an HttpOnly, SameSite=Lax cookie with a hard lifetime that is never extended, plus a double-submit CSRF token derived by HMAC from the session id and required on every unsafe method.',
      evidence: [
        cite('packages/security/src/session-token.ts', [11, 34]),
        cite('apps/api/src/http/authentication/dashboard-session.guard.ts', [44, 58]),
        cite('apps/api/src/http/authentication/csrf.ts', [10, 24]),
        cite('packages/composition/src/authentication/authentication.service.ts', [238, 272]),
      ],
    },
    {
      concern: 'Credential guessing against sign-in',
      control:
        'GCRA per address on sign-in, a hash computed even for an unknown email so timing does not reveal it, one identical error for wrong password and unknown address, a 15 minute lockout after 10 failures, and every refusal logged with its reason and address.',
      evidence: [
        cite('packages/composition/src/authentication/authentication.service.ts', [86, 99]),
        cite('packages/composition/src/authentication/authentication.service.ts', [174, 214]),
        cite('apps/api/src/http/rate-limit/credential-rate-limit.guard.ts', [10, 59]),
      ],
    },
    {
      concern: 'Secrets and personal data reaching logs',
      control:
        'pino redacts credential names at two depths and the configuration paths explicitly, message bodies and recipients are redacted, phone numbers appear only as a salted hash and a mask, and a Drizzle query error has its statement and parameters withheld.',
      evidence: [
        cite('packages/observability/src/redaction.ts', [19, 92]),
        cite(logger, [37, 100]),
        cite(dispatchService, [688, 695]),
      ],
    },
    {
      concern: 'The WhatsApp gateway as an open door',
      control:
        'WAHA is bound to 127.0.0.1 only, every request carries x-api-key, its responses are parsed with explicit schemas and an unrecognised shape becomes a failure value, and the compose file refuses to start it without a key.',
      evidence: [
        cite(compose, [179, 210]),
        cite(wahaProvider, [31, 67]),
        cite(wahaProvider, [126, 133]),
      ],
    },
    {
      concern: 'Browser-side injection and framing',
      control:
        'Caddy sets a self-only Content-Security-Policy with frame-ancestors none, X-Frame-Options DENY, nosniff and a strict Referrer-Policy, removes the Server header, and there is no CORS layer because there is no cross-origin request.',
      evidence: [cite(caddyfile, [50, 58]), cite('docs/security.md', [122, 135])],
    },
    {
      concern: 'A runtime role with more database power than it needs',
      control:
        'platform_application is not a table owner and carries statement_timeout 5 s and idle_in_transaction_session_timeout 10 s; platform_tenant gets the narrowest grants that serve the public API and no DELETE; notification_events is append-only by REVOKE.',
      evidence: [
        cite('docker/postgres/init/01-create-application-role.sh', [22, 31]),
        cite(rowLevelSecurityMigration, [24, 44]),
        cite(transitionMigration, [74, 76]),
      ],
    },
    {
      concern: 'Untrusted input reaching a handler or an error echoing it back',
      control:
        'Every body, query and path parameter is parsed by Zod or a UUID pipe before a handler sees it, malformed JSON is 400 rather than 500, errors are RFC 9457 documents that name the field and never the value, and an invalid API key is never quoted.',
      evidence: [
        cite(rawBody, [44, 52]),
        cite(problemFilter, [118, 152]),
        cite(apiKeyFormat, [48, 55]),
      ],
    },
    {
      concern: 'A tampered pagination cursor becoming a query',
      control:
        'Cursors are base64url payloads signed with HMAC-SHA256 under SECURITY_CURSOR_SIGNING_KEY and compared in constant time; a bad one is 400 invalid_cursor.',
      evidence: [
        cite('packages/composition/src/notification/notification-query.service.ts', [62, 102]),
      ],
    },
    {
      concern: 'A credential committed once and deleted later',
      control:
        'verify:secrets reads every tracked file and every commit in history, tells a real secret from a fixture by entropy, and self-tests its detection before each run; CI checks out with full depth for it.',
      evidence: [
        cite('tools/scripts/verify-secrets.mjs', [43, 80]),
        cite('tools/scripts/verify-secrets.mjs', [164, 200]),
        cite(ciWorkflow, [28, 33]),
      ],
    },
  ],
  limitations: [
    {
      statement:
        'Delivery is at-least-once. The send endpoint accepts no idempotency key, so a worker killed between WhatsApp accepting a message and the outcome committing leaves a window that cannot be closed from this side; the platform narrows it and names it.',
      evidence: [
        cite('README.md', [238, 244]),
        cite('docs/adr/0007-at-least-once-delivery.md', [42, 43]),
        cite(dispatchService, [335, 343]),
      ],
    },
    {
      statement:
        'The rate limiter fails open: when it cannot reach the database the request is served unmetered and ratelimit.degraded is logged at warning level.',
      evidence: [cite(rateLimitService, [65, 94]), cite('README.md', [262, 265])],
    },
    {
      statement:
        'Row level security covers only the paths that call withTenantScope. The worker, webhook ingestion and the dashboard run as the login role, for which the policy predicate is trivially true; /v1/applications/current is protected by application-level scoping alone.',
      evidence: [
        cite(rowLevelSecurityMigration, [47, 55]),
        cite(ingestService, [101, 105]),
        cite('README.md', [256, 261]),
        cite('docs/security.md', [230, 234]),
      ],
    },
    {
      statement:
        '/ready reports the database and the queue only. WAHA is deliberately absent, so a WhatsApp outage never makes the API report itself unready; the runbook line saying /ready reports WAHA as informational is wrong.',
      evidence: [cite(healthController, [47, 73]), cite('docs/runbook.md', [69, 70])],
    },
    {
      statement:
        'No metrics and no tracing. Observability is structured logs with a correlation id stitched through the queue hop; where the time goes inside a request is not measured.',
      evidence: [
        cite('docs/architecture.md', [239, 242]),
        cite('packages/observability/package.json', [18, 20]),
      ],
    },
    {
      statement:
        'The whatsapp.session.poll queue is declared and provisioned but nothing sends to it and nothing works it.',
      evidence: [cite(queueDefinitions, [66, 71]), cite(jobRunner, [73, 117])],
    },
    {
      statement:
        'The pg-boss client in both processes connects on DATABASE_SYSTEM_URL, the schema owner. Only the transactional enqueue runs on the request connection as platform_tenant; the polling, supervising client is not the least-privilege role.',
      evidence: [cite(queueModule, [36, 50]), cite(queueClient, [28, 46])],
    },
    {
      statement:
        'RETRYING to FAILED is declared in both transition tables, but every failure transition in the services expects PROCESSING, so no code path issues it.',
      evidence: [
        cite(notificationStatus, [39, 39]),
        cite(dispatchService, [594, 606]),
        cite(maintenanceService, [98, 107]),
      ],
    },
    {
      statement:
        'Idempotency keys do not expire. The claim is written with expires_at 24 h ahead, as the README and ADR 0011 describe, but no code reads or deletes by it at the pinned commit; a key stays claimed until its row is removed by hand.',
      evidence: [
        cite(createService, [157, 169]),
        cite(idempotencyRepository, [48, 81]),
        cite('README.md', [254, 255]),
        cite('docs/adr/0011-idempotency-keys.md', [26, 26]),
      ],
    },
    {
      statement:
        'The recipient lookup is not cached across failed attempts. The chat id the provider resolves is written to the row only with the SENT transition, so every retry before a successful send asks the provider again.',
      evidence: [cite(dispatchService, [393, 446]), cite(dispatchService, [270, 285])],
    },
    {
      statement:
        'Templates exist in the schema and not in the product: there is a table and a migration, no API and no editor.',
      evidence: [cite('README.md', [266, 268]), cite(deliveryMigration, [107, 124])],
    },
    {
      statement:
        'No password reset, no multi-factor authentication, no audit log of dashboard actions, no secret rotation with overlap; rotating the pepper invalidates every API key at once.',
      evidence: [
        cite('README.md', [274, 277]),
        cite('docs/security.md', [168, 184]),
        cite('docs/runbook.md', [171, 181]),
      ],
    },
    {
      statement:
        'Nothing has been load tested or measured at volume, and provider latency is only the stub. Several API or worker instances are supported by design (compare-and-swap claims, an advisory lock on migrations) but untested at scale.',
      evidence: [cite('docs/performance.md', [165, 178]), cite('README.md', [278, 281])],
    },
    {
      statement:
        'This is an unofficial WhatsApp integration: the number can be banned at any time and no software choice prevents it; pacing mitigates.',
      evidence: [cite('README.md', [245, 247]), cite(sessionRepository, [146, 154])],
    },
  ],
  boardFlow: 'dispatch-and-send',
});
