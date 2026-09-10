import { repositoryIdentity } from './repositories';
import { defineSystem } from './validate';

const cite = (path: string, lines?: [number, number]) => ({ path, lines });

const migration0001 = 'apps/api/migrations/0001_identity_and_tenancy.sql';
const migration0002 = 'apps/api/migrations/0002_tenant_isolation.sql';
const migration0003 = 'apps/api/migrations/0003_payments.sql';
const migration0004 = 'apps/api/migrations/0004_idempotency.sql';
const transitionTable = 'apps/api/src/domain/payment/payment-transition-table.ts';
const stateMachine = 'apps/api/src/domain/payment/payment-state-machine.ts';
const stateMachineTest = 'apps/api/src/domain/payment/payment-state-machine.test.ts';
const providerOutcome = 'apps/api/src/domain/provider/provider-outcome.ts';
const providerCapability = 'apps/api/src/domain/provider/provider-capability.ts';
const providerTest = 'apps/api/src/domain/provider/provider.test.ts';
const idempotencyDomain = 'apps/api/src/domain/idempotency/idempotency.ts';
const brCode = 'apps/api/src/domain/pix/br-code.ts';
const apiKeyDomain = 'apps/api/src/domain/api-key/api-key.ts';
const authenticate = 'apps/api/src/application/authenticate-api-key.ts';
const providerPort = 'apps/api/src/application/ports/payment-provider.ts';
const apiKeyPort = 'apps/api/src/application/ports/api-key.repository.ts';
const compositionRoot = 'apps/api/src/composition-root.ts';
const mainApi = 'apps/api/src/main.api.ts';
const createServer = 'apps/api/src/interface/http/create-server.ts';
const healthRoutes = 'apps/api/src/interface/http/routes/health.routes.ts';
const environment = 'apps/api/src/infrastructure/configuration/environment.ts';
const logger = 'apps/api/src/infrastructure/logging/logger.ts';
const database = 'apps/api/src/infrastructure/persistence/database.ts';
const migrate = 'apps/api/src/infrastructure/persistence/migrate.ts';
const migrateCli = 'apps/api/src/infrastructure/persistence/migrate-cli.ts';
const apiKeyRepository = 'apps/api/src/infrastructure/persistence/api-key.repository.ts';
const paymentCreation = 'apps/api/src/infrastructure/persistence/payment-creation.repository.ts';
const testDatabase = 'apps/api/src/infrastructure/persistence/test-database.ts';
const idempotencyIntegration =
  'apps/api/src/infrastructure/persistence/idempotency.integration.test.ts';
const paymentsIntegration = 'apps/api/src/infrastructure/persistence/payments.integration.test.ts';
const tenantIntegration =
  'apps/api/src/infrastructure/persistence/tenant-isolation.integration.test.ts';
const apiKeyIntegration = 'apps/api/src/infrastructure/persistence/api-key.integration.test.ts';
const migrateIntegration = 'apps/api/src/infrastructure/persistence/migrate.integration.test.ts';
const appmaxProvider = 'apps/api/src/infrastructure/providers/appmax/appmax-provider.ts';
const appmaxTransport = 'apps/api/src/infrastructure/providers/appmax/appmax-http-transport.ts';
const appmaxEndpoints = 'apps/api/src/infrastructure/providers/appmax/appmax-endpoints.ts';
const appmaxMappings = 'apps/api/src/infrastructure/providers/appmax/appmax-mappings.ts';
const appmaxPixResponse = 'apps/api/src/infrastructure/providers/appmax/appmax-pix-response.ts';
const appmaxTokenCache = 'apps/api/src/infrastructure/providers/appmax/appmax-token-cache.ts';
const appmaxFailure = 'apps/api/src/infrastructure/providers/appmax/appmax-failure.ts';
const appmaxProviderTest = 'apps/api/src/infrastructure/providers/appmax/appmax-provider.test.ts';
const appmaxTransportTest =
  'apps/api/src/infrastructure/providers/appmax/appmax-http-transport.test.ts';
const appmaxMappingsTest = 'apps/api/src/infrastructure/providers/appmax/appmax.test.ts';
const appmaxTokenCacheTest =
  'apps/api/src/infrastructure/providers/appmax/appmax-token-cache.test.ts';
const sharedApiKey = 'packages/shared/src/server/api-key.ts';
const sharedSecret = 'packages/shared/src/server/secret.ts';
const sharedMoney = 'packages/shared/src/money/money.ts';
const sharedCurrency = 'packages/shared/src/money/currency.ts';
const sharedIdentifier = 'packages/shared/src/identifiers/public-identifier.ts';
const compose = 'docker-compose.yml';
const dockerfile = 'docker/api.Dockerfile';
const rolesSql = 'docker/roles.sql';
const eslintConfig = 'eslint.config.js';
const rootPackage = 'package.json';
const apiPackage = 'apps/api/package.json';
const vitestConfig = 'vitest.config.ts';
const verifyDocs = 'scripts/verify-docs.mjs';
const scanSecrets = 'scripts/scan-secrets.mjs';
const validateAppmax = 'scripts/validate-appmax.mjs';
const installHooks = 'scripts/install-git-hooks.mjs';
const environmentExample = '.env.example';

export const system = defineSystem({
  id: 'mini-payment-gateway',
  name: 'Mini Payment Gateway',
  shortName: 'Gateway',
  tagline:
    'A multi-tenant Pix gateway built from the database up: the guarantees first, the HTTP surface later.',
  problem: [
    'The SQL comments in this repository describe the system it replaces. Paid-ness lived in two columns written by five uncoordinated code paths until they disagreed. A payment ceiling was enforced with a JavaScript alert. An unfamiliar provider status defaulted to pending, so every status the provider added later became a payment that waited forever.',
    'A Pix gateway also has to survive a provider that answers late or not at all. A timeout after an order was created is not a failure. Retrying it, or failing over to another provider, is how a customer receives two payable codes. The code treats Appmax webhooks as unsigned, so a webhook alone is never allowed to mark anything as paid.',
    'The repository answers with constraints rather than conventions. Tenant isolation is a PostgreSQL privilege. The payment lifecycle is one table enforced in TypeScript, by a foreign key and by a deferred trigger. Idempotency is a unique index. At the pinned commit those guarantees exist as tested units behind two health routes; the request path that will join them is not written yet.',
  ],
  thesis:
    'A payment system should be able to prove why it says paid, and should refuse to say it otherwise.',
  repository: {
    ...repositoryIdentity('mini-payment-gateway'),
    pinnedOn: '2026-09-09',
    firstCommitOn: '2026-09-08',
    commitCount: 25,
    packageManager: 'npm@11.6.2',
    runtime: 'Node.js 24',
  },
  maturity: {
    label: 'in-progress',
    statement:
      'At the pinned commit the API routes GET /health and GET /ready and nothing else; the composition root wires environment, logger and database only. Below that surface the pieces are built and tested: row level security that binds because the application role owns nothing, API key authentication through SECURITY DEFINER functions, an 11-status lifecycle enforced in TypeScript and in SQL, a five-class provider outcome taxonomy, idempotent payment creation proven under fifty racing transactions, a provider port with an Appmax adapter and an undici transport. No route, use case or job joins them yet. The site presents the domain as a labelled simulation, not as a live request path.',
    evidence: [
      cite(createServer, [43, 45]),
      cite(healthRoutes, [20, 41]),
      cite(compositionRoot, [20, 33]),
      cite(idempotencyIntegration, [166, 184]),
    ],
  },
  stack: [
    {
      technology: 'nodejs',
      role: 'Runtime for the API, the migrator and every script; pinned to the 24 line by engines and .nvmrc.',
      evidence: [cite(rootPackage, [14, 17]), cite('.nvmrc', [1, 1]), cite(dockerfile, [1, 1])],
    },
    {
      technology: 'typescript',
      role: 'Language of both workspaces under a strict base configuration with noUncheckedIndexedAccess and exactOptionalPropertyTypes.',
      evidence: [cite('tsconfig.base.json', [3, 29]), cite(rootPackage, [58, 58])],
    },
    {
      technology: 'npm',
      role: 'Workspace manager for packages/shared and apps/api; the repository pins npm 11.6.2 through packageManager.',
      evidence: [cite(rootPackage, [13, 21])],
    },
    {
      technology: 'fastify',
      role: 'HTTP server. Carries the pino instance, a validated request identifier, a body limit and a request timeout from configuration.',
      evidence: [cite(createServer, [16, 46]), cite(apiPackage, [11, 11])],
    },
    {
      technology: 'postgresql',
      role: 'The only durable store. Holds the tenant policies, the lifecycle tables, the append-only audit trail and the idempotency claims.',
      evidence: [cite(compose, [4, 32]), cite(migration0003, [13, 75])],
    },
    {
      technology: 'node-postgres',
      role: 'Raw node-postgres pool. Tenant reads and writes run inside a transaction that calls set_config for the organization.',
      evidence: [cite(database, [51, 62]), cite(apiPackage, [12, 12])],
    },
    {
      technology: 'pino',
      role: 'Structured logging with redaction paths for authorization headers, idempotency keys, secrets and tokens.',
      evidence: [cite(logger, [11, 41])],
    },
    {
      technology: 'zod',
      role: 'Validates the process environment once at startup; a missing variable stops the process before it listens.',
      evidence: [cite(environment, [3, 43])],
    },
    {
      technology: 'undici',
      role: 'HTTP client behind the Appmax transport, with explicit connect, headers and body timeouts on a dedicated Agent.',
      evidence: [cite(appmaxTransport, [85, 89]), cite(appmaxEndpoints, [44, 48])],
    },
    {
      technology: 'vitest',
      role: 'Four projects: shared, api, integration against a real PostgreSQL, and tools.',
      evidence: [cite(vitestConfig, [3, 54])],
    },
    {
      technology: 'docker',
      role: 'Compose stack with postgres, redis, migrate, roles, api and a test profile; datastores sit on an internal network with no published port.',
      evidence: [cite(compose, [1, 149]), cite(dockerfile, [1, 45])],
    },
    {
      technology: 'eslint',
      role: 'Enforces the layer boundaries, bans else and floating-point money, and expands abbreviated identifiers.',
      evidence: [cite(eslintConfig, [25, 47]), cite(eslintConfig, [139, 175])],
    },
    {
      technology: 'knip',
      role: 'Finds unused exports and dependencies across the two workspaces and the root scripts.',
      evidence: [cite('knip.json', [1, 17])],
    },
  ],
  nodes: [
    {
      id: 'client',
      label: 'HTTP caller',
      kind: 'actor',
      purpose:
        'Whoever calls the API. At the pinned commit the only wired caller is the compose healthcheck; merchants have no route to call.',
      notes: ['GET /ready has no caller in the repository; only GET /health is polled.'],
      evidence: [cite(compose, [105, 116]), cite(healthRoutes, [20, 41])],
    },
    {
      id: 'api',
      label: 'API (Fastify)',
      kind: 'process',
      purpose:
        'The HTTP process. Builds its context in dependency order with no container, registers the health routes and listens on the configured host and port.',
      technologies: ['nodejs', 'fastify', 'pino', 'zod', 'node-postgres'],
      notes: [
        'Routes at the pinned commit: GET /health and GET /ready. Nothing else is registered.',
        'Connects as payment_gateway_application, a role that owns nothing and cannot bypass row level security.',
        'Runs as the unprivileged node user on an image built with npm ci --ignore-scripts.',
        'A client-supplied x-request-id is kept only when it matches ^[\\w-]{8,64}$; otherwise it is replaced.',
      ],
      evidence: [
        cite(mainApi, [1, 29]),
        cite(compositionRoot, [15, 33]),
        cite(createServer, [14, 46]),
        cite(compose, [87, 118]),
        cite(dockerfile, [28, 45]),
      ],
    },
    {
      id: 'postgres',
      label: 'PostgreSQL 18.4',
      kind: 'store',
      purpose:
        'Twelve tables across four migrations. Enforces tenant isolation, the legal transition table, the audited status change and the idempotency claim itself.',
      technologies: ['postgresql'],
      notes: [
        'Reachable only on the internal compose network; no port is published.',
        'Every monetary column is BIGINT minor units; a test asserts there is no numeric, real, double or money column anywhere.',
        'payment_status_transitions is append-only: a trigger rejects UPDATE and DELETE.',
      ],
      evidence: [
        cite(compose, [4, 32]),
        cite(migration0001, [18, 96]),
        cite(migration0003, [84, 141]),
        cite(migration0003, [278, 289]),
        cite(paymentsIntegration, [181, 210]),
      ],
    },
    {
      id: 'redis',
      label: 'Redis 7',
      kind: 'store',
      stamp: 'unused',
      purpose:
        'Declared in compose and required as REDIS_URL by the configuration schema. No code opens a connection to it and no Redis client is a dependency.',
      notes: [
        'The compose comment reserves it for rate-limit counters and circuit-breaker state; neither exists in the code.',
        'The API waits for it to be healthy before starting, so an unused service can still block boot.',
      ],
      evidence: [cite(compose, [34, 46]), cite(environment, [16, 16]), cite(apiPackage, [9, 16])],
    },
    {
      id: 'migrate',
      label: 'Migrator',
      kind: 'job',
      purpose:
        'One-shot container that applies the numbered SQL files as the owner role under an advisory lock, one transaction per migration, and stops when an applied file has changed.',
      technologies: ['nodejs', 'node-postgres'],
      notes: [
        'Each migration commits together with its schema_migrations row, so a failure leaves neither a half-applied schema nor a false record.',
      ],
      evidence: [cite(migrate, [1, 114]), cite(migrateCli, [1, 41]), cite(compose, [48, 62])],
    },
    {
      id: 'roles',
      label: 'Role grants',
      kind: 'job',
      purpose:
        'psql run after every migration. Creates payment_gateway_application with NOSUPERUSER and NOBYPASSRLS, grants table access, revokes CREATE on the schema and all access to schema_migrations.',
      technologies: ['postgresql'],
      notes: [
        'Re-run on every startup because default privileges only cover objects created after they were set.',
      ],
      evidence: [cite(rolesSql, [1, 66]), cite(compose, [64, 85])],
    },
    {
      id: 'test-runner',
      label: 'Integration suite',
      kind: 'job',
      purpose:
        'The compose test profile. Runs the vitest integration project inside the internal network with two connections: the owner to seed and inspect, the application role to assert.',
      technologies: ['vitest', 'node-postgres'],
      notes: [
        'At the pinned commit this is the only caller of PaymentCreationRepository and PostgresApiKeyRepository.',
      ],
      evidence: [
        cite(compose, [120, 138]),
        cite(testDatabase, [4, 40]),
        cite(dockerfile, [21, 26]),
      ],
    },
    {
      id: 'validate-appmax',
      label: 'Sandbox validation script',
      kind: 'job',
      purpose:
        'Drives the compiled Appmax adapter against the real sandbox: token, one authenticated read, and optionally one order of 100 minor units whose BR Code is then checked.',
      technologies: ['nodejs'],
      notes: [
        'Exits 78 (EX_CONFIG) without credentials rather than reporting success for nothing.',
        'SANDBOX only; it never asks for production.',
        'The only caller of assertPresentableBrCode at the pinned commit.',
      ],
      evidence: [cite(validateAppmax, [1, 31]), cite(validateAppmax, [66, 135])],
    },
    {
      id: 'shared',
      label: '@gateway/shared',
      kind: 'package',
      purpose:
        'Money in bigint minor units, Crockford base32 public identifiers, the Secret wrapper and API key generation, parsing, peppered hashing and constant-time verification.',
      technologies: ['typescript'],
      notes: [
        'The root export is node-free by lint rule; node-only code lives under src/server.',
        'Only BRL is a supported currency.',
      ],
      evidence: [
        cite(sharedMoney, [9, 16]),
        cite(sharedIdentifier, [1, 37]),
        cite(sharedSecret, [1, 44]),
        cite(sharedApiKey, [1, 21]),
        cite(sharedCurrency, [6, 8]),
        cite(eslintConfig, [177, 195]),
      ],
    },
    {
      id: 'domain-payment',
      label: 'Payment lifecycle',
      kind: 'package',
      purpose:
        'The transition table as data and the state machine that reads it: terminal check first, then edge lookup, then evidence rank.',
      technologies: ['typescript'],
      notes: [
        'Pure by lint rule: the domain may not import pg, fastify, undici, pino or anything under infrastructure.',
        'The same table is seeded into legal_payment_transitions and the two are compared by a test.',
      ],
      evidence: [
        cite(transitionTable, [1, 12]),
        cite(stateMachine, [53, 81]),
        cite(eslintConfig, [139, 156]),
      ],
    },
    {
      id: 'domain-provider',
      label: 'Provider outcome and capabilities',
      kind: 'package',
      purpose:
        'Classifies how a provider call ended by what it licenses next, with unknown_outcome as the default, and declares what each provider can do.',
      technologies: ['typescript'],
      notes: [
        'assertCapabilitiesAreImplemented is written to run at startup. At the pinned commit only tests call it; the composition root does not.',
      ],
      evidence: [cite(providerOutcome, [1, 132]), cite(providerCapability, [1, 105])],
    },
    {
      id: 'domain-idempotency',
      label: 'Idempotency vocabulary',
      kind: 'package',
      purpose:
        'Canonical JSON fingerprinting and the decision about what a repeated key means: proceed, replay, in_flight or conflict.',
      technologies: ['typescript'],
      evidence: [cite(idempotencyDomain, [1, 115])],
    },
    {
      id: 'br-code-validator',
      label: 'BR Code validator',
      kind: 'package',
      purpose:
        'Checks a Pix copy-and-paste string before a customer sees it: the br.gov.bcb.pix domain, CRC16/CCITT-FALSE, and the amount in minor units against the payment.',
      technologies: ['typescript'],
      notes: [
        'At the pinned commit only validate-appmax calls it. The Appmax adapter returns the code without running this check.',
      ],
      evidence: [cite(brCode, [1, 147]), cite(validateAppmax, [202, 212])],
    },
    {
      id: 'authenticator',
      label: 'API key authentication',
      kind: 'package',
      purpose:
        'Parses a presented key, resolves it through authenticate_api_key(), verifies the peppered HMAC in constant time, and only then checks revocation, expiry and archived organization.',
      technologies: ['typescript', 'node-postgres'],
      notes: [
        'An unknown identifier still pays for one HMAC so timing does not reveal which identifiers exist.',
        'The result names the refusal reason for audit. The domain comment forbids sending it to the caller; no route exists yet to send anything.',
        'recordUse exists on the port and the repository, but authenticateApiKey does not call it at the pinned commit.',
        'Not wired into the API process at the pinned commit; constructed by the integration suite.',
      ],
      evidence: [
        cite(authenticate, [19, 62]),
        cite(apiKeyRepository, [17, 57]),
        cite(apiKeyDomain, [31, 48]),
        cite(apiKeyIntegration, [68, 76]),
      ],
    },
    {
      id: 'payment-creation-repository',
      label: 'Payment creation',
      kind: 'package',
      purpose:
        'Creates a payment at most once per idempotency key: claim, payment and completion in one transaction, with the unique index deciding races.',
      technologies: ['typescript', 'node-postgres'],
      notes: [
        'Maps unique_violation on payments_one_live_per_merchant_reference to duplicate_merchant_reference after rolling back.',
        'Not wired into the API process at the pinned commit; constructed by the integration suite.',
      ],
      evidence: [cite(paymentCreation, [51, 195]), cite(idempotencyIntegration, [55, 62])],
    },
    {
      id: 'appmax-adapter',
      label: 'Appmax adapter',
      kind: 'package',
      purpose:
        'Translates the provider port into Appmax calls and back: customer, order, Pix payment; a 13-status map into the observed lifecycle; 11 webhook events into whether a read is warranted; a single-flight token cache.',
      technologies: ['typescript'],
      notes: [
        'Declares pix.create, pix.status, order.read, refund.full and webhook.receive; no card or boleto capability.',
        'Order creation carries no idempotency key, so instrumentCreationIsIdempotent is false and the order call is attempted once.',
        'An unrecognised order status maps to unknown, never to pending.',
      ],
      evidence: [
        cite(appmaxProvider, [21, 42]),
        cite(appmaxMappings, [18, 86]),
        cite(appmaxMappings, [96, 149]),
        cite(appmaxPixResponse, [89, 116]),
        cite(appmaxTokenCache, [35, 82]),
      ],
    },
    {
      id: 'appmax-transport',
      label: 'Appmax transport (undici)',
      kind: 'package',
      purpose:
        'The HTTP transport. Exchanges client credentials for a token and sends Bearer requests. request() never throws for a status, a timeout or a connection failure: it reports what happened. fetchToken() throws AppmaxAuthenticationError when the token call fails.',
      technologies: ['undici', 'typescript'],
      notes: [
        'Endpoints are frozen per environment; an override is refused for PRODUCTION.',
        'Logs failure kinds and rejected field names, never a token, a secret or a field value.',
      ],
      evidence: [
        cite(appmaxTransport, [15, 28]),
        cite(appmaxTransport, [57, 90]),
        cite(appmaxTransport, [121, 155]),
        cite(appmaxTransport, [157, 207]),
        cite(appmaxEndpoints, [1, 26]),
      ],
    },
    {
      id: 'appmax',
      label: 'Appmax API',
      kind: 'external',
      purpose:
        'The Pix acquirer. OAuth2 client credentials at auth.sandboxappmax.com.br or auth.appmax.com.br, then /v1/customers, /v1/orders, /v1/payments/pix, /v1/orders/{id} and /v1/orders/refund-request.',
      notes: [
        'The code treats its webhooks as unsigned, which is why only an authenticated read may fund a payment.',
        'Reports order statuses in Portuguese; timestamps arrive without a zone and are read with a fixed -03:00 offset.',
      ],
      evidence: [
        cite(appmaxEndpoints, [17, 28]),
        cite(appmaxProvider, [134, 239]),
        cite(appmaxMappings, [15, 32]),
        cite(appmaxPixResponse, [69, 87]),
      ],
    },
  ],
  edges: [
    {
      id: 'client-api',
      from: 'client',
      to: 'api',
      label: 'GET /health, GET /ready',
      protocol: 'http',
      authentication: 'None. No authenticated route exists at the pinned commit.',
      payload:
        'Liveness answers {status, service, uptimeSeconds}; readiness answers {status, checks.database} with 200 or 503.',
      failureHandling:
        'Readiness returns 503 not_ready when SELECT 1 fails; liveness never consults the database.',
      evidence: [cite(healthRoutes, [16, 41]), cite(compose, [105, 116])],
    },
    {
      id: 'api-postgres',
      from: 'api',
      to: 'postgres',
      label: 'pool as payment_gateway_application',
      protocol: 'sql',
      authentication:
        'DATABASE_URL with the application role: LOGIN, NOSUPERUSER, NOBYPASSRLS, owner of nothing.',
      payload:
        'SELECT 1 for readiness; tenant work runs inside BEGIN, set_config(app.organization_id, id, true), COMMIT.',
      failureHandling:
        'withTransaction rolls back on any error and releases the client; statement_timeout defaults to 5000 ms.',
      evidence: [
        cite(database, [26, 62]),
        cite(database, [90, 98]),
        cite(compose, [96, 96]),
        cite(environment, [12, 14]),
      ],
    },
    {
      id: 'migrate-postgres',
      from: 'migrate',
      to: 'postgres',
      label: 'apply migrations as owner',
      protocol: 'sql',
      authentication: 'DATABASE_URL with payment_gateway_owner, the role that owns every table.',
      payload:
        'pg_advisory_lock, CREATE TABLE IF NOT EXISTS schema_migrations, SELECT name, checksum, then each pending file inside BEGIN and COMMIT with its record.',
      failureHandling:
        'A changed checksum raises MigrationChecksumMismatchError; a failing file rolls back with its record; the lock is released in finally and the process exits 1.',
      evidence: [cite(migrate, [67, 114]), cite(migrateCli, [12, 41]), cite(compose, [52, 56])],
    },
    {
      id: 'roles-postgres',
      from: 'roles',
      to: 'postgres',
      label: 'psql -f roles.sql as owner',
      protocol: 'sql',
      authentication:
        'The owner connection string; the application password arrives as a psql variable.',
      payload:
        'CREATE ROLE if missing, ALTER ROLE with NOSUPERUSER NOBYPASSRLS, GRANT on tables, sequences and functions, REVOKE CREATE on public and ALL on schema_migrations.',
      failureHandling:
        'ON_ERROR_STOP=1: the first failing statement stops the script and the API never starts.',
      evidence: [cite(compose, [64, 85]), cite(rolesSql, [11, 57])],
    },
    {
      id: 'test-runner-postgres',
      from: 'test-runner',
      to: 'postgres',
      label: 'owner pool to seed, application pool to assert',
      protocol: 'sql',
      authentication:
        'OWNER_DATABASE_URL for fixtures and inspection; DATABASE_URL as payment_gateway_application for every assertion about isolation.',
      payload:
        'Seeds organizations and keys, inserts payments and transition rows directly, and runs scoped and unscoped queries as the application role.',
      evidence: [
        cite(testDatabase, [26, 78]),
        cite(compose, [126, 133]),
        cite(paymentsIntegration, [91, 147]),
      ],
    },
    {
      id: 'postgres-migrate',
      from: 'postgres',
      to: 'migrate',
      label: 'service_healthy gate',
      protocol: 'orchestration',
      payload: 'migrate starts only after pg_isready over TCP succeeds.',
      evidence: [cite(compose, [18, 30]), cite(compose, [58, 60])],
    },
    {
      id: 'migrate-roles',
      from: 'migrate',
      to: 'roles',
      label: 'service_completed_successfully gate',
      protocol: 'orchestration',
      payload: 'roles starts only after the migrator exits 0.',
      evidence: [cite(compose, [81, 83])],
    },
    {
      id: 'roles-api',
      from: 'roles',
      to: 'api',
      label: 'service_completed_successfully gate',
      protocol: 'orchestration',
      payload:
        'api starts only after the grants are in place, so it never connects before its role exists.',
      evidence: [cite(compose, [100, 102])],
    },
    {
      id: 'redis-api',
      from: 'redis',
      to: 'api',
      label: 'service_healthy gate',
      protocol: 'orchestration',
      payload: 'api waits for redis-cli ping although no code connects to Redis.',
      evidence: [cite(compose, [40, 44]), cite(compose, [103, 104])],
    },
    {
      id: 'roles-test-runner',
      from: 'roles',
      to: 'test-runner',
      label: 'service_completed_successfully gate',
      protocol: 'orchestration',
      payload:
        'The test profile runs only after migrations and grants, against the same role the API uses.',
      evidence: [cite(compose, [134, 136])],
    },
    {
      id: 'test-runner-payment-creation',
      from: 'test-runner',
      to: 'payment-creation-repository',
      label: 'createPayment(command)',
      protocol: 'in-process',
      payload:
        'CreatePaymentCommand: organization, environment, merchant reference, method, currency, expected amount, idempotency key, request path and body.',
      evidence: [
        cite(idempotencyIntegration, [31, 45]),
        cite(idempotencyIntegration, [55, 62]),
        cite(paymentCreation, [9, 29]),
      ],
    },
    {
      id: 'test-runner-authenticator',
      from: 'test-runner',
      to: 'authenticator',
      label: 'authenticateApiKey(plaintext, dependencies)',
      protocol: 'in-process',
      payload:
        'The presented key, a PostgresApiKeyRepository on the application pool, the pepper and a clock.',
      evidence: [cite(apiKeyIntegration, [68, 76]), cite(apiKeyIntegration, [236, 251])],
    },
    {
      id: 'payment-creation-postgres',
      from: 'payment-creation-repository',
      to: 'postgres',
      label: 'claim, payment, completion in one transaction',
      protocol: 'sql',
      authentication:
        'The application pool; set_config(app.organization_id) is the first statement after BEGIN.',
      payload:
        'INSERT idempotency_records ON CONFLICT DO NOTHING RETURNING id; INSERT payments; UPDATE idempotency_records SET state completed, response_status 201, payment_id.',
      failureHandling:
        'Any error rolls the whole transaction back, including the claim; unique_violation on the merchant reference index becomes duplicate_merchant_reference.',
      evidence: [cite(paymentCreation, [68, 127]), cite(paymentCreation, [173, 194])],
    },
    {
      id: 'payment-creation-idempotency',
      from: 'payment-creation-repository',
      to: 'domain-idempotency',
      label: 'fingerprintRequest, decideForExistingRecord',
      protocol: 'in-process',
      payload:
        'Request path and body in; a 32-byte fingerprint and a replay, in_flight or conflict decision out.',
      evidence: [
        cite(paymentCreation, [3, 7]),
        cite(paymentCreation, [72, 72]),
        cite(paymentCreation, [148, 170]),
      ],
    },
    {
      id: 'payment-creation-shared',
      from: 'payment-creation-repository',
      to: 'shared',
      label: 'generatePublicIdentifier(payment)',
      protocol: 'in-process',
      payload: 'A pay_ prefixed 26-character Crockford identifier with 130 bits of entropy.',
      evidence: [
        cite(paymentCreation, [2, 2]),
        cite(paymentCreation, [94, 94]),
        cite(sharedIdentifier, [73, 75]),
      ],
    },
    {
      id: 'authenticator-postgres',
      from: 'authenticator',
      to: 'postgres',
      label: 'SELECT * FROM authenticate_api_key($1)',
      protocol: 'sql',
      authentication:
        'The application role, for which api_keys returns no rows without a tenant scope; the SECURITY DEFINER function runs as the owner for this one lookup.',
      payload:
        'The public key identifier in; api_key_id, organization_id, environment, key_hash, scopes, revoked_at, expires_at and organization_archived_at out. Never a secret.',
      failureHandling:
        'A failed query rejects and the caller decides. record_api_key_use is exposed as recordUse; the port comment says its call site must not fail an authenticated request, and no call site exists at the pinned commit.',
      evidence: [
        cite(apiKeyRepository, [29, 56]),
        cite(migration0002, [25, 74]),
        cite(apiKeyPort, [27, 31]),
        cite(apiKeyIntegration, [105, 114]),
      ],
    },
    {
      id: 'authenticator-shared',
      from: 'authenticator',
      to: 'shared',
      label: 'parseApiKey, hashApiKeySecret, isApiKeySecretValid',
      protocol: 'in-process',
      payload:
        'mpg_test_ or mpg_live_ plus a 12-character identifier and a 32-character secret; HMAC-SHA256 of identifier.secret under the pepper; timingSafeEqual against the stored hash.',
      evidence: [
        cite(authenticate, [1, 2]),
        cite(authenticate, [23, 44]),
        cite(sharedApiKey, [81, 142]),
      ],
    },
    {
      id: 'appmax-adapter-transport',
      from: 'appmax-adapter',
      to: 'appmax-transport',
      label: 'AppmaxTransport.request',
      protocol: 'in-process',
      payload:
        'method, path, the access token as a Secret and an optional JSON body; a TransportResult plus parsed body back.',
      failureHandling:
        'The port contract forbids throwing for a status or a timeout; the adapter classifies the TransportResult through the outcome taxonomy.',
      evidence: [
        cite(appmaxProvider, [44, 67]),
        cite(appmaxProvider, [69, 85]),
        cite(appmaxTransport, [57, 57]),
      ],
    },
    {
      id: 'appmax-transport-appmax',
      from: 'appmax-transport',
      to: 'appmax',
      label: 'OAuth2 token, then Bearer requests',
      protocol: 'https',
      authentication:
        'POST /oauth2/token with form-encoded client credentials; then authorization: Bearer <token>, the only place the token is exposed.',
      payload:
        'JSON bodies for /v1/customers, /v1/orders, /v1/payments/pix and /v1/orders/refund-request; GET /v1/orders/{id} for reads.',
      failureHandling:
        'connect 5 s, headers 15 s, body 15 s. ECONNREFUSED, ENOTFOUND and connect timeouts are reported as never delivered; headers and body timeouts as timeout; anything after the request was written stays ambiguous. A failed token call throws AppmaxAuthenticationError and nothing retries it.',
      evidence: [
        cite(appmaxTransport, [42, 55]),
        cite(appmaxTransport, [121, 155]),
        cite(appmaxTransport, [157, 207]),
        cite(appmaxEndpoints, [17, 48]),
      ],
    },
    {
      id: 'appmax-adapter-domain-provider',
      from: 'appmax-adapter',
      to: 'domain-provider',
      label: 'classifyTransportResult',
      protocol: 'in-process',
      payload:
        'A TransportResult in; success, safe_failure, definitive_failure, retryable_transport_failure or unknown_outcome out.',
      evidence: [
        cite(appmaxProvider, [11, 12]),
        cite(appmaxProvider, [74, 74]),
        cite(providerOutcome, [90, 132]),
      ],
    },
    {
      id: 'validate-appmax-adapter',
      from: 'validate-appmax',
      to: 'appmax-adapter',
      label: 'drives the compiled adapter',
      protocol: 'in-process',
      authentication:
        'APPMAX_CLIENT_ID and APPMAX_CLIENT_SECRET read from process.env; the secret is wrapped in Secret before it reaches the transport.',
      payload:
        'fetchToken, readPaymentState(1) for connectivity, and one createPixInstrument of 100 minor units when a document number is set.',
      failureHandling:
        'Exits 78 without credentials; a failed token marks the remaining steps skipped rather than passed.',
      evidence: [
        cite(validateAppmax, [33, 39]),
        cite(validateAppmax, [90, 135]),
        cite(validateAppmax, [165, 191]),
      ],
    },
    {
      id: 'validate-appmax-br-code',
      from: 'validate-appmax',
      to: 'br-code-validator',
      label: 'assertPresentableBrCode(code, 100n)',
      protocol: 'in-process',
      payload: 'The copy-and-paste code Appmax returned and the amount the order was created with.',
      evidence: [cite(validateAppmax, [102, 104]), cite(validateAppmax, [202, 212])],
    },
  ],
  flows: [
    {
      id: 'readiness-probe',
      name: 'Readiness probe',
      kind: 'request',
      summary:
        'The one request path that exists at the pinned commit. Liveness and readiness are separate on purpose: an orchestrator must not restart a healthy process because its database blinked.',
      levers: [
        {
          id: 'database',
          label: 'Database',
          options: [
            { value: 'reachable', label: 'Reachable' },
            { value: 'unreachable', label: 'Unreachable' },
          ],
          defaultValue: 'reachable',
        },
      ],
      steps: [
        {
          at: 0,
          ledger: 'GET /ready',
          tone: 'flight',
          edge: 'client-api',
          evidence: [cite(healthRoutes, [26, 26])],
        },
        {
          at: 600,
          ledger:
            'request.id: x-request-id kept when it matches ^[\\w-]{8,64}$, otherwise randomUUID()',
          tone: 'ok',
          node: 'api',
          evidence: [cite(createServer, [14, 32])],
        },
        {
          at: 1200,
          ledger: 'database.checkHealth: SELECT 1 on the pool, statement_timeout 5000 ms',
          tone: 'flight',
          edge: 'api-postgres',
          evidence: [cite(database, [64, 67]), cite(environment, [14, 14])],
        },
        {
          at: 1800,
          ledger: 'SELECT 1 answered; duration taken from process.hrtime',
          tone: 'ok',
          node: 'postgres',
          when: [{ lever: 'database', value: 'reachable' }],
          evidence: [cite(database, [67, 71])],
        },
        {
          at: 1800,
          ledger: 'pool.query failed: isReachable false, error message captured',
          tone: 'fault',
          node: 'postgres',
          when: [{ lever: 'database', value: 'unreachable' }],
          evidence: [cite(database, [72, 78])],
        },
        {
          at: 2400,
          ledger:
            'onSend: x-request-id, cache-control no-store, x-content-type-options nosniff, referrer-policy no-referrer, x-frame-options DENY',
          tone: 'neutral',
          node: 'api',
          evidence: [cite(createServer, [35, 41])],
        },
        {
          at: 3000,
          ledger: '200 {status: ready, checks.database.status: up}',
          tone: 'ok',
          edge: 'client-api',
          when: [{ lever: 'database', value: 'reachable' }],
          evidence: [cite(healthRoutes, [36, 38])],
        },
        {
          at: 3000,
          ledger: '503 {status: not_ready, checks.database.status: down}',
          tone: 'fault',
          edge: 'client-api',
          when: [{ lever: 'database', value: 'unreachable' }],
          evidence: [cite(healthRoutes, [40, 40])],
        },
        {
          at: 3600,
          ledger: 'GET /health stays 200: liveness never consults the database',
          tone: 'neutral',
          node: 'api',
          evidence: [cite(healthRoutes, [10, 24])],
        },
        {
          at: 4200,
          ledger:
            'compose healthcheck: GET /health every 10 s; nothing in the repository calls /ready',
          tone: 'neutral',
          node: 'client',
          evidence: [cite(compose, [105, 116])],
        },
      ],
    },
    {
      id: 'idempotent-creation',
      name: 'Idempotent payment creation',
      kind: 'request',
      summary:
        'Domain simulation. No HTTP route reaches PaymentCreationRepository at the pinned commit; the integration suite does. The claim, the payment and the completion commit in one transaction, and a repeated key is answered from the record.',
      levers: [
        {
          id: 'presented',
          label: 'Key presented',
          options: [
            { value: 'first-time', label: 'First time' },
            { value: 'retry', label: 'Retry, same body' },
            { value: 'conflict', label: 'Same key, different body' },
          ],
          defaultValue: 'first-time',
        },
      ],
      steps: [
        {
          at: 0,
          ledger:
            'createPayment: key k1, path /v1/payments, body {amount 10000, currency BRL, reference}',
          tone: 'flight',
          edge: 'test-runner-payment-creation',
          evidence: [cite(idempotencyIntegration, [31, 45])],
        },
        {
          at: 600,
          ledger: "BEGIN; set_config('app.organization_id', merchantA, true)",
          tone: 'flight',
          edge: 'payment-creation-postgres',
          evidence: [cite(paymentCreation, [176, 180])],
        },
        {
          at: 1200,
          ledger:
            'fingerprint = sha256(path, newline, canonical JSON): key order and whitespace do not matter',
          tone: 'ok',
          node: 'domain-idempotency',
          evidence: [cite(paymentCreation, [72, 72]), cite(idempotencyDomain, [43, 66])],
        },
        {
          at: 1800,
          ledger:
            'INSERT idempotency_records (k1, fingerprint, path, state in_flight) ON CONFLICT (organization_id, environment, idempotency_key) DO NOTHING RETURNING id',
          tone: 'flight',
          edge: 'payment-creation-postgres',
          evidence: [cite(paymentCreation, [74, 87])],
        },
        {
          at: 2400,
          ledger: 'claim.won: 1 row returned',
          tone: 'ok',
          node: 'postgres',
          when: [{ lever: 'presented', value: 'first-time' }],
          evidence: [cite(paymentCreation, [89, 92])],
        },
        {
          at: 2400,
          ledger: 'claim.refused: 0 rows, k1 already held',
          tone: 'wait',
          node: 'postgres',
          when: [{ lever: 'presented', value: 'retry' }],
          evidence: [cite(paymentCreation, [89, 92])],
        },
        {
          at: 2400,
          ledger: 'claim.refused: 0 rows, k1 already held',
          tone: 'wait',
          node: 'postgres',
          when: [{ lever: 'presented', value: 'conflict' }],
          evidence: [cite(paymentCreation, [89, 92])],
        },
        {
          at: 3000,
          ledger:
            'INSERT payments (public_id pay_..., merchant_reference, expected_amount_minor 10000); status defaults to pending',
          tone: 'flight',
          edge: 'payment-creation-postgres',
          status: { machine: 'payment', value: 'pending' },
          when: [{ lever: 'presented', value: 'first-time' }],
          evidence: [cite(paymentCreation, [94, 110]), cite(migration0003, [100, 100])],
        },
        {
          at: 3600,
          ledger:
            'policy payments_tenant_isolation WITH CHECK organization_id = current_organization_id(): holds',
          tone: 'ok',
          node: 'postgres',
          when: [{ lever: 'presented', value: 'first-time' }],
          evidence: [cite(migration0003, [295, 297])],
        },
        {
          at: 4200,
          ledger:
            'UPDATE idempotency_records SET state completed, response_status 201, response_body {id, status pending}, payment_id, completed_at now()',
          tone: 'flight',
          edge: 'payment-creation-postgres',
          when: [{ lever: 'presented', value: 'first-time' }],
          evidence: [cite(paymentCreation, [117, 124])],
        },
        {
          at: 4800,
          ledger: 'COMMIT: claim, payment and completion land together or not at all',
          tone: 'ok',
          node: 'postgres',
          when: [{ lever: 'presented', value: 'first-time' }],
          evidence: [cite(paymentCreation, [182, 183]), cite(migration0004, [9, 11])],
        },
        {
          at: 5400,
          ledger: 'result.created {paymentId, publicId}',
          tone: 'ok',
          node: 'payment-creation-repository',
          when: [{ lever: 'presented', value: 'first-time' }],
          evidence: [cite(paymentCreation, [126, 126])],
        },
        {
          at: 3000,
          ledger:
            'SELECT request_fingerprint, request_path, state, response_status, response_body FROM idempotency_records WHERE key = k1',
          tone: 'flight',
          edge: 'payment-creation-postgres',
          when: [{ lever: 'presented', value: 'retry' }],
          evidence: [cite(paymentCreation, [134, 139])],
        },
        {
          at: 3000,
          ledger:
            'SELECT request_fingerprint, request_path, state, response_status, response_body FROM idempotency_records WHERE key = k1',
          tone: 'flight',
          edge: 'payment-creation-postgres',
          when: [{ lever: 'presented', value: 'conflict' }],
          evidence: [cite(paymentCreation, [134, 139])],
        },
        {
          at: 3600,
          ledger: 'decideForExistingRecord: same path, same fingerprint, state completed -> replay',
          tone: 'ok',
          node: 'domain-idempotency',
          when: [{ lever: 'presented', value: 'retry' }],
          evidence: [cite(idempotencyDomain, [89, 115])],
        },
        {
          at: 3600,
          ledger:
            'decideForExistingRecord: fingerprint differs -> conflict; the first response is not handed to a different request',
          tone: 'fault',
          node: 'domain-idempotency',
          when: [{ lever: 'presented', value: 'conflict' }],
          evidence: [cite(idempotencyDomain, [68, 79]), cite(idempotencyDomain, [99, 101])],
        },
        {
          at: 4200,
          ledger: 'result.replayed 201 {id, status pending}; no second payment',
          tone: 'ok',
          node: 'payment-creation-repository',
          when: [{ lever: 'presented', value: 'retry' }],
          evidence: [cite(paymentCreation, [160, 166])],
        },
        {
          at: 4200,
          ledger: 'result.conflict: nothing written, the empty transaction commits',
          tone: 'fault',
          node: 'payment-creation-repository',
          when: [{ lever: 'presented', value: 'conflict' }],
          evidence: [cite(paymentCreation, [167, 169]), cite(paymentCreation, [182, 183])],
        },
        {
          at: 6000,
          ledger: 'count(payments where merchant_reference) = 1 in every case',
          tone: 'ok',
          node: 'test-runner',
          evidence: [cite(idempotencyIntegration, [47, 53])],
        },
      ],
      assertedBy: [
        cite(idempotencyIntegration, [76, 105]),
        cite(idempotencyIntegration, [107, 163]),
      ],
    },
    {
      id: 'racing-keys',
      name: 'Racing and repeated keys',
      kind: 'asynchronous',
      summary:
        'Domain simulation. Concurrent transactions carrying one key reach the INSERT together with nothing coordinating them; the unique index serialises them and the losers are told what the winner did. A fresh key does not escape the merchant reference.',
      levers: [
        {
          id: 'racers',
          label: 'Racers',
          options: [
            { value: 'fifty-identical', label: '50 identical requests' },
            { value: 'twenty-conflicting', label: '20 different bodies' },
            { value: 'fresh-key-same-reference', label: 'Fresh key, same reference' },
          ],
          defaultValue: 'fifty-identical',
        },
      ],
      steps: [
        {
          at: 0,
          ledger: '50 createPayment issued at once with Promise.all: one key, one body',
          tone: 'flight',
          edge: 'test-runner-payment-creation',
          when: [{ lever: 'racers', value: 'fifty-identical' }],
          evidence: [cite(idempotencyIntegration, [166, 174])],
        },
        {
          at: 0,
          ledger: '20 createPayment issued at once: one key, amounts 1000 to 1019',
          tone: 'flight',
          edge: 'test-runner-payment-creation',
          when: [{ lever: 'racers', value: 'twenty-conflicting' }],
          evidence: [cite(idempotencyIntegration, [186, 200])],
        },
        {
          at: 0,
          ledger: 'createPayment(command), then createPayment({...command, idempotencyKey: k2})',
          tone: 'flight',
          edge: 'test-runner-payment-creation',
          when: [{ lever: 'racers', value: 'fresh-key-same-reference' }],
          evidence: [cite(idempotencyIntegration, [297, 308])],
        },
        {
          at: 600,
          ledger: '50 transactions reach INSERT idempotency_records together',
          tone: 'flight',
          edge: 'payment-creation-postgres',
          when: [{ lever: 'racers', value: 'fifty-identical' }],
          evidence: [cite(paymentCreation, [59, 63])],
        },
        {
          at: 600,
          ledger: '20 transactions reach INSERT idempotency_records together',
          tone: 'flight',
          edge: 'payment-creation-postgres',
          when: [{ lever: 'racers', value: 'twenty-conflicting' }],
          evidence: [cite(paymentCreation, [59, 63])],
        },
        {
          at: 1200,
          ledger:
            'unique constraint idempotency_key_is_unique_per_tenant: one INSERT proceeds, the others block on the uncommitted winner',
          tone: 'wait',
          node: 'postgres',
          when: [{ lever: 'racers', value: 'fifty-identical' }],
          evidence: [cite(migration0004, [37, 41])],
        },
        {
          at: 1200,
          ledger:
            'unique constraint idempotency_key_is_unique_per_tenant: one INSERT proceeds, the others block on the uncommitted winner',
          tone: 'wait',
          node: 'postgres',
          when: [{ lever: 'racers', value: 'twenty-conflicting' }],
          evidence: [cite(migration0004, [37, 41])],
        },
        {
          at: 2000,
          ledger: 'winner COMMITs: payment inserted, record completed',
          tone: 'ok',
          node: 'postgres',
          status: { machine: 'payment', value: 'pending' },
          when: [{ lever: 'racers', value: 'fifty-identical' }],
          evidence: [cite(paymentCreation, [94, 126])],
        },
        {
          at: 2000,
          ledger: 'winner COMMITs: payment inserted, record completed',
          tone: 'ok',
          node: 'postgres',
          status: { machine: 'payment', value: 'pending' },
          when: [{ lever: 'racers', value: 'twenty-conflicting' }],
          evidence: [cite(paymentCreation, [94, 126])],
        },
        {
          at: 2600,
          ledger:
            'blocked INSERTs resume; DO NOTHING returns 0 rows; 49 transactions SELECT the winner record',
          tone: 'flight',
          edge: 'payment-creation-postgres',
          when: [{ lever: 'racers', value: 'fifty-identical' }],
          evidence: [cite(paymentCreation, [129, 139])],
        },
        {
          at: 2600,
          ledger:
            'blocked INSERTs resume; DO NOTHING returns 0 rows; 19 transactions SELECT the winner record',
          tone: 'flight',
          edge: 'payment-creation-postgres',
          when: [{ lever: 'racers', value: 'twenty-conflicting' }],
          evidence: [cite(paymentCreation, [129, 139])],
        },
        {
          at: 3200,
          ledger: '49 decisions: replay (same fingerprint) or in_flight; created = 1',
          tone: 'ok',
          node: 'domain-idempotency',
          when: [{ lever: 'racers', value: 'fifty-identical' }],
          evidence: [cite(idempotencyIntegration, [176, 182])],
        },
        {
          at: 3200,
          ledger:
            '19 decisions: conflict, the amounts differ so the fingerprints differ; created = 1',
          tone: 'fault',
          node: 'domain-idempotency',
          when: [{ lever: 'racers', value: 'twenty-conflicting' }],
          evidence: [cite(idempotencyIntegration, [202, 203])],
        },
        {
          at: 600,
          ledger: 'first transaction: claim k1, INSERT payments, complete, COMMIT',
          tone: 'flight',
          edge: 'payment-creation-postgres',
          status: { machine: 'payment', value: 'pending' },
          when: [{ lever: 'racers', value: 'fresh-key-same-reference' }],
          evidence: [cite(idempotencyIntegration, [301, 303])],
        },
        {
          at: 1200,
          ledger:
            'second transaction: claim k2 won; INSERT payments with the same merchant_reference',
          tone: 'flight',
          edge: 'payment-creation-postgres',
          when: [{ lever: 'racers', value: 'fresh-key-same-reference' }],
          evidence: [cite(idempotencyIntegration, [305, 308])],
        },
        {
          at: 1800,
          ledger:
            'unique_violation 23505 on payments_one_live_per_merchant_reference (partial: status NOT IN failed, cancelled, expired, refunded)',
          tone: 'fault',
          node: 'postgres',
          when: [{ lever: 'racers', value: 'fresh-key-same-reference' }],
          evidence: [cite(migration0003, [143, 148])],
        },
        {
          at: 2400,
          ledger:
            'ROLLBACK: the k2 claim disappears with the failed payment; result.duplicate_merchant_reference',
          tone: 'fault',
          node: 'payment-creation-repository',
          when: [{ lever: 'racers', value: 'fresh-key-same-reference' }],
          evidence: [cite(paymentCreation, [185, 190])],
        },
        {
          at: 4200,
          ledger: 'exactly one payment for the reference; at most one idempotency row per key',
          tone: 'ok',
          node: 'test-runner',
          evidence: [
            cite(idempotencyIntegration, [214, 226]),
            cite(idempotencyIntegration, [310, 311]),
          ],
        },
      ],
      assertedBy: [
        cite(idempotencyIntegration, [165, 227]),
        cite(idempotencyIntegration, [297, 313]),
      ],
    },
    {
      id: 'provider-outcome',
      name: 'Provider call and its outcome class',
      kind: 'failure',
      summary:
        'Domain simulation. The adapter creates a Pix instrument; the transport reports what happened without throwing; the taxonomy decides what is licensed next; the state machine moves the payment. No code at the pinned commit joins the adapter to the state machine, so the trace shows the decisions each part already makes.',
      levers: [
        {
          id: 'appmax',
          label: 'Appmax answers the order call with',
          options: [
            { value: 'answers-2xx', label: '2xx' },
            { value: 'refuses-422', label: '422' },
            { value: 'answers-5xx', label: '5xx' },
            { value: 'times-out', label: 'Timeout' },
          ],
          defaultValue: 'answers-2xx',
        },
      ],
      steps: [
        {
          at: 0,
          ledger: 'decideTransition(pending, PROVIDER_REQUEST_SENT, internal) -> processing',
          tone: 'ok',
          node: 'domain-payment',
          status: { machine: 'payment', value: 'processing' },
          evidence: [cite(transitionTable, [102, 108])],
        },
        {
          at: 600,
          ledger:
            'tokens.currentToken: held token reused; renewed 60 s before expiry; concurrent callers share one fetch',
          tone: 'ok',
          node: 'appmax-adapter',
          evidence: [cite(appmaxTokenCache, [60, 74])],
        },
        {
          at: 1200,
          ledger: 'POST /v1/customers {first_name, last_name, email, phone, document_number, ip}',
          tone: 'flight',
          edge: 'appmax-adapter-transport',
          evidence: [cite(appmaxProvider, [134, 146])],
        },
        {
          at: 1800,
          ledger: 'authorization: Bearer <token>; timeouts connect 5 s, headers 15 s, body 15 s',
          tone: 'flight',
          edge: 'appmax-transport-appmax',
          evidence: [cite(appmaxTransport, [165, 176]), cite(appmaxEndpoints, [44, 48])],
        },
        {
          at: 2400,
          ledger: '200 data.customer.id 2023',
          tone: 'ok',
          node: 'appmax',
          evidence: [cite(appmaxProvider, [249, 254]), cite(appmaxProviderTest, [58, 58])],
        },
        {
          at: 3000,
          ledger:
            'POST /v1/orders {customer_id 2023, products_value 12300 in integer cents, products[0].sku reference}',
          tone: 'flight',
          edge: 'appmax-adapter-transport',
          evidence: [cite(appmaxProvider, [153, 175])],
        },
        {
          at: 3600,
          ledger:
            'order.create carries no idempotency key and no external reference: attempted once, never retried',
          tone: 'wait',
          node: 'appmax-adapter',
          evidence: [cite(appmaxProvider, [28, 41])],
        },
        {
          at: 4500,
          ledger: '200 data.order.id 3531',
          tone: 'ok',
          node: 'appmax',
          when: [{ lever: 'appmax', value: 'answers-2xx' }],
          evidence: [cite(appmaxPixResponse, [132, 147])],
        },
        {
          at: 4500,
          ledger: '422 {errors: {customer: ...}}',
          tone: 'fault',
          node: 'appmax',
          when: [{ lever: 'appmax', value: 'refuses-422' }],
          evidence: [cite(appmaxProviderTest, [138, 146])],
        },
        {
          at: 4500,
          ledger: '502 from Appmax',
          tone: 'fault',
          node: 'appmax',
          when: [{ lever: 'appmax', value: 'answers-5xx' }],
        },
        {
          at: 4500,
          ledger: 'no response headers within 15 s',
          tone: 'wait',
          node: 'appmax',
          when: [{ lever: 'appmax', value: 'times-out' }],
          evidence: [cite(appmaxEndpoints, [30, 48])],
        },
        {
          at: 5100,
          ledger: 'transport {kind response, httpStatus 200}; body parsed',
          tone: 'ok',
          node: 'appmax-transport',
          when: [{ lever: 'appmax', value: 'answers-2xx' }],
          evidence: [cite(appmaxTransport, [210, 234])],
        },
        {
          at: 5100,
          ledger:
            'transport {kind response, httpStatus 422}: reported, not thrown; validation_failure logged with field names only',
          tone: 'fault',
          node: 'appmax-transport',
          when: [{ lever: 'appmax', value: 'refuses-422' }],
          evidence: [
            cite(appmaxTransport, [191, 204]),
            cite(appmaxFailure, [94, 99]),
            cite(appmaxFailure, [119, 128]),
          ],
        },
        {
          at: 5100,
          ledger:
            'transport {kind response, httpStatus 502}: reported, not thrown; provider_unavailable logged',
          tone: 'fault',
          node: 'appmax-transport',
          when: [{ lever: 'appmax', value: 'answers-5xx' }],
          evidence: [cite(appmaxTransport, [191, 204]), cite(appmaxFailure, [100, 105])],
        },
        {
          at: 5100,
          ledger: 'UND_ERR_HEADERS_TIMEOUT -> transport {kind timeout}: reported, not thrown',
          tone: 'unknown',
          node: 'appmax-transport',
          when: [{ lever: 'appmax', value: 'times-out' }],
          evidence: [cite(appmaxTransport, [42, 55])],
        },
        {
          at: 5700,
          ledger: 'POST /v1/payments/pix {order_id 3531, payment_data.pix.document_number}',
          tone: 'flight',
          edge: 'appmax-adapter-transport',
          when: [{ lever: 'appmax', value: 'answers-2xx' }],
          evidence: [cite(appmaxProvider, [185, 193])],
        },
        {
          at: 6300,
          ledger:
            'normalizePixResponse: emv_code read from data.pix; expires_at read with a -03:00 offset',
          tone: 'ok',
          node: 'appmax-adapter',
          when: [{ lever: 'appmax', value: 'answers-2xx' }],
          evidence: [cite(appmaxPixResponse, [69, 116])],
        },
        {
          at: 6900,
          ledger:
            'result.success {copyAndPasteCode, qrCodeImageDataUri, expiresAt}; providerReference 3531',
          tone: 'ok',
          node: 'appmax-adapter',
          when: [{ lever: 'appmax', value: 'answers-2xx' }],
          evidence: [cite(appmaxProvider, [195, 201])],
        },
        {
          at: 7500,
          ledger:
            'assertPresentableBrCode: br.gov.bcb.pix declared, CRC16 verified, amount equals expected. Called by validate-appmax only; the adapter does not run it',
          tone: 'neutral',
          node: 'br-code-validator',
          when: [{ lever: 'appmax', value: 'answers-2xx' }],
          evidence: [cite(brCode, [129, 147]), cite(validateAppmax, [202, 204])],
        },
        {
          at: 8100,
          ledger:
            'decideTransition(processing, INSTRUMENT_ISSUED, authenticated_provider_read) -> awaiting_payment',
          tone: 'ok',
          node: 'domain-payment',
          status: { machine: 'payment', value: 'awaiting_payment' },
          when: [{ lever: 'appmax', value: 'answers-2xx' }],
          evidence: [cite(transitionTable, [124, 130])],
        },
        {
          at: 5700,
          ledger:
            'classifyTransportResult(422) -> safe_failure: the provider declined and created nothing; canFailOver true',
          tone: 'ok',
          node: 'domain-provider',
          when: [{ lever: 'appmax', value: 'refuses-422' }],
          evidence: [cite(providerOutcome, [107, 118]), cite(providerOutcome, [47, 52])],
        },
        {
          at: 6300,
          ledger:
            'decideTransition(processing, SAFE_FAILURE_OBSERVED, authenticated_provider_read) -> pending: another provider may be attempted',
          tone: 'ok',
          node: 'domain-payment',
          status: { machine: 'payment', value: 'pending' },
          when: [{ lever: 'appmax', value: 'refuses-422' }],
          evidence: [cite(transitionTable, [146, 152])],
        },
        {
          at: 5700,
          ledger:
            'classifyTransportResult(502) -> unknown_outcome: a 5xx says the provider broke, not that it did nothing; canFailOver false, canRetrySameProvider false',
          tone: 'unknown',
          node: 'domain-provider',
          when: [{ lever: 'appmax', value: 'answers-5xx' }],
          evidence: [cite(providerOutcome, [125, 131]), cite(providerOutcome, [47, 66])],
        },
        {
          at: 5700,
          ledger:
            'classifyTransportResult(timeout) -> unknown_outcome: the request may have been received and acted on; canFailOver false, canRetrySameProvider false',
          tone: 'unknown',
          node: 'domain-provider',
          when: [{ lever: 'appmax', value: 'times-out' }],
          evidence: [cite(providerOutcome, [97, 99]), cite(providerOutcome, [47, 66])],
        },
        {
          at: 6300,
          ledger: 'decideTransition(processing, PROVIDER_OUTCOME_UNKNOWN, internal) -> unknown',
          tone: 'unknown',
          node: 'domain-payment',
          status: { machine: 'payment', value: 'unknown' },
          when: [{ lever: 'appmax', value: 'answers-5xx' }],
          evidence: [cite(transitionTable, [138, 145])],
        },
        {
          at: 6300,
          ledger: 'decideTransition(processing, PROVIDER_OUTCOME_UNKNOWN, internal) -> unknown',
          tone: 'unknown',
          node: 'domain-payment',
          status: { machine: 'payment', value: 'unknown' },
          when: [{ lever: 'appmax', value: 'times-out' }],
          evidence: [cite(transitionTable, [138, 145])],
        },
        {
          at: 6900,
          ledger:
            'parked: no order reference to reconcile on. Exits are RECONCILED_* on an authenticated read, or RESOLUTION_EXHAUSTED by an operator; nothing produces them yet',
          tone: 'wait',
          node: 'domain-payment',
          when: [{ lever: 'appmax', value: 'answers-5xx' }],
          evidence: [cite(transitionTable, [154, 190]), cite(appmaxProvider, [177, 183])],
        },
        {
          at: 6900,
          ledger:
            'parked: no order reference to reconcile on. Exits are RECONCILED_* on an authenticated read, or RESOLUTION_EXHAUSTED by an operator; nothing produces them yet',
          tone: 'wait',
          node: 'domain-payment',
          when: [{ lever: 'appmax', value: 'times-out' }],
          evidence: [cite(transitionTable, [154, 190]), cite(appmaxProvider, [177, 183])],
        },
      ],
      assertedBy: [
        cite(providerTest, [97, 110]),
        cite(providerTest, [127, 130]),
        cite(providerTest, [152, 168]),
        cite(appmaxProviderTest, [82, 165]),
        cite(appmaxTransportTest, [328, 362]),
        cite(stateMachineTest, [196, 216]),
      ],
    },
    {
      id: 'unsigned-webhook',
      name: 'An unsigned webhook cannot fund a payment',
      kind: 'security',
      summary:
        'Domain simulation. No webhook route exists at the pinned commit. What exists is the refusal: an evidence rank in the state machine and a CHECK constraint in the database, plus the mapping that turns an event into a read. The payment starts in awaiting_payment.',
      levers: [
        {
          id: 'attempt',
          label: 'What tries to move the payment',
          options: [
            { value: 'fund-on-webhook', label: 'The webhook alone' },
            { value: 'fund-on-read', label: 'An authenticated read' },
            { value: 'replay-after-paid', label: 'A stale expiry after paid' },
          ],
          defaultValue: 'fund-on-webhook',
        },
      ],
      steps: [
        {
          at: 0,
          ledger:
            'webhook order_paid_by_pix for order 3531: no signature, so the body proves nothing',
          tone: 'unknown',
          node: 'appmax',
          evidence: [cite(appmaxMappings, [88, 95])],
        },
        {
          at: 600,
          ledger:
            "requiresProviderRead('order_paid_by_pix') -> true; order_pix_created would be ignored; an unknown event is read",
          tone: 'ok',
          node: 'appmax-adapter',
          evidence: [cite(appmaxMappings, [115, 149])],
        },
        {
          at: 1200,
          ledger:
            'decideTransition(awaiting_payment, PAYMENT_CONFIRMED, internal) -> refused: insufficient_evidence, required authenticated_provider_read',
          tone: 'fault',
          node: 'domain-payment',
          when: [{ lever: 'attempt', value: 'fund-on-webhook' }],
          evidence: [cite(stateMachine, [40, 51]), cite(stateMachine, [69, 78])],
        },
        {
          at: 1800,
          ledger:
            'INSERT payment_status_transitions (awaiting_payment -> paid, PAYMENT_CONFIRMED, evidence internal) attempted anyway',
          tone: 'flight',
          edge: 'test-runner-postgres',
          when: [{ lever: 'attempt', value: 'fund-on-webhook' }],
          evidence: [cite(paymentsIntegration, [426, 433])],
        },
        {
          at: 2400,
          ledger: 'check_violation transitions_into_funds_require_authenticated_read',
          tone: 'fault',
          node: 'postgres',
          when: [{ lever: 'attempt', value: 'fund-on-webhook' }],
          evidence: [cite(migration0003, [232, 237])],
        },
        {
          at: 3000,
          ledger:
            'payment stays awaiting_payment: the webhook may schedule a read and nothing else',
          tone: 'neutral',
          node: 'domain-payment',
          status: { machine: 'payment', value: 'awaiting_payment' },
          when: [{ lever: 'attempt', value: 'fund-on-webhook' }],
          evidence: [cite(providerPort, [103, 109])],
        },
        {
          at: 1200,
          ledger: 'GET /v1/orders/3531 (reference URI-encoded) with the Bearer token',
          tone: 'flight',
          edge: 'appmax-adapter-transport',
          when: [{ lever: 'attempt', value: 'fund-on-read' }],
          evidence: [cite(appmaxProvider, [214, 225])],
        },
        {
          at: 1800,
          ledger: 'authenticated read in flight',
          tone: 'flight',
          edge: 'appmax-transport-appmax',
          when: [{ lever: 'attempt', value: 'fund-on-read' }],
          evidence: [cite(appmaxTransport, [157, 176])],
        },
        {
          at: 2600,
          ledger: '200 data.order.status aprovado, total_paid 12300, data.payment.paid_at',
          tone: 'ok',
          node: 'appmax',
          when: [{ lever: 'attempt', value: 'fund-on-read' }],
          evidence: [cite(appmaxProviderTest, [167, 189])],
        },
        {
          at: 3200,
          ledger:
            "lifecycleForOrderStatus('aprovado') -> paid; capturedAmountMinor 12300; rawStatus kept for the audit trail",
          tone: 'ok',
          node: 'appmax-adapter',
          when: [{ lever: 'attempt', value: 'fund-on-read' }],
          evidence: [cite(appmaxMappings, [36, 48]), cite(appmaxProvider, [95, 127])],
        },
        {
          at: 3800,
          ledger:
            'decideTransition(awaiting_payment, PAYMENT_CONFIRMED, authenticated_provider_read) -> paid',
          tone: 'ok',
          node: 'domain-payment',
          status: { machine: 'payment', value: 'paid' },
          when: [{ lever: 'attempt', value: 'fund-on-read' }],
          evidence: [cite(transitionTable, [192, 198])],
        },
        {
          at: 4400,
          ledger:
            'INSERT transition (sequence n+1, evidence authenticated_provider_read); UPDATE payments SET status paid, status_sequence n+1, captured_amount_minor 12300, paid_at',
          tone: 'flight',
          edge: 'test-runner-postgres',
          when: [{ lever: 'attempt', value: 'fund-on-read' }],
          evidence: [cite(paymentsIntegration, [112, 147]), cite(migration0003, [119, 125])],
        },
        {
          at: 5000,
          ledger:
            'COMMIT: the deferred constraint trigger finds the audit row; paid_at, captured_amount_minor and status agree',
          tone: 'ok',
          node: 'postgres',
          when: [{ lever: 'attempt', value: 'fund-on-read' }],
          evidence: [cite(migration0003, [246, 276]), cite(migration0003, [119, 125])],
        },
        {
          at: 1200,
          ledger: 'stale order_pix_expired arrives after the payment was funded',
          tone: 'unknown',
          node: 'appmax',
          when: [{ lever: 'attempt', value: 'replay-after-paid' }],
        },
        {
          at: 1800,
          ledger:
            'decideTransition(paid, EXPIRY_ELAPSED, authenticated_provider_read) -> refused: no_such_transition',
          tone: 'fault',
          node: 'domain-payment',
          when: [{ lever: 'attempt', value: 'replay-after-paid' }],
          evidence: [cite(stateMachine, [61, 67]), cite(stateMachineTest, [180, 184])],
        },
        {
          at: 2400,
          ledger: 'INSERT transition (paid -> awaiting_payment) attempted',
          tone: 'flight',
          edge: 'test-runner-postgres',
          when: [{ lever: 'attempt', value: 'replay-after-paid' }],
          evidence: [cite(paymentsIntegration, [408, 415])],
        },
        {
          at: 3000,
          ledger:
            'foreign_key_violation transitions_must_be_legal: no (paid, awaiting_payment) row in legal_payment_transitions',
          tone: 'fault',
          node: 'postgres',
          when: [{ lever: 'attempt', value: 'replay-after-paid' }],
          evidence: [cite(migration0003, [225, 230])],
        },
        {
          at: 3600,
          ledger: 'payment stays paid',
          tone: 'neutral',
          node: 'domain-payment',
          status: { machine: 'payment', value: 'paid' },
          when: [{ lever: 'attempt', value: 'replay-after-paid' }],
        },
      ],
      assertedBy: [
        cite(paymentsIntegration, [400, 433]),
        cite(stateMachineTest, [219, 232]),
        cite(stateMachineTest, [172, 184]),
        cite(appmaxMappingsTest, [68, 88]),
      ],
    },
    {
      id: 'tenant-scope',
      name: 'A query forgets its tenant',
      kind: 'security',
      summary:
        'The integration suite talks to PostgreSQL as the application role with no repository in the way. Reads outside the scope return nothing; writes outside it are rejected; and the role holds no privilege that would make the policies advisory.',
      levers: [
        {
          id: 'scope',
          label: 'Tenant scope',
          options: [
            { value: 'set', label: 'Set for merchant A' },
            { value: 'forgotten', label: 'Forgotten' },
            { value: 'wrong-tenant-write', label: 'Write aimed at merchant B' },
          ],
          defaultValue: 'set',
        },
      ],
      steps: [
        {
          at: 0,
          ledger: "BEGIN; SELECT set_config('app.organization_id', merchantA, true)",
          tone: 'flight',
          edge: 'test-runner-postgres',
          when: [{ lever: 'scope', value: 'set' }],
          evidence: [cite(testDatabase, [45, 63])],
        },
        {
          at: 0,
          ledger: "BEGIN; SELECT set_config('app.organization_id', merchantA, true)",
          tone: 'flight',
          edge: 'test-runner-postgres',
          when: [{ lever: 'scope', value: 'wrong-tenant-write' }],
          evidence: [cite(testDatabase, [45, 63])],
        },
        {
          at: 0,
          ledger: 'query as payment_gateway_application with no set_config at all',
          tone: 'flight',
          edge: 'test-runner-postgres',
          when: [{ lever: 'scope', value: 'forgotten' }],
          evidence: [cite(testDatabase, [65, 78])],
        },
        {
          at: 600,
          ledger: 'SELECT slug FROM organizations',
          tone: 'flight',
          edge: 'test-runner-postgres',
          when: [{ lever: 'scope', value: 'set' }],
          evidence: [cite(tenantIntegration, [88, 100])],
        },
        {
          at: 600,
          ledger: 'SELECT id FROM organizations',
          tone: 'flight',
          edge: 'test-runner-postgres',
          when: [{ lever: 'scope', value: 'forgotten' }],
          evidence: [cite(tenantIntegration, [135, 143])],
        },
        {
          at: 1200,
          ledger:
            'policy organizations_tenant_isolation USING id = current_organization_id(): 1 row',
          tone: 'ok',
          node: 'postgres',
          when: [{ lever: 'scope', value: 'set' }],
          evidence: [cite(migration0002, [80, 82])],
        },
        {
          at: 1200,
          ledger: 'current_organization_id() -> NULL; id = NULL is never true: 0 rows',
          tone: 'unknown',
          node: 'postgres',
          when: [{ lever: 'scope', value: 'forgotten' }],
          evidence: [cite(migration0002, [8, 20])],
        },
        {
          at: 1800,
          ledger: 'count(*) FROM organizations = 1: an aggregate sees the same rows',
          tone: 'ok',
          node: 'test-runner',
          when: [{ lever: 'scope', value: 'set' }],
          evidence: [cite(tenantIntegration, [145, 156])],
        },
        {
          at: 1800,
          ledger:
            'empty result, no error: a forgotten scope yields nothing, never another merchant rows',
          tone: 'wait',
          node: 'test-runner',
          when: [{ lever: 'scope', value: 'forgotten' }],
          evidence: [cite(tenantIntegration, [135, 143])],
        },
        {
          at: 600,
          ledger: 'INSERT INTO api_keys (organization_id merchantB, ...) while scoped to merchantA',
          tone: 'flight',
          edge: 'test-runner-postgres',
          when: [{ lever: 'scope', value: 'wrong-tenant-write' }],
          evidence: [cite(tenantIntegration, [203, 217])],
        },
        {
          at: 1200,
          ledger:
            'WITH CHECK organization_id = current_organization_id() fails: new row violates row-level security policy',
          tone: 'fault',
          node: 'postgres',
          when: [{ lever: 'scope', value: 'wrong-tenant-write' }],
          evidence: [cite(migration0002, [88, 90])],
        },
        {
          at: 1800,
          ledger:
            'UPDATE api_keys SET organization_id = merchantB WHERE organization_id = merchantA',
          tone: 'flight',
          edge: 'test-runner-postgres',
          when: [{ lever: 'scope', value: 'wrong-tenant-write' }],
          evidence: [cite(tenantIntegration, [219, 228])],
        },
        {
          at: 2400,
          ledger: 'row-level security violation: a row cannot be moved to another tenant',
          tone: 'fault',
          node: 'postgres',
          when: [{ lever: 'scope', value: 'wrong-tenant-write' }],
          evidence: [cite(tenantIntegration, [219, 228])],
        },
        {
          at: 3000,
          ledger:
            'why it binds: payment_gateway_application is NOSUPERUSER NOBYPASSRLS, owns no table and cannot CREATE in schema public',
          tone: 'neutral',
          node: 'roles',
          evidence: [cite(rolesSql, [21, 34]), cite(tenantIntegration, [50, 76])],
        },
        {
          at: 3600,
          ledger:
            'tenant_scoped_tables lists 7 tables; the suite checks each has RLS and a policy, and that no organization_id column is missing from the list',
          tone: 'neutral',
          node: 'postgres',
          evidence: [
            cite(migration0002, [92, 107]),
            cite(migration0003, [307, 310]),
            cite(migration0004, [62, 63]),
            cite(tenantIntegration, [231, 275]),
          ],
        },
      ],
      assertedBy: [cite(tenantIntegration, [50, 275]), cite(paymentsIntegration, [509, 540])],
    },
    {
      id: 'migration-edited',
      name: 'An applied migration is edited',
      kind: 'failure',
      summary:
        'The migrator checksums every file and stops when a recorded migration no longer matches its file. Because compose gates roles and the API on the migrator exiting 0, a changed migration stops the stack instead of drifting it.',
      levers: [
        {
          id: 'files',
          label: 'Migration files',
          options: [
            { value: 'unchanged', label: 'Unchanged' },
            { value: 'edited-after-apply', label: '0003 edited after apply' },
            { value: 'new-migration', label: 'New 0005 added' },
          ],
          defaultValue: 'unchanged',
        },
      ],
      steps: [
        {
          at: 0,
          ledger:
            'migrate starts once postgres is healthy; connects as payment_gateway_owner, pool max 1',
          tone: 'neutral',
          node: 'migrate',
          evidence: [cite(compose, [48, 62]), cite(migrateCli, [15, 19])],
        },
        {
          at: 600,
          ledger: '4 files matched ^\\d{4}_[a-z0-9_]+\\.sql$, sorted, sha256 per file',
          tone: 'ok',
          node: 'migrate',
          evidence: [cite(migrate, [6, 6]), cite(migrate, [29, 46])],
        },
        {
          at: 1200,
          ledger: 'SELECT pg_advisory_lock(8527413009112233): a second migrator waits here',
          tone: 'flight',
          edge: 'migrate-postgres',
          evidence: [cite(migrate, [8, 10]), cite(migrate, [71, 71])],
        },
        {
          at: 1800,
          ledger:
            'CREATE TABLE IF NOT EXISTS schema_migrations; SELECT name, checksum FROM schema_migrations',
          tone: 'flight',
          edge: 'migrate-postgres',
          evidence: [cite(migrate, [48, 56]), cite(migrate, [76, 79])],
        },
        {
          at: 2400,
          ledger: '0001 to 0004 checksums match: alreadyApplied 4, applied 0',
          tone: 'ok',
          node: 'migrate',
          when: [{ lever: 'files', value: 'unchanged' }],
          evidence: [cite(migrate, [87, 90])],
        },
        {
          at: 2400,
          ledger:
            '0001, 0002 match; 0003_payments.sql: recorded checksum differs from the file on disk',
          tone: 'fault',
          node: 'migrate',
          when: [{ lever: 'files', value: 'edited-after-apply' }],
          evidence: [cite(migrate, [84, 93])],
        },
        {
          at: 2400,
          ledger:
            '0001 to 0004 match; 0005 has no record: BEGIN; run the file; INSERT schema_migrations (name, checksum); COMMIT',
          tone: 'ok',
          node: 'migrate',
          when: [{ lever: 'files', value: 'new-migration' }],
          evidence: [cite(migrate, [95, 107])],
        },
        {
          at: 3000,
          ledger:
            'MigrationChecksumMismatchError: applied migrations are immutable; add a new migration instead of editing this one',
          tone: 'fault',
          node: 'migrate',
          when: [{ lever: 'files', value: 'edited-after-apply' }],
          evidence: [cite(migrate, [19, 27])],
        },
        {
          at: 3600,
          ledger: "pg_advisory_unlock in finally; logger.fatal 'migration failed'; exit 1",
          tone: 'flight',
          edge: 'migrate-postgres',
          when: [{ lever: 'files', value: 'edited-after-apply' }],
          evidence: [cite(migrate, [111, 113]), cite(migrateCli, [33, 38])],
        },
        {
          at: 4200,
          ledger: 'roles never starts: depends_on migrate service_completed_successfully',
          tone: 'fault',
          node: 'roles',
          when: [{ lever: 'files', value: 'edited-after-apply' }],
          evidence: [cite(compose, [81, 83])],
        },
        {
          at: 4800,
          ledger: 'api never starts: depends_on roles service_completed_successfully',
          tone: 'fault',
          node: 'api',
          when: [{ lever: 'files', value: 'edited-after-apply' }],
          evidence: [cite(compose, [100, 102])],
        },
        {
          at: 3000,
          ledger: 'the migration and its record commit together or not at all',
          tone: 'ok',
          node: 'postgres',
          when: [{ lever: 'files', value: 'new-migration' }],
          evidence: [cite(migrate, [63, 66])],
        },
        {
          at: 3600,
          ledger: "pg_advisory_unlock; 'migrations complete'; exit 0",
          tone: 'flight',
          edge: 'migrate-postgres',
          when: [{ lever: 'files', value: 'unchanged' }],
          evidence: [cite(migrate, [111, 113]), cite(migrateCli, [29, 32])],
        },
        {
          at: 3600,
          ledger: "pg_advisory_unlock; 'migrations complete'; exit 0",
          tone: 'flight',
          edge: 'migrate-postgres',
          when: [{ lever: 'files', value: 'new-migration' }],
          evidence: [cite(migrate, [111, 113]), cite(migrateCli, [29, 32])],
        },
        {
          at: 4200,
          ledger:
            'roles starts and re-applies the grants: default privileges only cover objects created after they were set',
          tone: 'ok',
          node: 'roles',
          when: [{ lever: 'files', value: 'unchanged' }],
          evidence: [cite(compose, [64, 67]), cite(rolesSql, [7, 9])],
        },
        {
          at: 4200,
          ledger: 'roles starts and grants the new table to the application role',
          tone: 'ok',
          node: 'roles',
          when: [{ lever: 'files', value: 'new-migration' }],
          evidence: [cite(compose, [64, 67]), cite(rolesSql, [36, 41])],
        },
      ],
      assertedBy: [cite(migrateIntegration, [67, 110])],
    },
    {
      id: 'compose-boot',
      name: 'Compose boot and restart',
      kind: 'recovery',
      summary:
        'The stack comes up in a fixed order: a healthy PostgreSQL, then the migrator, then the grants, then the API. On a restart the same chain runs again: migrations already applied are skipped and the grants are re-applied.',
      levers: [
        {
          id: 'start',
          label: 'Start',
          options: [
            { value: 'first-boot', label: 'First boot' },
            { value: 'restart', label: 'Restart' },
          ],
          defaultValue: 'first-boot',
        },
      ],
      steps: [
        {
          at: 0,
          ledger:
            'postgres:18.4-bookworm starting; healthcheck pg_isready -h 127.0.0.1 every 5 s, start_period 45 s because first boot runs initdb',
          tone: 'wait',
          node: 'postgres',
          evidence: [cite(compose, [4, 32])],
        },
        {
          at: 900,
          ledger: 'healthy: TCP clients accepted, not only the unix socket',
          tone: 'ok',
          node: 'postgres',
          evidence: [cite(compose, [19, 25])],
        },
        {
          at: 1500,
          ledger: 'depends_on postgres: condition service_healthy',
          tone: 'flight',
          edge: 'postgres-migrate',
          evidence: [cite(compose, [58, 60])],
        },
        {
          at: 2100,
          ledger:
            'applied 0001_identity_and_tenancy, 0002_tenant_isolation, 0003_payments, 0004_idempotency as payment_gateway_owner',
          tone: 'ok',
          node: 'migrate',
          when: [{ lever: 'start', value: 'first-boot' }],
          evidence: [cite(compose, [52, 56]), cite(migrate, [95, 103])],
        },
        {
          at: 2100,
          ledger: 'alreadyApplied 4, applied 0',
          tone: 'ok',
          node: 'migrate',
          when: [{ lever: 'start', value: 'restart' }],
          evidence: [cite(migrate, [87, 90])],
        },
        {
          at: 2700,
          ledger: 'depends_on migrate: condition service_completed_successfully',
          tone: 'flight',
          edge: 'migrate-roles',
          evidence: [cite(compose, [81, 83])],
        },
        {
          at: 3300,
          ledger: 'CREATE ROLE payment_gateway_application LOGIN',
          tone: 'ok',
          node: 'roles',
          when: [{ lever: 'start', value: 'first-boot' }],
          evidence: [cite(rolesSql, [13, 19])],
        },
        {
          at: 3300,
          ledger:
            'role exists: ALTER ROLE NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS re-applied',
          tone: 'ok',
          node: 'roles',
          when: [{ lever: 'start', value: 'restart' }],
          evidence: [cite(rolesSql, [21, 27])],
        },
        {
          at: 3900,
          ledger:
            'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES; REVOKE CREATE ON SCHEMA public; REVOKE ALL ON schema_migrations',
          tone: 'flight',
          edge: 'roles-postgres',
          evidence: [cite(rolesSql, [29, 57])],
        },
        {
          at: 4500,
          ledger: 'grants now cover every table the latest migration created',
          tone: 'ok',
          node: 'postgres',
          evidence: [cite(rolesSql, [7, 9]), cite(compose, [66, 67])],
        },
        {
          at: 5100,
          ledger: 'depends_on roles: condition service_completed_successfully',
          tone: 'flight',
          edge: 'roles-api',
          evidence: [cite(compose, [100, 102])],
        },
        {
          at: 5100,
          ledger:
            'depends_on redis: condition service_healthy (redis-cli ping); nothing in the code connects to it',
          tone: 'flight',
          edge: 'redis-api',
          evidence: [cite(compose, [40, 44]), cite(compose, [103, 104])],
        },
        {
          at: 5700,
          ledger:
            'loadEnvironment: DATABASE_URL as payment_gateway_application and REDIS_URL required; a missing value stops the process before it listens',
          tone: 'ok',
          node: 'api',
          evidence: [
            cite(environment, [3, 17]),
            cite(environment, [28, 43]),
            cite(compose, [91, 97]),
          ],
        },
        {
          at: 6300,
          ledger:
            'listen 0.0.0.0:3000; published on 127.0.0.1:4010 only; networks internal and outbound',
          tone: 'ok',
          node: 'api',
          evidence: [cite(mainApi, [20, 24]), cite(compose, [98, 99]), cite(compose, [117, 117])],
        },
        {
          at: 6900,
          ledger: 'healthcheck GET /health every 10 s, start_period 15 s',
          tone: 'flight',
          edge: 'client-api',
          evidence: [cite(compose, [105, 116])],
        },
        {
          at: 7500,
          ledger: 'healthy; the process runs as USER node with production dependencies only',
          tone: 'ok',
          node: 'api',
          evidence: [cite(dockerfile, [28, 45])],
        },
        {
          at: 8100,
          ledger:
            'profile test: the integration suite runs on the same network as the application role, with OWNER_DATABASE_URL only to seed and inspect',
          tone: 'neutral',
          node: 'test-runner',
          evidence: [cite(compose, [120, 138])],
        },
      ],
    },
  ],
  stateMachines: [
    {
      id: 'payment',
      name: 'Payment lifecycle',
      statuses: [
        { id: 'pending', terminal: false, tone: 'wait', funded: false },
        { id: 'processing', terminal: false, tone: 'flight', funded: false },
        {
          id: 'unknown',
          terminal: false,
          tone: 'unknown',
          funded: false,
          note: 'A first-class status: whether anything was created is not known, so no failover is permitted until it is resolved.',
        },
        { id: 'awaiting_payment', terminal: false, tone: 'wait', funded: false },
        { id: 'paid', terminal: false, tone: 'ok', funded: true },
        { id: 'partially_refunded', terminal: false, tone: 'ok', funded: true },
        { id: 'refunded', terminal: true, tone: 'neutral', funded: true },
        { id: 'chargeback', terminal: false, tone: 'fault', funded: true },
        {
          id: 'expired',
          terminal: false,
          tone: 'neutral',
          funded: false,
          note: 'Deliberately not terminal: a Pix code can be paid moments after it lapses, and the money arrives.',
        },
        { id: 'failed', terminal: true, tone: 'fault', funded: false },
        { id: 'cancelled', terminal: true, tone: 'neutral', funded: false },
      ],
      transitions: [
        {
          from: 'pending',
          to: 'processing',
          trigger: 'PROVIDER_REQUEST_SENT',
          guard:
            'Evidence at least internal. A provider has been selected and the request is in flight.',
        },
        {
          from: 'pending',
          to: 'cancelled',
          trigger: 'MERCHANT_CANCELLED',
          guard:
            'Evidence at least internal. The merchant withdrew the payment before any provider was contacted.',
        },
        {
          from: 'pending',
          to: 'failed',
          trigger: 'ROUTING_EXHAUSTED',
          guard: 'Evidence at least internal. No configured provider can serve this payment.',
        },
        {
          from: 'processing',
          to: 'awaiting_payment',
          trigger: 'INSTRUMENT_ISSUED',
          guard:
            'Evidence at least authenticated_provider_read. The provider returned a payable instrument and the customer may now pay.',
        },
        {
          from: 'processing',
          to: 'failed',
          trigger: 'PROVIDER_REFUSED',
          guard:
            'Evidence at least authenticated_provider_read. The provider refused the payment outright and created nothing.',
        },
        {
          from: 'processing',
          to: 'unknown',
          trigger: 'PROVIDER_OUTCOME_UNKNOWN',
          guard:
            'Evidence at least internal. The provider call did not produce a usable answer; no failover is permitted until it is resolved.',
        },
        {
          from: 'processing',
          to: 'pending',
          trigger: 'SAFE_FAILURE_OBSERVED',
          guard:
            'Evidence at least authenticated_provider_read. The provider confirmed it created nothing, so another provider may be attempted.',
        },
        {
          from: 'unknown',
          to: 'awaiting_payment',
          trigger: 'RECONCILED_INSTRUMENT_LIVE',
          guard:
            'Evidence at least authenticated_provider_read. Reconciliation found a live instrument from the uncertain attempt.',
        },
        {
          from: 'unknown',
          to: 'pending',
          trigger: 'RECONCILED_NOT_CREATED',
          guard:
            'Evidence at least authenticated_provider_read. Reconciliation proved nothing was created, the only condition under which failover is safe.',
        },
        {
          from: 'unknown',
          to: 'paid',
          trigger: 'RECONCILED_PAID',
          guard:
            'Evidence at least authenticated_provider_read. Reconciliation found the uncertain attempt had in fact been paid.',
        },
        {
          from: 'unknown',
          to: 'expired',
          trigger: 'RECONCILED_EXPIRED',
          guard:
            'Evidence at least authenticated_provider_read. Reconciliation found the uncertain instrument had lapsed unpaid.',
        },
        {
          from: 'unknown',
          to: 'failed',
          trigger: 'RESOLUTION_EXHAUSTED',
          guard:
            'Evidence at least operator. The uncertainty could not be resolved within its window and an operator closed it.',
        },
        {
          from: 'awaiting_payment',
          to: 'paid',
          trigger: 'PAYMENT_CONFIRMED',
          guard:
            'Evidence at least authenticated_provider_read. The provider confirmed, on an authenticated read, that the customer paid.',
        },
        {
          from: 'awaiting_payment',
          to: 'expired',
          trigger: 'EXPIRY_ELAPSED',
          guard:
            'Evidence at least authenticated_provider_read. The instrument lapsed without payment.',
        },
        {
          from: 'awaiting_payment',
          to: 'cancelled',
          trigger: 'MERCHANT_CANCELLED',
          guard:
            'Evidence at least internal. The merchant withdrew the payment while it was still unpaid.',
        },
        {
          from: 'awaiting_payment',
          to: 'unknown',
          trigger: 'PROVIDER_OUTCOME_UNKNOWN',
          guard:
            'Evidence at least internal. The provider stopped answering, so the instrument state is no longer known.',
        },
        {
          from: 'expired',
          to: 'paid',
          trigger: 'LATE_PAYMENT_CONFIRMED',
          guard:
            'Evidence at least authenticated_provider_read. The customer paid after the instrument lapsed; the money arrived, so it is recorded.',
        },
        {
          from: 'paid',
          to: 'partially_refunded',
          trigger: 'PARTIAL_REFUND_SETTLED',
          guard:
            'Evidence at least authenticated_provider_read. Part of the captured amount was returned.',
        },
        {
          from: 'paid',
          to: 'refunded',
          trigger: 'REFUND_SETTLED',
          guard:
            'Evidence at least authenticated_provider_read. The whole captured amount was returned.',
        },
        {
          from: 'paid',
          to: 'chargeback',
          trigger: 'CHARGEBACK_OPENED',
          guard:
            'Evidence at least authenticated_provider_read. The issuing bank reversed the payment and a dispute is open.',
        },
        {
          from: 'partially_refunded',
          to: 'refunded',
          trigger: 'REFUND_SETTLED',
          guard:
            'Evidence at least authenticated_provider_read. The remainder was returned, so nothing is left captured.',
        },
        {
          from: 'partially_refunded',
          to: 'chargeback',
          trigger: 'CHARGEBACK_OPENED',
          guard:
            'Evidence at least authenticated_provider_read. A dispute was opened over what remains captured.',
        },
        {
          from: 'chargeback',
          to: 'paid',
          trigger: 'CHARGEBACK_WON',
          guard:
            'Evidence at least authenticated_provider_read. The dispute was resolved in favour of the merchant.',
        },
        {
          from: 'chargeback',
          to: 'refunded',
          trigger: 'CHARGEBACK_LOST',
          guard:
            'Evidence at least authenticated_provider_read. The dispute was lost and the money returned to the customer.',
        },
      ],
      notes: [
        '11 statuses, 24 edges, 20 triggers, 3 evidence classes ranked internal < authenticated_provider_read < operator.',
        'decideTransition checks the terminal status first, then looks the edge up by (from, trigger), then compares evidence rank.',
        'The same 24 rows are seeded into legal_payment_transitions; payment_status_transitions references them by composite foreign key and a CHECK adds that no funded status is reachable on internal evidence.',
        'The unit suite enumerates the full product of 11 statuses and 20 triggers rather than sampling it; the integration suite compares the TypeScript table with the SQL table on every run.',
        'docs/state-machine.md is generated from the compiled table and byte-compared by scripts/verify-docs.mjs.',
      ],
      evidence: [
        cite(transitionTable, [14, 101]),
        cite(transitionTable, [101, 281]),
        cite(stateMachine, [53, 81]),
        cite(migration0003, [13, 80]),
        cite(migration0003, [225, 237]),
        cite(stateMachineTest, [131, 169]),
        cite(paymentsIntegration, [542, 589]),
        cite(verifyDocs, [136, 159]),
      ],
    },
  ],
  decisions: [
    {
      id: 'tenant-isolation-as-privilege',
      title: 'Tenant isolation is a database privilege, not a WHERE clause',
      decision:
        'Every tenant table enables row level security with USING and WITH CHECK on current_organization_id(). The application connects as a role that owns no table and holds no BYPASSRLS, so the policies bind. There are no ADR files; the rationale lives in the migration and role comments.',
      alternatives: ['Remembering a WHERE clause in every query', 'Filtering in application code'],
      cost: 'Two connection roles to operate; SECURITY DEFINER exceptions for the pre-tenant key lookup; integration tests must seed through the owner and assert through the application role.',
      themes: ['security', 'correctness'],
      evidence: [cite(migration0002, [1, 6]), cite(rolesSql, [1, 9]), cite(testDatabase, [4, 14])],
    },
    {
      id: 'lifecycle-as-data',
      title: 'The lifecycle is one table, enforced three ways',
      decision:
        'PAYMENT_TRANSITIONS is the single source of truth. The state machine reads it, the documentation is generated from it, and the database enforces the same rows through a composite foreign key plus a deferred constraint trigger that refuses any status change without its audit row. Rationale lives in the module header and the SQL comments.',
      alternatives: [
        'A switch statement per trigger',
        'Trusting the application to write consistent status updates',
      ],
      cost: 'Two copies of the table, kept honest only by an integration test that compares them; adding an edge means a migration as well as a TypeScript entry.',
      themes: ['correctness', 'durability'],
      evidence: [
        cite(transitionTable, [1, 12]),
        cite(migration0003, [8, 11]),
        cite(migration0003, [243, 276]),
        cite(paymentsIntegration, [542, 570]),
      ],
    },
    {
      id: 'evidence-classes-not-signatures',
      title: 'Evidence classes instead of webhook signatures',
      decision:
        'The code treats Appmax webhooks as unsigned, so every transition into a funded status demands authenticated_provider_read. A webhook may schedule a read; only the read can fund a payment. The rule is in the transition table and repeated as a CHECK constraint. Rationale lives in code comments.',
      alternatives: ['Trusting webhook bodies', 'Verifying a signature the provider does not send'],
      cost: 'One extra provider read per meaningful webhook, and a payment that cannot become paid while the provider API is unreachable.',
      themes: ['security', 'correctness'],
      evidence: [
        cite(transitionTable, [82, 89]),
        cite(migration0003, [232, 237]),
        cite(appmaxMappings, [88, 95]),
      ],
    },
    {
      id: 'unknown-outcome-default',
      title: 'unknown_outcome is the default classification',
      decision:
        'A timeout, a 5xx, an unparseable body or an unclassified status is unknown_outcome, which licenses neither retry nor failover until a read proves what happened. Only 4xx statuses that mean the provider declined are safe failures. Rationale lives in the taxonomy comments.',
      alternatives: ['Treating any non-2xx as a failure and failing over'],
      cost: 'The conservative reading costs a reconciliation; the code states that the optimistic one costs a duplicate charge.',
      themes: ['correctness'],
      evidence: [
        cite(providerOutcome, [1, 8]),
        cite(providerOutcome, [72, 79]),
        cite(providerOutcome, [129, 131]),
        cite(providerCapability, [54, 59]),
      ],
    },
    {
      id: 'idempotency-as-unique-claim',
      title: 'Idempotency is a unique-index claim in one transaction',
      decision:
        'The guarantee is that the database permits only one claim per (organization, environment, key). Claim, payment and completion commit together, so a crash rolls the key back and the merchant may retry. Rationale lives in the migration header and the repository comment.',
      alternatives: ['An application-level existence check before inserting'],
      cost: 'Concurrent duplicates block on the winner row until it commits, and completed records carry a 24 hour expires_at that nothing purges yet.',
      themes: ['correctness', 'durability'],
      evidence: [
        cite(migration0004, [1, 11]),
        cite(migration0004, [33, 35]),
        cite(paymentCreation, [51, 64]),
      ],
    },
    {
      id: 'capabilities-declared',
      title: 'Provider capabilities are declared, not assumed',
      decision:
        'There is no universal provider interface. A provider declares what it can do, a method is routed only to a provider that declares the capability and the currency, and assertCapabilitiesAreImplemented is written to refuse a declared capability with no implementation at startup. At the pinned commit only tests call that assertion. Rationale lives in the module header.',
      alternatives: ['One wide interface whose unsupported methods throw at payment time'],
      cost: 'Every new method or provider needs a descriptor entry and a startup assertion; routing has to consult descriptors.',
      themes: ['boundaries', 'correctness'],
      evidence: [
        cite(providerCapability, [1, 11]),
        cite(providerCapability, [89, 105]),
        cite(appmaxProvider, [34, 42]),
        cite(appmaxProviderTest, [62, 70]),
      ],
    },
    {
      id: 'opaque-public-identifiers',
      title: 'Public identifiers are random, prefixed and Crockford',
      decision:
        'Identifiers that leave the system are 26 Crockford base32 characters with a type prefix, 130 bits of entropy, and deliberately not ULIDs or UUIDv7 because those leak creation time and volume. Primary keys stay uuidv7 for index locality. Rationale lives in the module header and the SQL domain comment.',
      alternatives: ['Exposing the uuidv7 primary key', 'ULIDs'],
      cost: 'Two identifiers per row and a unique index on public_id for every exposed table.',
      themes: ['security', 'boundaries'],
      evidence: [cite(sharedIdentifier, [1, 22]), cite(migration0001, [12, 16])],
    },
    {
      id: 'peppered-hmac-keys',
      title: 'API keys are verified by peppered HMAC with a timing burn',
      decision:
        'A key splits into an indexable identifier and a 32-character secret. The stored verifier is HMAC-SHA256 of identifier.secret under a pepper kept outside the database, compared in constant time. An unknown identifier still pays for one HMAC, and lifecycle checks run after the secret check. Rationale lives in code comments.',
      alternatives: ['argon2 or bcrypt per request', 'Storing the secret'],
      cost: 'A pepper to manage outside the database; a key is unverifiable if the pepper is lost.',
      themes: ['security'],
      evidence: [
        cite(sharedApiKey, [111, 122]),
        cite(authenticate, [30, 37]),
        cite(authenticate, [49, 54]),
        cite(migration0001, [80, 84]),
      ],
    },
    {
      id: 'layer-boundaries-by-lint',
      title: 'Layer boundaries are enforced by ESLint',
      decision:
        'The domain may not import pg, undici, fastify, pino or anything under infrastructure or interface; the application layer may import only ports; the browser-safe surface of packages/shared may not import node builtins. No container: the composition root constructs everything explicitly. Rationale lives in the lint configuration comments.',
      alternatives: ['A dependency injection container', 'Convention without enforcement'],
      cost: 'Every adapter needs a port, and the list of infrastructure packages must be maintained by hand.',
      themes: ['boundaries', 'tooling'],
      evidence: [
        cite(eslintConfig, [8, 23]),
        cite(eslintConfig, [139, 195]),
        cite(compositionRoot, [15, 19]),
      ],
    },
    {
      id: 'datastores-internal-network',
      title: 'Datastores live on an internal network',
      decision:
        'PostgreSQL and Redis sit on a compose network marked internal with no published ports; only the API joins the outbound network, and its port is bound to 127.0.0.1. Rationale lives in the compose comments.',
      alternatives: ['Publishing database ports for convenience'],
      cost: 'Integration tests must run inside the compose network, which is why the image has a test stage and the test profile exists.',
      themes: ['security', 'operability'],
      evidence: [cite(compose, [10, 11]), cite(compose, [140, 146]), cite(dockerfile, [21, 26])],
    },
    {
      id: 'checksummed-immutable-migrations',
      title: 'Migrations are checksummed and immutable',
      decision:
        'The migrator records a sha256 per applied file, stops when one has changed, serialises concurrent migrators with an advisory lock, and commits each migration with its record. Rationale lives in the module comments.',
      alternatives: ['Editing applied migrations in place', 'A migration framework'],
      cost: 'Fixing a typo in an applied migration means a new file; the advisory lock key is a constant that every migrator must share.',
      themes: ['durability', 'operability'],
      evidence: [cite(migrate, [8, 10]), cite(migrate, [19, 27]), cite(migrate, [63, 66])],
    },
    {
      id: 'adapter-translates-both-ways',
      title: 'The adapter translates both ways and maps the unfamiliar to unknown',
      decision:
        'The provider port speaks only of instruments, observed lifecycles and outcome classes. Everything Appmax stops in the adapter: Portuguese statuses, orders, customers. An unrecognised status or event maps to unknown, never to pending. Rationale lives in the port and mapping headers.',
      alternatives: [
        'Letting provider status strings reach the state machine',
        'Defaulting an unfamiliar status to pending',
      ],
      cost: 'A total mapping that must be revisited when the provider adds a status; chargeback_vencido stays chargeback and is resolved by an operator because its meaning is ambiguous.',
      themes: ['boundaries', 'correctness'],
      evidence: [
        cite(providerPort, [4, 10]),
        cite(appmaxMappings, [3, 13]),
        cite(appmaxMappings, [67, 72]),
        cite(appmaxProvider, [21, 32]),
      ],
    },
  ],
  fragments: [
    {
      id: 'paid-ness-agrees-with-capture',
      title: 'Paid-ness has one source of truth',
      path: migration0003,
      lines: [112, 125],
      language: 'sql',
      demonstrates:
        'captured_amount_minor decides; paid_at and status are constrained to agree with it, so the legacy UPDATE statements abort with check_violation.',
    },
    {
      id: 'funds-require-authenticated-read',
      title: 'A transition must be legal and evidenced',
      path: migration0003,
      lines: [225, 237],
      language: 'sql',
      demonstrates:
        'The composite foreign key refuses any edge the table does not declare, and the CHECK refuses funding on anything weaker than an authenticated read.',
    },
    {
      id: 'audited-status-change',
      title: 'An unaudited status change cannot commit',
      path: migration0003,
      lines: [243, 276],
      language: 'sql',
      demonstrates:
        'The deferred constraint trigger looks for the transition row matching the new status and sequence at commit time and raises if it is missing.',
    },
    {
      id: 'one-live-per-merchant-reference',
      title: 'One live payment per merchant reference',
      path: migration0003,
      lines: [143, 148],
      language: 'sql',
      demonstrates:
        'A partial unique index: the reference is busy while a payment is open and free again once it finishes.',
    },
    {
      id: 'current-organization-id',
      title: 'The tenant scope of a transaction',
      path: migration0002,
      lines: [8, 20],
      language: 'sql',
      demonstrates:
        'NULL when nothing was set, and organization_id = NULL is never true, so an unscoped connection sees zero rows.',
    },
    {
      id: 'authenticate-api-key-function',
      title: 'The one pre-tenant door',
      path: migration0002,
      lines: [25, 60],
      language: 'sql',
      demonstrates:
        'SECURITY DEFINER with a pinned search_path resolves one key by its unique identifier and returns the hash, never a secret.',
    },
    {
      id: 'idempotency-unique-claim',
      title: 'The constraint the mechanism rests on',
      path: migration0004,
      lines: [37, 45],
      language: 'sql',
      demonstrates:
        'Uniqueness per organization, environment and key, plus a shape check that a completed record always carries its response.',
    },
    {
      id: 'idempotency-claim-insert',
      title: 'The claim is an INSERT, not a lookup',
      path: paymentCreation,
      lines: [74, 92],
      language: 'ts',
      demonstrates:
        'ON CONFLICT DO NOTHING RETURNING id: one row means the claim was won, zero rows means another transaction holds the key and the record decides.',
    },
    {
      id: 'application-role',
      title: 'The role the API connects as',
      path: rolesSql,
      lines: [21, 34],
      language: 'sql',
      demonstrates:
        'NOSUPERUSER and NOBYPASSRLS make the policies binding; REVOKE CREATE keeps an injection foothold from adding a table or dropping a policy.',
    },
    {
      id: 'evidence-classes',
      title: 'How much confidence a transition demands',
      path: transitionTable,
      lines: [82, 91],
      language: 'ts',
      demonstrates:
        'The three evidence classes and why authenticated_provider_read exists: the code treats Appmax webhooks as unsigned.',
    },
    {
      id: 'decide-transition',
      title: 'Terminal check, edge lookup, evidence rank',
      path: stateMachine,
      lines: [53, 81],
      language: 'ts',
      demonstrates:
        'The whole state machine: a terminal status refuses everything, an undeclared edge is refused, and weaker evidence than the edge demands is refused with the reason.',
    },
    {
      id: 'five-xx-is-ambiguity',
      title: 'A 5xx is not a failure',
      path: providerOutcome,
      lines: [125, 131],
      language: 'ts',
      demonstrates:
        'The fall-through of the classifier: a remaining 4xx is a safe failure, and anything else, including every 5xx, is unknown_outcome.',
    },
    {
      id: 'timing-oracle-burn',
      title: 'An unknown identifier still pays for one HMAC',
      path: authenticate,
      lines: [28, 37],
      language: 'ts',
      demonstrates:
        'The lookup that misses computes the same hash a hit would, so response time does not reveal which identifiers exist.',
    },
    {
      id: 'order-without-reference',
      title: 'An order with no identifier is ambiguous, not failed',
      path: appmaxProvider,
      lines: [177, 183],
      language: 'ts',
      demonstrates:
        'When Appmax returns no order identifier there is nothing to reconcile on, so the outcome is reported as unknown and the call is never retried.',
    },
    {
      id: 'single-flight-token',
      title: 'One token fetch for every concurrent caller',
      path: appmaxTokenCache,
      lines: [60, 74],
      language: 'ts',
      demonstrates:
        'A held token is reused until its renewal time; callers that arrive during a fetch await the same promise instead of starting their own.',
    },
    {
      id: 'appmax-descriptor',
      title: 'What Appmax declares it can do',
      path: appmaxProvider,
      lines: [34, 42],
      language: 'ts',
      demonstrates:
        'Capabilities declared rather than assumed, and the fact the routing layer needs: instrument creation is not idempotent.',
    },
    {
      id: 'webhook-events',
      title: 'Webhook events that warrant a read',
      path: appmaxMappings,
      lines: [88, 108],
      language: 'ts',
      demonstrates:
        'None of these funds a payment; an event is a prompt to read authoritative state.',
    },
    {
      id: 'domain-import-boundary',
      title: 'The domain cannot import infrastructure',
      path: eslintConfig,
      lines: [139, 156],
      language: 'js',
      demonstrates:
        'A lint rule, not a convention: any import of pg, undici, fastify, pino or an infrastructure module from the domain fails the build.',
    },
    {
      id: 'internal-network',
      title: 'Datastores on an internal network',
      path: compose,
      lines: [140, 149],
      language: 'yaml',
      demonstrates:
        'The implemented half of SSRF defence: nothing that talks to the internet can reach PostgreSQL or Redis. The egress policy the comment names does not exist yet.',
    },
  ],
  verification: {
    layers: [
      {
        name: 'Unit',
        tool: 'Vitest projects shared and api',
        proves:
          'The pure rules hold without a database: the full product of statuses and triggers, the outcome taxonomy, idempotency decisions, key hashing, the Secret wrapper and the BR Code checksum.',
        examples: [
          {
            path: stateMachineTest,
            proves:
              'Exactly the 24 declared edges are permitted out of 220 status and trigger pairs; every terminal status refuses every trigger; funding on internal evidence is refused.',
          },
          {
            path: providerTest,
            proves:
              'A timeout, a 5xx and an unreadable body are unknown_outcome, and unknown_outcome licenses neither failover nor retry.',
          },
          {
            path: 'apps/api/src/domain/idempotency/idempotency.test.ts',
            proves:
              'Key order and whitespace do not change a fingerprint; a different body under the same key is a conflict, never a replay.',
          },
          {
            path: 'apps/api/src/application/authenticate-api-key.test.ts',
            proves:
              'The secret is checked before the lifecycle, so a wrong secret cannot confirm a real identifier.',
          },
          {
            path: 'packages/shared/src/server/secret.test.ts',
            proves:
              'A Secret yields [redacted] through toString, template interpolation, JSON.stringify, util.inspect and console.log.',
          },
          {
            path: 'apps/api/src/domain/pix/br-code.test.ts',
            proves:
              'CRC-16/CCITT-FALSE matches the published check value and a single altered character is rejected.',
          },
        ],
      },
      {
        name: 'Integration against PostgreSQL',
        tool: 'Vitest project integration, serial, inside the compose test profile',
        proves:
          'What the database refuses on its own, asserted through the application role: cross-tenant reads and writes, illegal or unaudited transitions, floating-point money, racing idempotency claims and edited migrations.',
        examples: [
          {
            path: idempotencyIntegration,
            proves:
              'Fifty racing transactions with one key create exactly one payment; the same key with a different body is refused; two merchants may use the same key text.',
          },
          {
            path: tenantIntegration,
            proves:
              'No scope means zero rows; an insert or update aimed at another tenant is rejected; every table with organization_id is registered and has a policy.',
          },
          {
            path: paymentsIntegration,
            proves:
              'No numeric column exists; paid-ness constraints hold; an unaudited status change and an undeclared edge are refused; the SQL and TypeScript tables agree.',
          },
          {
            path: apiKeyIntegration,
            proves:
              'A key resolves through the function without a scope while the table itself returns nothing; forty concurrent authentications succeed.',
          },
          {
            path: migrateIntegration,
            proves:
              'A second run applies nothing and an edited applied migration raises MigrationChecksumMismatchError naming the file.',
          },
        ],
      },
      {
        name: 'Adapter and transport',
        tool: 'Vitest project api; the transport tests reach a local http server over real undici',
        proves:
          'undici behaves as the taxonomy assumes: a refused connection is reported as never delivered, a hang as a timeout, and neither the client secret nor the access token reaches a log line.',
        examples: [
          {
            path: appmaxTransportTest,
            proves:
              'Production endpoints cannot be overridden; a body timeout is a timeout; a refused connection is safe to retry; rejected field names are logged without values.',
          },
          {
            path: appmaxProviderTest,
            proves:
              'The customer, order, payment sequence is followed; amounts travel as integer cents; a timeout on the order call is unknown_outcome.',
          },
          {
            path: appmaxTokenCacheTest,
            proves:
              'Twenty simultaneous callers cause one token fetch and a failed fetch does not poison the cache.',
          },
        ],
      },
      {
        name: 'Sandbox validation',
        tool: 'node scripts/validate-appmax.mjs, run by hand',
        proves:
          'What Appmax sends, as opposed to what the local server pretends: token acquisition, an authenticated read, and optionally one real Pix whose BR Code and expiry are checked.',
        examples: [
          {
            path: validateAppmax,
            proves:
              'Without credentials it exits 78 and validates nothing; with them it creates at most one order of 100 minor units.',
          },
        ],
      },
      {
        name: 'Documentation drift',
        tool: 'node scripts/verify-docs.mjs',
        proves:
          'docs/state-machine.md is byte-identical to what the compiled transition table renders.',
        examples: [
          {
            path: verifyDocs,
            proves:
              'The check exits 1 when the document is missing or differs from the rendered table.',
          },
        ],
      },
    ],
    pipeline: [
      {
        name: 'No workflow is committed',
        detail:
          'The pinned commit tracks no .github directory. Comments in scripts and the generated document refer to CI, but the gates run only locally: git hooks installed by the prepare script and the npm scripts below.',
      },
    ],
    checks: [
      {
        command: 'npm run docs:check',
        refuses: 'A docs/state-machine.md that differs from the compiled transition table.',
      },
      {
        command: 'npm run scan:secrets',
        refuses:
          'Credential-shaped literals in tracked files, including the mpg_live_ and mpg_test_ key format of the gateway itself.',
      },
      {
        command: 'npm run lint',
        refuses:
          'else, parseFloat and toFixed, abbreviated identifiers, domain code importing infrastructure, application code importing adapters, node builtins in the browser-safe surface of shared.',
      },
      {
        command: 'npm run typecheck',
        refuses:
          'Type errors under strict, noUncheckedIndexedAccess and exactOptionalPropertyTypes across both workspaces.',
      },
      { command: 'npm run knip', refuses: 'Unused exports and dependencies.' },
      {
        command: 'npm test',
        refuses:
          'Failures in the projects it selects: domain, shared and tools. The configuration declares shared, api, integration and tools, so the api unit project is not part of npm test and runs through test:all or --project api.',
      },
      {
        command: 'npm run test:integration',
        refuses:
          'Runs only inside the compose network: OWNER_DATABASE_URL and DATABASE_URL are required and the tests throw without them.',
      },
      {
        command: 'git hooks pre-commit, commit-msg, pre-push',
        refuses:
          'Unformatted or unlinted staged files, non-conventional commit messages, and a push when typecheck or npm test fails.',
      },
      {
        command: 'npm run validate:appmax',
        refuses: 'Reporting success without sandbox credentials; exits 78.',
      },
    ],
    evidence: [
      cite(vitestConfig, [3, 54]),
      cite(rootPackage, [22, 41]),
      cite(installHooks, [1, 31]),
      cite(scanSecrets, [1, 45]),
      cite(verifyDocs, [136, 159]),
      cite(validateAppmax, [66, 84]),
      cite(testDatabase, [16, 24]),
      cite(dockerfile, [21, 26]),
    ],
  },
  security: [
    {
      concern: 'One merchant reading the rows of another',
      control:
        'Row level security on all seven tenant tables with USING and WITH CHECK on current_organization_id(); the application role holds NOBYPASSRLS and owns no table; a registry test fails when a table with organization_id has no policy.',
      evidence: [
        cite(migration0002, [76, 107]),
        cite(migration0003, [291, 310]),
        cite(rolesSql, [21, 27]),
        cite(tenantIntegration, [231, 275]),
      ],
    },
    {
      concern: 'A query that forgets to set its tenant',
      control:
        'current_organization_id() returns NULL, every policy compares against NULL and yields no rows; set_config uses is_local so the scope dies with the transaction and cannot leak through the pool.',
      evidence: [
        cite(migration0002, [8, 20]),
        cite(database, [43, 62]),
        cite(tenantIntegration, [135, 143]),
      ],
    },
    {
      concern: 'Resolving an API key before its tenant is known',
      control:
        'Two SECURITY DEFINER functions with a pinned search_path: authenticate_api_key takes the unique identifier and returns the hash, record_api_key_use moves one timestamp forward by primary key. The table itself returns nothing to the application role without a scope.',
      evidence: [
        cite(migration0002, [25, 74]),
        cite(apiKeyRepository, [17, 25]),
        cite(apiKeyIntegration, [105, 114]),
      ],
    },
    {
      concern: 'A database dump yielding usable keys',
      control:
        'Only an HMAC-SHA256 of identifier.secret under a pepper outside the database is stored; the secret is 32 random base62 characters and is never persisted.',
      evidence: [cite(sharedApiKey, [111, 127]), cite(migration0001, [80, 84])],
    },
    {
      concern: 'Timing revealing which key identifiers exist',
      control:
        'An unknown identifier still computes one HMAC; the length check precedes timingSafeEqual; revocation, expiry and archived organization are checked only after the secret matches. The domain comment forbids returning the refusal reason to the caller; no route returns anything yet.',
      evidence: [
        cite(authenticate, [30, 54]),
        cite(sharedApiKey, [129, 142]),
        cite(apiKeyDomain, [31, 44]),
      ],
    },
    {
      concern: 'Secrets and customer data reaching logs',
      control:
        'Secret overrides toString, toJSON, toPrimitive and util.inspect; pino redacts authorization, cookie, idempotency-key and secret-shaped paths; the Appmax transport logs failure kinds and rejected field names, never values or tokens.',
      evidence: [
        cite(sharedSecret, [1, 44]),
        cite(logger, [7, 32]),
        cite(appmaxTransport, [168, 203]),
        cite(appmaxFailure, [112, 128]),
      ],
    },
    {
      concern: 'A SQL injection foothold escalating to schema changes',
      control:
        'REVOKE CREATE ON SCHEMA public from the application role; no access to schema_migrations; the tenant registry is readable but not writable; the integration suite asserts CREATE TABLE and reading schema_migrations both fail with permission denied.',
      evidence: [cite(rolesSql, [32, 57]), cite(tenantIntegration, [70, 84])],
    },
    {
      concern: 'Log injection through a client-supplied request identifier',
      control:
        'x-request-id is kept only when it matches ^[\\w-]{8,64}$; anything else is replaced with randomUUID(). Responses carry no-store, nosniff, no-referrer and DENY headers.',
      evidence: [cite(createServer, [14, 41])],
    },
    {
      concern: 'Production traffic redirected by configuration',
      control:
        'Appmax base URLs are a constant keyed by the payment environment, not configuration; the transport throws when an endpoint override is supplied for PRODUCTION.',
      evidence: [
        cite(appmaxEndpoints, [1, 26]),
        cite(appmaxTransport, [62, 83]),
        cite(appmaxTransportTest, [139, 150]),
      ],
    },
    {
      concern: 'An unsigned provider webhook funding a payment',
      control:
        'Every transition into paid, partially_refunded, refunded or chargeback requires authenticated_provider_read in the state machine and in a CHECK constraint on payment_status_transitions.',
      evidence: [
        cite(stateMachine, [40, 51]),
        cite(stateMachine, [69, 78]),
        cite(migration0003, [232, 237]),
        cite(paymentsIntegration, [426, 433]),
      ],
    },
    {
      concern: 'Datastores and the API exposed to the network',
      control:
        'PostgreSQL and Redis sit on a compose network marked internal with no published ports; the API is published on 127.0.0.1 only and runs as the unprivileged node user on an image installed with --ignore-scripts.',
      evidence: [
        cite(compose, [10, 11]),
        cite(compose, [98, 99]),
        cite(compose, [140, 146]),
        cite(dockerfile, [8, 11]),
        cite(dockerfile, [41, 42]),
      ],
    },
    {
      concern: 'Credentials committed to history',
      control:
        'scan-secrets.mjs scans tracked files for ten credential shapes including the key format of the gateway itself, never prints the match, and allows a fixture only through a per-line marker; .env files and key material are gitignored.',
      evidence: [
        cite(scanSecrets, [1, 45]),
        cite(scanSecrets, [128, 139]),
        cite('.gitignore', [20, 41]),
      ],
    },
  ],
  limitations: [
    {
      statement:
        'The HTTP surface is GET /health and GET /ready. No payment, key, webhook or refund route exists, and the composition root wires environment, logger and database only.',
      evidence: [
        cite(createServer, [43, 45]),
        cite(healthRoutes, [20, 41]),
        cite(compositionRoot, [20, 33]),
      ],
    },
    {
      statement:
        'The authenticator, PaymentCreationRepository and the Appmax adapter are constructed only by tests and by the validation script. Nothing in the running process instantiates them, and nothing joins a provider outcome to the state machine or to the database.',
      evidence: [
        cite(compositionRoot, [1, 13]),
        cite(idempotencyIntegration, [55, 62]),
        cite(apiKeyIntegration, [68, 76]),
        cite(validateAppmax, [90, 135]),
      ],
    },
    {
      statement:
        'authenticateApiKey never calls recordUse, so last_used_at is written only by the integration test that calls the repository directly. The port comment describes a fire-and-forget call site that does not exist yet.',
      evidence: [
        cite(authenticate, [19, 62]),
        cite(apiKeyPort, [27, 31]),
        cite(apiKeyIntegration, [254, 272]),
      ],
    },
    {
      statement:
        'assertCapabilitiesAreImplemented is documented as a startup check, and assertPresentableBrCode as the gate before a customer sees a code. At the pinned commit tests and the validation script call them; the process and the adapter do not.',
      evidence: [
        cite(providerCapability, [89, 105]),
        cite(brCode, [122, 147]),
        cite(appmaxProvider, [195, 201]),
        cite(compositionRoot, [20, 33]),
      ],
    },
    {
      statement:
        'Nothing reconciles a payment in unknown. The transitions out of it exist as table rows and there is no job, scheduler or operator surface that produces them.',
      evidence: [cite(transitionTable, [154, 190]), cite(compositionRoot, [20, 33])],
    },
    {
      statement:
        'Redis is provisioned in compose and required as REDIS_URL by the configuration schema, but no code connects to it and no Redis client is a dependency. The compose comment about rate limiting and circuit breaking describes nothing in the code.',
      evidence: [cite(compose, [34, 46]), cite(environment, [16, 16]), cite(apiPackage, [9, 19])],
    },
    {
      statement:
        'No CI workflow is committed. The hook installer, the secret scanner and the generated document all speak of CI; at the pinned commit the gates run only through local git hooks and npm scripts.',
      evidence: [
        cite(installHooks, [1, 9]),
        cite(scanSecrets, [1, 6]),
        cite('docs/state-machine.md', [5, 5]),
      ],
    },
    {
      statement:
        'npm test selects the projects domain, shared and tools. vitest.config.ts declares shared, api, integration and tools, so the api unit project is outside npm test and outside the pre-push hook that runs it. The tools project has no test files.',
      evidence: [
        cite(rootPackage, [30, 32]),
        cite(vitestConfig, [5, 46]),
        cite(installHooks, [19, 23]),
      ],
    },
    {
      statement:
        '.env.example refers to a bundled provider simulator and to dashboard and simulator host ports. No simulator and no dashboard exist in the repository; the lint comment about a browser dashboard describes a package that is not there.',
      evidence: [
        cite(environmentExample, [10, 14]),
        cite(environmentExample, [27, 29]),
        cite(eslintConfig, [177, 177]),
      ],
    },
    {
      statement:
        'The compose comment names an address-pinning egress policy as the other half of SSRF defence. No such policy exists in the code; the internal network is the only half that is implemented.',
      evidence: [cite(compose, [140, 146])],
    },
    {
      statement:
        'Playwright is declared and scripted as test:e2e, but no Playwright configuration or end-to-end test is tracked.',
      evidence: [cite(rootPackage, [34, 34]), cite(rootPackage, [46, 46])],
    },
    {
      statement:
        'Money supports only BRL; card and boleto are accepted by the payments CHECK but no provider declares a capability for them.',
      evidence: [
        cite(sharedCurrency, [6, 8]),
        cite(migration0003, [91, 91]),
        cite(appmaxProvider, [34, 42]),
      ],
    },
    {
      statement:
        'The Appmax status chargeback_vencido is mapped to chargeback because its documented meaning is ambiguous; confirming it against the sandbox is listed as pending in the code.',
      evidence: [cite(appmaxMappings, [67, 72])],
    },
    {
      statement: 'package.json declares the MIT license but no LICENSE file is committed.',
      evidence: [cite(rootPackage, [7, 7])],
    },
  ],
  boardFlow: 'provider-outcome',
});
