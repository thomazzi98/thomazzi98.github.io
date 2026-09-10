import { repositoryIdentity } from './repositories';
import { defineSystem } from './validate';

const file = (path: string) => ({ path });

const lines = (path: string, start: number, end: number) => ({
  path,
  lines: [start, end] as [number, number],
});

const scanNetwork = 'apps/api/src/application/scan-network.use-case.ts';
const evaluatePayments = 'apps/api/src/application/evaluate-payments.use-case.ts';
const createPayment = 'apps/api/src/application/create-payment.use-case.ts';
const deliverCallbacks = 'apps/api/src/application/deliver-callbacks.use-case.ts';
const settlePayments = 'apps/api/src/application/settle-payments.use-case.ts';
const compositionRoot = 'apps/api/src/composition-root.ts';
const configuration = 'apps/api/src/configuration.ts';
const networkWorker = 'apps/api/src/workers/network-worker.ts';
const settlementWorker = 'apps/api/src/workers/settlement-worker.ts';
const callbackWorker = 'apps/api/src/workers/callback-worker.ts';
const paymentRepository = 'apps/api/src/infrastructure/persistence/payment.repository.ts';
const chainScanStore = 'apps/api/src/infrastructure/persistence/chain-scan.store.ts';
const blockCursorRepository = 'apps/api/src/infrastructure/persistence/block-cursor.repository.ts';
const leaderLeaseRepository = 'apps/api/src/infrastructure/persistence/leader-lease.repository.ts';
const evaluationQueueRepository =
  'apps/api/src/infrastructure/persistence/evaluation-queue.repository.ts';
const webhookDeliveryRepository =
  'apps/api/src/infrastructure/persistence/webhook-delivery.repository.ts';
const idempotencyRepository = 'apps/api/src/infrastructure/persistence/idempotency.repository.ts';
const rateLimitRepository = 'apps/api/src/infrastructure/persistence/rate-limit.repository.ts';
const settlementRepository = 'apps/api/src/infrastructure/persistence/settlement.repository.ts';
const destinationPolicy = 'apps/api/src/infrastructure/callbacks/destination-policy.ts';
const callbackTransport = 'apps/api/src/infrastructure/callbacks/callback-transport.ts';
const addressResolver = 'apps/api/src/infrastructure/callbacks/address-resolver.ts';
const evmChainGateway = 'apps/api/src/infrastructure/chain/evm-chain-gateway.ts';
const evmBroadcaster = 'apps/api/src/infrastructure/chain/evm-settlement-broadcaster.ts';
const networkConfiguration = 'apps/api/src/infrastructure/chain/network-configuration.ts';
const allocatorProvider = 'apps/api/src/infrastructure/wallet/allocator-provider.ts';
const paymentDestination = 'apps/api/src/infrastructure/wallet/payment-destination.ts';
const apiKey = 'apps/api/src/infrastructure/crypto/api-key.ts';
const authentication = 'apps/api/src/http/authentication.ts';
const buildServer = 'apps/api/src/http/build-server.ts';
const gatewayRoutes = 'apps/api/src/http/routes/gateway-payments.routes.ts';
const checkoutRoutes = 'apps/api/src/http/routes/checkout.routes.ts';
const healthRoutes = 'apps/api/src/http/routes/health.routes.ts';
const finalityPolicy = 'apps/api/src/domain/finality-policy.ts';
const ledgerObservation = 'apps/api/src/domain/ledger-observation.ts';
const transferLedger = 'apps/api/src/domain/transfer-ledger.ts';
const webhookRetry = 'apps/api/src/domain/webhook-retry.ts';
const spendCeiling = 'apps/api/src/domain/spend-ceiling.ts';
const chainGatewayPort = 'apps/api/src/application/ports/chain-gateway.port.ts';
const broadcasterPort = 'apps/api/src/application/ports/settlement-broadcaster.port.ts';
const transitionTable = 'packages/shared/src/payment-transition-table.ts';
const paymentStatus = 'packages/shared/src/payment-status.ts';
const settlementStatus = 'packages/shared/src/settlement-status.ts';
const webhookSignature = 'packages/shared/src/server/webhook-signature.ts';
const bffRoute = 'apps/web/src/app/api/bff/[...path]/route.ts';
const checkoutRoute = 'apps/web/src/app/api/checkout/[checkoutToken]/route.ts';
const session = 'apps/web/src/lib/session.ts';
const walletPanel = 'apps/web/src/app/pay/[checkoutToken]/_checkout/wallet-panel.tsx';
const demoReceiver = 'apps/demo-receiver/src/main.ts';
const compose = 'docker-compose.yml';
const rolesSql = 'docker/roles.sql';
const migrationCore = 'apps/api/migrations/0001_payment_core.sql';
const migrationCallbacks = 'apps/api/migrations/0002_callbacks.sql';
const migrationSettlement = 'apps/api/migrations/0005_settlement.sql';
const migrationRateLimits = 'apps/api/migrations/0013_rate_limits.sql';
const migrate = 'apps/api/src/infrastructure/persistence/migrate.ts';
const bootstrapCli = 'apps/api/src/infrastructure/persistence/bootstrap-cli.ts';
const limitations = 'docs/limitations.md';
const readme = 'README.md';
const ciWorkflow = '.github/workflows/ci.yml';
const testnetWorkflow = '.github/workflows/testnet-validation.yml';
const vitestConfig = 'vitest.config.ts';
const reorgSpec = 'apps/api/test/reorg.spec.ts';
const resilienceSpec = 'apps/api/test/resilience.spec.ts';
const leaderLeaseSpec = 'apps/api/test/leader-lease.spec.ts';
const outboxSpec = 'apps/api/test/outbox-atomicity.spec.ts';
const callbackDeliverySpec = 'apps/api/test/callback-delivery.spec.ts';
const checkoutSpec = 'apps/api/test/checkout.spec.ts';
const idempotencySpec = 'apps/api/test/idempotency.spec.ts';
const settlementSpec = 'apps/api/test/settlement.spec.ts';
const blockScannerSpec = 'apps/api/test/block-scanner.spec.ts';
const lifecycleSpec = 'apps/api/test/payment-lifecycle.spec.ts';
const destinationPolicySpec = 'apps/api/src/infrastructure/callbacks/destination-policy.spec.ts';

export const system = defineSystem({
  id: 'cryptopay',
  name: 'CryptoPay',
  shortName: 'CryptoPay',
  tagline: 'A crypto payment processor that decides what happened by reading the chain.',
  problem: [
    'A merchant needs to accept Polygon, TRON or Solana payments and be told, with certainty, when the money is theirs. The hard part is not the HTTP surface. It is that the browser lies, providers lag, chains reorganise, and a notification sent once and lost is a shipped order nobody paid for.',
    'CryptoPay issues one derived deposit address per payment and hands the customer a hosted checkout. From then on the browser is irrelevant. A chain worker scans blocks under a fenced lease, records transfers, and only credits a payment once the confirmation count and the chain finality tag agree, seconded by a second provider. A merchant is told through a Standard Webhooks callback written in the same transaction as the status change.',
    'PostgreSQL is the only durable store and the only queue. Four processes hold four database roles: the API composes no signer and opens a seed only to derive addresses, the chain worker cannot read a key or a seed, the callback worker cannot read a payment, and the settlement worker is the only process that signs.',
  ],
  thesis:
    'Every state change is derived from stored chain observations, and anything the chain has not settled is held rather than guessed.',
  repository: {
    ...repositoryIdentity('cryptopay'),
    pinnedOn: '2026-09-09',
    firstCommitOn: '2026-09-06',
    commitCount: 89,
    license: 'MIT',
    packageManager: 'npm@11.6.2',
    runtime: 'Node.js 24',
  },
  maturity: {
    label: 'validated',
    statement:
      'Polygon is validated end to end: the integration suites run against an embedded PostgreSQL 18 and a real Anvil chain, a gated workflow sends one real payment on Amoy, and mainnet was broadcast on once by runbook. TRON and Solana allocate addresses and are driven on local nodes, but no payment has been sent to them on a public network.',
    evidence: [
      lines(limitations, 148, 168),
      lines(testnetWorkflow, 1, 56),
      lines(vitestConfig, 22, 75),
      file('docs/runbook-mainnet-validation.md'),
    ],
  },
  stack: [
    {
      technology: 'nodejs',
      role: 'Runtime for the API, the three workers, the receiver and every script. Pinned to 24.11.1 in the images.',
      evidence: [lines('package.json', 12, 16), file('docker/api.Dockerfile')],
    },
    {
      technology: 'typescript',
      role: 'Every package, on 6.0.3, with layering enforced by lint rather than by module boundaries.',
      evidence: [file('package.json'), file('tsconfig.base.json'), file('eslint.config.js')],
    },
    {
      technology: 'fastify',
      role: 'The HTTP server, built once without listening so tests drive it through inject. No CORS by design; the OpenAPI document is asserted against the registered routes at boot.',
      evidence: [lines('apps/api/package.json', 23, 23), lines(buildServer, 127, 160)],
    },
    {
      technology: 'postgresql',
      role: 'The only durable store and the only queue. Version 18.4, 17 hand-written migrations, 22 tables, four LOGIN roles.',
      evidence: [lines(compose, 17, 48), file(migrationCore), lines(rolesSql, 22, 37)],
    },
    {
      technology: 'node-postgres',
      role: 'Raw SQL through pg 8.23. Every repository is a class over a Pool; there is no ORM.',
      evidence: [
        lines('apps/api/package.json', 24, 24),
        file('apps/api/src/infrastructure/persistence/database.ts'),
      ],
    },
    {
      technology: 'zod',
      role: 'Request contracts, configuration parsing, and the OpenAPI document generated from the same schemas the server validates with.',
      evidence: [
        lines('apps/api/package.json', 29, 29),
        lines('packages/shared/src/openapi.ts', 1, 18),
        file(configuration),
      ],
    },
    {
      technology: 'pino',
      role: 'Structured logs with a redaction list that covers secrets at any depth and a binary-size guard. There is no metrics endpoint.',
      evidence: [
        lines('apps/api/package.json', 25, 25),
        file('apps/api/src/observability/logger.ts'),
      ],
    },
    {
      technology: 'viem',
      role: 'The EVM adapter: a fallback transport over the configured endpoints, a separate client for the finality second opinion, and the signer for settlement.',
      evidence: [
        lines('apps/api/package.json', 28, 28),
        lines(evmChainGateway, 118, 135),
        file(evmBroadcaster),
      ],
    },
    {
      technology: 'undici',
      role: 'Callback transport with the connection pinned to the address the destination policy checked, one connection per request, no redirects.',
      evidence: [lines('apps/api/package.json', 27, 27), lines(callbackTransport, 62, 125)],
    },
    {
      technology: 'nextjs',
      role: 'Next 16 App Router serving the dashboard, the hosted checkout, a BFF proxy that attaches the API key server-side, and a credential-free checkout relay.',
      evidence: [lines('apps/web/package.json', 16, 16), lines(bffRoute, 1, 44)],
    },
    {
      technology: 'react',
      role: 'React 19 with wagmi and TanStack Query on the checkout page, where the customer wallet signs the transfer.',
      evidence: [lines('apps/web/package.json', 12, 22), file(walletPanel)],
    },
    {
      technology: 'vitest',
      role: 'Seven projects: shared, api, api-integration, chain-local, chain-live, web and tools. Coverage floors hold the two state machine modules at 100 percent.',
      evidence: [lines(vitestConfig, 1, 126)],
    },
    {
      technology: 'playwright',
      role: 'End to end against the stack started by scripts/demo.mjs, including a test that the API key never reaches page JavaScript.',
      evidence: [file('playwright.config.ts'), file('e2e/dashboard.spec.ts')],
    },
    {
      technology: 'docker',
      role: 'Compose is the deployment shape: PostgreSQL, three one-shot jobs, six long-running services, two bridge networks, one profile for the signer.',
      evidence: [lines(compose, 1, 305), file('docker/api.Dockerfile')],
    },
  ],
  nodes: [
    {
      id: 'merchant',
      label: 'Merchant backend',
      kind: 'actor',
      purpose:
        'A merchant server or payment gateway that creates payments with a Bearer API key and receives signed callbacks.',
      notes: [
        'Keys are cp_test_ or cp_live_ and the environment travels in the key itself.',
        'A test key cannot name a mainnet: the caller says a family, the key decides the network.',
      ],
      evidence: [lines(apiKey, 7, 24), lines(networkConfiguration, 500, 523)],
    },
    {
      id: 'operator',
      label: 'Operator browser',
      kind: 'actor',
      purpose:
        'A person at the merchant who pastes an API key into the connect form and then reads and manages payments, networks, settlement, webhooks and settings in the dashboard.',
      notes: [
        'No accounts, passwords or users table: the dashboard authenticates the way a merchant server does, so anything it shows is reachable with the same key.',
        'The key is written to the httpOnly cookie cryptopay_key by a server action and never reaches page JavaScript; an end-to-end test reads document.cookie to prove it.',
      ],
      evidence: [
        lines('apps/web/src/app/connect/page.tsx', 11, 32),
        lines(session, 3, 15),
        lines('e2e/dashboard.spec.ts', 86, 95),
      ],
    },
    {
      id: 'customer-browser',
      label: 'Customer browser and wallet',
      kind: 'actor',
      purpose:
        'Opens the hosted checkout, signs the transfer from its own wallet, and may report the transaction hash as a hint.',
      notes: [
        'Nothing the browser says is trusted. The hint only schedules an evaluation and answers 202.',
      ],
      evidence: [lines(walletPanel, 166, 166), lines(checkoutRoutes, 55, 98)],
    },
    {
      id: 'web',
      label: 'Web (Next 16)',
      kind: 'frontend',
      purpose:
        'The merchant dashboard, the public checkout page, a BFF proxy for the dashboard and a credential-free relay for the checkout.',
      technologies: ['nextjs', 'react', 'typescript'],
      notes: [
        'The API key lives in an httpOnly cookie named cryptopay_key for 12 hours and is attached server-side. The browser bundle never sees it.',
        'The BFF forwards only 15 path patterns and four methods; anything else answers 404 or 405.',
      ],
      evidence: [lines(session, 17, 60), lines(bffRoute, 21, 68), lines(checkoutRoute, 1, 27)],
    },
    {
      id: 'api',
      label: 'API (Fastify)',
      kind: 'process',
      purpose:
        'Creates payments, reads state, manages payout destinations and webhook secrets. Serves /v1 as problem+json and /api/v1/payments in the gateway envelope.',
      technologies: ['nodejs', 'typescript', 'fastify', 'zod', 'pino'],
      notes: [
        'Cannot sign. Polygon and TRON addresses come from a cached public key; the seed is opened once per environment and family to build it, and per allocation for Solana.',
        'Refuses to start if the OpenAPI document does not describe the routes it serves.',
        'Refuses to start in production with a private callback allowlist, or as a production signer without a spend ceiling.',
        'Database role cryptopay_api has SELECT, INSERT, UPDATE and DELETE on every table, wallet_seeds included, minus writes on settlements, chain_transactions, chain_accounts and treasury_accounts.',
      ],
      evidence: [
        lines(buildServer, 134, 300),
        lines(allocatorProvider, 14, 26),
        lines(configuration, 200, 225),
        lines(rolesSql, 39, 47),
      ],
    },
    {
      id: 'chain-worker',
      label: 'Chain worker',
      kind: 'process',
      purpose:
        'One NetworkWorker and one ReconciliationWorker per configured network, each on its own lease. Scans blocks, records transfers, evaluates payments and writes the outbox row.',
      technologies: ['nodejs', 'typescript', 'viem', 'pino'],
      notes: [
        'Reads the chain and never signs. Its role cannot touch api_keys or wallet_seeds.',
        'The scan window halves on LedgerRangeTooWideError and doubles after five clean windows, capped at 500 blocks.',
        'A halted network stops both scanning and evaluation until an operator resumes it.',
      ],
      evidence: [
        lines(compositionRoot, 294, 416),
        lines(networkWorker, 16, 35),
        lines(scanNetwork, 46, 51),
        lines(rolesSql, 49, 58),
      ],
    },
    {
      id: 'callback-worker',
      label: 'Callback worker',
      kind: 'process',
      purpose:
        'Drains the webhook outbox: decides the destination, signs with a fresh timestamp, sends the stored bytes, records every attempt.',
      technologies: ['nodejs', 'typescript', 'undici', 'pino'],
      notes: [
        'The only process that connects to addresses a stranger chose, and the only one on both Docker networks.',
        'Holds no lease. Concurrency is settled by the claim and the partial unique index on in-flight deliveries.',
        'Its role sees the outbox, the attempts and the signing secrets, and is explicitly revoked on payments, api_keys, wallet_seeds and payment_addresses.',
      ],
      evidence: [
        lines(callbackWorker, 7, 19),
        lines(compose, 197, 220),
        lines(rolesSql, 60, 67),
        lines(rolesSql, 86, 88),
      ],
    },
    {
      id: 'settlement-worker',
      label: 'Settlement worker',
      kind: 'process',
      purpose:
        'The only process that can sign. Reconciles outstanding transactions against the chain, funds gas from the treasury under a spend ceiling, sweeps deposits to the payout account.',
      technologies: ['nodejs', 'typescript', 'viem', 'pino'],
      notes: [
        'Behind the compose profile settlement and refuses to start unless SETTLEMENT_ENABLED=true.',
        'EVM only: networks with supportsSettlement false are filtered out before a broadcaster is built.',
        'Granted wallet_seeds by name and revoked INSERT, UPDATE and DELETE on payments. The API role also reaches wallet_seeds, through its grant on every table.',
      ],
      evidence: [
        lines(compositionRoot, 429, 546),
        lines(compose, 222, 253),
        lines(rolesSql, 69, 95),
      ],
    },
    {
      id: 'migrate',
      label: 'migrate',
      kind: 'job',
      purpose:
        'Applies the 17 SQL migrations in filename order under a session advisory lock, recording a checksum per file.',
      technologies: ['nodejs', 'node-postgres'],
      notes: ['Refuses to run when an applied migration has been edited.'],
      evidence: [lines(compose, 50, 64), lines(migrate, 104, 130)],
    },
    {
      id: 'roles',
      label: 'roles',
      kind: 'job',
      purpose:
        'Runs docker/roles.sql through psql after the migrations, creating the four LOGIN roles and their grants, revokes and timeouts.',
      technologies: ['postgresql'],
      notes: [
        'Applied after migrate on purpose: as an init hook every GRANT would fail on tables that do not exist yet.',
      ],
      evidence: [lines(compose, 72, 91), lines(rolesSql, 1, 37)],
    },
    {
      id: 'bootstrap',
      label: 'bootstrap',
      kind: 'job',
      purpose:
        'Provisions the test wallet seed, one merchant, one API key, a webhook signing secret and a block cursor per configured network. Idempotent.',
      technologies: ['nodejs', 'node-postgres'],
      notes: ['Writes the demo signing secret to a volume the receiver mounts read-only.'],
      evidence: [lines(compose, 93, 120), lines(bootstrapCli, 11, 28)],
    },
    {
      id: 'postgres',
      label: 'PostgreSQL 18',
      kind: 'store',
      purpose:
        'The only durable store: payments, addresses, transfers, the status audit trail, cursors, header ring, leases, seeds, idempotency keys, settlements and rate windows.',
      technologies: ['postgresql'],
      notes: [
        'Correctness lives in constraints: environment against network, one address per network, one transfer per chain event, one audit row per version.',
        'Bound to 127.0.0.1:5433 only.',
      ],
      evidence: [lines(migrationCore, 1, 291), lines(compose, 17, 48)],
    },
    {
      id: 'evaluation-queue',
      label: 'payment_evaluation_queue',
      kind: 'queue',
      purpose:
        'A table in PostgreSQL. The scanner, the reconciler and the browser hint enqueue payments; the evaluator claims them with FOR UPDATE SKIP LOCKED under a lease.',
      technologies: ['postgresql'],
      notes: [
        'Every live payment is also re-enqueued each tick, because expiry and confirmations arrive without a transfer.',
      ],
      evidence: [lines(migrationCore, 203, 211), lines(evaluationQueueRepository, 1, 108)],
    },
    {
      id: 'webhook-outbox',
      label: 'webhook_deliveries (outbox)',
      kind: 'queue',
      purpose:
        'A table in PostgreSQL. The delivery row is written in the same transaction as the payment status change, and the callback worker drains it.',
      technologies: ['postgresql'],
      notes: [
        'One delivery per (payment, event type). One in-flight delivery per merchant environment, enforced by a partial unique index.',
        'The payload is serialized once and sent byte for byte; the row identifier is the webhook-id header.',
      ],
      evidence: [lines(migrationCallbacks, 34, 83)],
    },
    {
      id: 'chain-adapters',
      label: 'Chain adapters',
      kind: 'package',
      purpose:
        'EVM, TRON and Solana adapters behind the ChainGateway read port, and the EVM adapter behind the SettlementBroadcaster write port.',
      technologies: ['typescript', 'viem'],
      notes: [
        'The ports speak ledger vocabulary with opaque strings. A lint rule bans blockHash, logIndex, topics, topic0, abi, chainId, gasLimit, gasPrice, slot and nonce from domain and application.',
        'Every adapter asserts the ledger identity at startup, so an endpoint serving another chain is refused.',
      ],
      evidence: [
        lines(chainGatewayPort, 10, 20),
        lines(broadcasterPort, 3, 19),
        lines(compositionRoot, 252, 292),
        lines('eslint.config.js', 224, 226),
      ],
    },
    {
      id: 'chain',
      label: 'Chain (primary RPC)',
      kind: 'external',
      purpose:
        'The blockchain, reached through the first configured endpoint per network: eth_getLogs, headers and balances on Polygon, the HTTP API on TRON, JSON-RPC on Solana.',
      notes: [
        'A fallback transport moves to the next configured endpoint when one is rate limited.',
      ],
      evidence: [
        lines(evmChainGateway, 123, 126),
        lines('apps/api/src/infrastructure/chain/tron/tron-client.ts', 212, 213),
        lines('apps/api/src/infrastructure/chain/solana/solana-client.ts', 236, 243),
      ],
    },
    {
      id: 'chain-second-opinion',
      label: 'Second RPC provider',
      kind: 'external',
      purpose:
        'The endpoints after the first, asked only for the finalized height, only when a payment is otherwise ready to complete.',
      notes: [
        'With a single configured endpoint there is no quorum and a finality-gated payment never completes.',
      ],
      evidence: [lines(compositionRoot, 286, 291), lines(evmChainGateway, 172, 182)],
    },
    {
      id: 'merchant-endpoint',
      label: 'Merchant webhook endpoint',
      kind: 'external',
      purpose:
        'The merchant callback URL: https on port 443, a fully qualified hostname, every resolved record public.',
      notes: ['The merchant deduplicates on webhook-id; delivery is at least once.'],
      evidence: [lines(destinationPolicy, 3, 25), file('docs/webhooks.md')],
    },
    {
      id: 'demo-receiver',
      label: 'Demo receiver',
      kind: 'process',
      purpose:
        'A bundled merchant endpoint that verifies with the same Standard Webhooks module the API signs with, answers 200 to a duplicate webhook-id, and 401 to a bad signature.',
      technologies: ['nodejs', 'typescript'],
      notes: [
        'With no signing secret it answers 503 to every callback rather than accepting one it cannot verify.',
      ],
      evidence: [
        lines(demoReceiver, 6, 19),
        lines(demoReceiver, 93, 141),
        lines(compose, 270, 288),
      ],
    },
    {
      id: 'shared',
      label: '@cryptopay/shared',
      kind: 'package',
      purpose:
        'Both state machines, money in bigint base units, payment URIs for EIP-681, TRON and Solana Pay, API contracts, the OpenAPI builder and, under /server, webhook signing and verification.',
      technologies: ['typescript', 'zod'],
      notes: [
        'The root entry is browser safe; node builtins are allowed only under packages/shared/src/server.',
      ],
      evidence: [
        lines('packages/shared/src/index.ts', 1, 20),
        lines('packages/shared/src/money.ts', 3, 11),
        lines('packages/shared/src/payment-uri.ts', 11, 20),
      ],
    },
  ],
  edges: [
    {
      id: 'merchant-api',
      from: 'merchant',
      to: 'api',
      label: 'POST /api/v1/payments',
      protocol: 'https',
      authentication:
        'Bearer cp_<env>_<ULID>_<secret>; HMAC-SHA256 of the secret under a pepper, compared in constant time; scopes payments:read and payments:write; 600 requests per 60 s counted in the database after the key is valid.',
      payload:
        'Idempotency-Key header (required), network family, currency, decimal amount string, callbackUrl, externalReference. Answers 201 with a checkout URL, a payment URI and a QR code.',
      failureHandling:
        'Every authentication failure answers the same 401. A reused key with a different body answers 422 IDEMPOTENCY_KEY_CONFLICT; a key still in flight answers 429 with retry-after.',
      evidence: [
        lines(authentication, 61, 121),
        lines(gatewayRoutes, 163, 237),
        lines(apiKey, 86, 96),
      ],
    },
    {
      id: 'browser-web',
      from: 'operator',
      to: 'web',
      label: 'Dashboard over the BFF',
      protocol: 'https',
      authentication:
        'Cookie cryptopay_key, httpOnly, SameSite Lax, 12 hours, written on the server by the connect form.',
      payload:
        'Dashboard reads and writes under /api/bff/<path>; idempotency-key is passed through.',
      evidence: [lines(session, 49, 60), lines('apps/web/src/lib/api-client.ts', 14, 68)],
    },
    {
      id: 'web-api-bff',
      from: 'web',
      to: 'api',
      label: 'BFF proxy to /v1',
      protocol: 'http',
      authentication: 'Bearer from the session cookie, attached on the server.',
      payload:
        '15 allowed path patterns matched as regular expressions, GET, POST, PUT and DELETE only; content-type, x-request-id and retry-after are the only response headers relayed.',
      failureHandling:
        'An unreachable API answers 502; an unlisted path answers 404 before any credential is read.',
      evidence: [lines(bffRoute, 21, 47), lines(bffRoute, 56, 114)],
    },
    {
      id: 'browser-web-checkout',
      from: 'customer-browser',
      to: 'web',
      label: 'GET and POST /api/checkout/{token}',
      protocol: 'https',
      authentication: 'None. The 32-byte checkout token in the path is the credential.',
      payload: 'Polls the checkout state; posts a transaction hint after signing.',
      evidence: [lines(checkoutRoute, 54, 73), lines(compositionRoot, 72, 72)],
    },
    {
      id: 'web-api-checkout',
      from: 'web',
      to: 'api',
      label: 'Relay to /v1/checkout/{token}',
      protocol: 'http',
      authentication: 'None attached, by design a separate route from the BFF.',
      payload:
        'GET the checkout view, POST transaction-hint. cache-control: no-store on every answer.',
      failureHandling:
        'Answers 502 and says the payment is unaffected when the API does not answer.',
      evidence: [lines(checkoutRoute, 29, 52), lines(checkoutRoutes, 28, 53)],
    },
    {
      id: 'customer-chain',
      from: 'customer-browser',
      to: 'chain',
      label: 'Signs and broadcasts the transfer',
      protocol: 'json-rpc',
      authentication: 'The customer wallet, through wagmi writeContract for a token transfer.',
      payload: 'A transfer to the deposit address allocated to this payment alone.',
      evidence: [lines(walletPanel, 166, 166), lines(walletPanel, 370, 380)],
    },
    {
      id: 'api-postgres',
      from: 'api',
      to: 'postgres',
      label: 'SQL as cryptopay_api',
      protocol: 'sql',
      authentication: 'Role cryptopay_api; statement_timeout 30 s, lock_timeout 10 s.',
      payload:
        'Payment creation in one transaction: payments, payment_addresses and the idempotency completion. Reads scoped by merchant and environment in the query.',
      failureHandling:
        'A duplicate merchant reference is raised as a typed error and answered 422 rather than 500.',
      evidence: [
        lines(compose, 132, 132),
        lines(paymentRepository, 208, 285),
        lines(rolesSql, 105, 107),
      ],
    },
    {
      id: 'api-evaluation-queue',
      from: 'api',
      to: 'evaluation-queue',
      label: 'Enqueue on a browser hint',
      protocol: 'sql',
      payload: 'INSERT ... ON CONFLICT (payment_id) DO NOTHING. The hash is not stored.',
      evidence: [lines(checkoutRoutes, 81, 97), lines(evaluationQueueRepository, 39, 54)],
    },
    {
      id: 'chain-worker-postgres',
      from: 'chain-worker',
      to: 'postgres',
      label: 'SQL as cryptopay_chain_worker',
      protocol: 'sql',
      authentication:
        'Role cryptopay_chain_worker: payments, transfers, transitions, the evaluation queue, cursors, headers, leases and webhook_deliveries; SELECT only on merchants and payment_addresses; REVOKE ALL on wallet_seeds and api_keys.',
      payload:
        'Lease acquire with fencing_token + 1; cursor adoption WHERE fencing_token <= token; one transaction per scanned window; compare-and-swap on status_version.',
      failureHandling:
        'A write carrying a stale token affects zero rows and the tick ends as lease_lost. A crash replays the identical window and the unique constraint makes it a no-op.',
      evidence: [
        lines(compose, 182, 182),
        lines(leaderLeaseRepository, 57, 81),
        lines(blockCursorRepository, 106, 118),
        lines(chainScanStore, 72, 170),
      ],
    },
    {
      id: 'chain-worker-evaluation-queue',
      from: 'chain-worker',
      to: 'evaluation-queue',
      label: 'Claim payments to evaluate',
      protocol: 'sql',
      payload:
        'UPDATE ... WHERE payment_id IN (SELECT ... FOR UPDATE OF candidate SKIP LOCKED LIMIT 50), lease 30 s, one network per worker.',
      failureHandling:
        'A claim held by a dead worker expires; a slow worker keeps its claim and the CAS on the payment refuses a second writer.',
      evidence: [lines(evaluationQueueRepository, 56, 100), lines(evaluatePayments, 50, 73)],
    },
    {
      id: 'chain-worker-outbox',
      from: 'chain-worker',
      to: 'webhook-outbox',
      label: 'Outbox row in the same transaction',
      protocol: 'sql',
      payload:
        'INSERT INTO webhook_deliveries ... ON CONFLICT (payment_id, event_type) DO NOTHING, after the payments UPDATE and the transition row, before COMMIT.',
      failureHandling: 'If the delivery insert fails the payment update rolls back with it.',
      evidence: [lines(paymentRepository, 577, 665), lines(outboxSpec, 82, 162)],
    },
    {
      id: 'chain-worker-adapters',
      from: 'chain-worker',
      to: 'chain-adapters',
      label: 'ChainGateway port',
      protocol: 'in-process',
      payload:
        'readChainProgress, readPositionAtHeight, scanIncomingTransfers, confirmFinalizedHeight, reconcileTransfer, readAssetBalance.',
      evidence: [lines(chainGatewayPort, 89, 125), lines(compositionRoot, 258, 292)],
    },
    {
      id: 'adapters-chain',
      from: 'chain-adapters',
      to: 'chain',
      label: 'Read the chain',
      protocol: 'json-rpc',
      payload:
        'eth_getLogs over a bounded window, block headers with a depth of maximumReorgDepth + 1, latest and finalized blocks, balances. Settlement adds eth_sendRawTransaction and transaction counts.',
      failureHandling:
        'A range the provider refuses raises LedgerRangeTooWideError and the window halves. An endpoint that does not answer during fork resolution ends the tick undecided rather than halting.',
      evidence: [
        lines(evmChainGateway, 144, 170),
        lines(scanNetwork, 301, 348),
        lines(evmBroadcaster, 370, 400),
      ],
    },
    {
      id: 'adapters-second-opinion',
      from: 'chain-adapters',
      to: 'chain-second-opinion',
      label: 'Finality second opinion',
      protocol: 'json-rpc',
      payload: 'getBlock finalized on a separate client built from rpcUrls.slice(1).',
      failureHandling:
        'contradicted or unavailable both hold the payment in confirming; unavailable is also the answer when no second endpoint is configured.',
      evidence: [
        lines(evmChainGateway, 128, 134),
        lines(evmChainGateway, 172, 182),
        lines(finalityPolicy, 64, 82),
      ],
    },
    {
      id: 'settlement-worker-adapters',
      from: 'settlement-worker',
      to: 'chain-adapters',
      label: 'SettlementBroadcaster port',
      protocol: 'in-process',
      payload:
        'estimate, sign, submit and reconcileBroadcast as separate calls, so the sequence claim and the spend ceiling sit between estimating and signing.',
      evidence: [lines(broadcasterPort, 109, 160), lines(compositionRoot, 470, 523)],
    },
    {
      id: 'settlement-worker-postgres',
      from: 'settlement-worker',
      to: 'postgres',
      label: 'SQL as cryptopay_settlement_worker',
      protocol: 'sql',
      authentication:
        'Role cryptopay_settlement_worker: settlements, chain_transactions, chain_accounts, treasury_accounts and leader_leases; SELECT on payments, payment_addresses, payout_destinations, merchants and wallet_seeds; REVOKE on api_keys, webhook_secrets, webhook_deliveries, idempotency_keys and every write on payments.',
      payload:
        'Sequence claim under SELECT ... FOR UPDATE reconciled with the chain count; recordBroadcast before submit; every status move is a CAS on status_version checked against the settlement table.',
      failureHandling:
        'A second live transaction for one account and sequence violates the partial unique index. A lost CAS discards the signed payload and releases the number.',
      evidence: [
        lines(compose, 237, 237),
        lines(rolesSql, 76, 84),
        lines(settlementRepository, 315, 360),
        lines(settlementRepository, 486, 509),
      ],
    },
    {
      id: 'callback-worker-postgres',
      from: 'callback-worker',
      to: 'postgres',
      label: 'SQL as cryptopay_callback_worker',
      protocol: 'sql',
      authentication:
        'Role cryptopay_callback_worker: SELECT and UPDATE on webhook_deliveries, INSERT on attempts, SELECT on webhook_secrets. REVOKE ALL on payments, api_keys, wallet_seeds and payment_addresses.',
      payload: 'Active signing secrets per merchant and environment, newest first.',
      evidence: [lines(compose, 205, 205), lines(rolesSql, 60, 67), lines(rolesSql, 86, 88)],
    },
    {
      id: 'callback-worker-outbox',
      from: 'callback-worker',
      to: 'webhook-outbox',
      label: 'Claim due deliveries',
      protocol: 'sql',
      payload:
        'DISTINCT ON (merchant_id, environment) over pending and failed rows that are due, excluding merchants with an in-flight row; status set to in_flight with a 60 s claim. Attempt row and next state written in one transaction.',
      failureHandling:
        'No SKIP LOCKED and no fencing on this claim: two workers can attempt the same delivery, and the merchant deduplicates on webhook-id. Expired claims are released to failed before each pass.',
      evidence: [
        lines(webhookDeliveryRepository, 138, 184),
        lines(webhookDeliveryRepository, 186, 253),
        lines(webhookDeliveryRepository, 291, 299),
        lines(limitations, 224, 226),
      ],
    },
    {
      id: 'callback-worker-merchant',
      from: 'callback-worker',
      to: 'merchant-endpoint',
      label: 'Signed callback',
      protocol: 'webhook',
      authentication:
        'Standard Webhooks: webhook-id, webhook-timestamp regenerated per attempt, webhook-signature v1,<base64 HMAC-SHA256 of id.timestamp.body>, one signature per active secret.',
      payload:
        'The stored payload bytes, cryptopay-event-type and cryptopay-environment headers, user-agent CryptoPay-Webhooks/1.0, POST through an undici agent whose lookup returns the pinned address, 10 s timeout, no redirects.',
      failureHandling:
        '2xx delivered; 3xx permanent and abandoned; other statuses and timeouts retried on a 16-attempt table over roughly 44 h with jitter 0.8 to 1.2, a Retry-After on 429 honoured up to the 72 h age ceiling; a 4xx other than 429 gives up after 8 attempts.',
      evidence: [
        lines(deliverCallbacks, 141, 211),
        lines(callbackTransport, 62, 125),
        lines(webhookRetry, 24, 60),
        lines(webhookRetry, 88, 142),
      ],
    },
    {
      id: 'callback-worker-demo-receiver',
      from: 'callback-worker',
      to: 'demo-receiver',
      label: 'Callback to the bundled receiver',
      protocol: 'webhook',
      authentication: 'The same Standard Webhooks headers, verified with the same module.',
      payload:
        'Plain http to demo-receiver:8080, permitted only because that exact host:port is allowlisted, the deployment is not production and the payment is in the test environment.',
      failureHandling: 'A production deployment with any allowlist entry refuses to start.',
      evidence: [
        lines(compose, 208, 219),
        lines(deliverCallbacks, 264, 275),
        lines(configuration, 215, 225),
        lines(demoReceiver, 93, 141),
      ],
    },
    {
      id: 'api-shared',
      from: 'api',
      to: 'shared',
      label: 'imports @cryptopay/shared',
      protocol: 'in-process',
      payload:
        'State machines, contracts, money, payment URIs, and signWebhook from the server entry.',
      evidence: [lines('apps/api/package.json', 17, 17), lines(deliverCallbacks, 1, 1)],
    },
    {
      id: 'web-shared',
      from: 'web',
      to: 'shared',
      label: 'imports @cryptopay/shared',
      protocol: 'in-process',
      payload:
        'Terminal status predicate for polling, contracts, money formatting. Browser-safe root entry only.',
      evidence: [lines('apps/web/package.json', 13, 13), lines(paymentStatus, 38, 44)],
    },
    {
      id: 'receiver-shared',
      from: 'demo-receiver',
      to: 'shared',
      label: 'imports @cryptopay/shared/server',
      protocol: 'in-process',
      payload: 'verifyWebhook, the same function the tests assert on.',
      evidence: [lines('apps/demo-receiver/package.json', 11, 13), lines(demoReceiver, 4, 4)],
    },
    {
      id: 'migrate-postgres',
      from: 'migrate',
      to: 'postgres',
      label: 'Apply migrations',
      protocol: 'sql',
      authentication: 'The owner role cryptopay from the compose file.',
      payload:
        'pg_advisory_lock, then each unapplied file in its own transaction with its checksum recorded in schema_migrations.',
      failureHandling:
        'MigrationChecksumError names the edited file; a failing migration rolls back rather than half applying.',
      evidence: [
        lines(compose, 54, 56),
        lines(migrate, 104, 130),
        file('apps/api/test/migrations.spec.ts'),
      ],
    },
    {
      id: 'roles-postgres',
      from: 'roles',
      to: 'postgres',
      label: 'psql -f roles.sql',
      protocol: 'sql',
      authentication: 'The owner role, with ON_ERROR_STOP=1.',
      payload: 'Four LOGIN roles, grants per table, explicit revokes, per-role timeouts.',
      evidence: [lines(compose, 76, 91), lines(rolesSql, 97, 119)],
    },
    {
      id: 'bootstrap-postgres',
      from: 'bootstrap',
      to: 'postgres',
      label: 'Seed, merchant, key, cursors',
      protocol: 'sql',
      authentication: 'The owner role.',
      payload: 'provision-seed-cli test (tolerated if already present), then bootstrap-cli test.',
      evidence: [lines(compose, 97, 113), lines(bootstrapCli, 11, 28)],
    },
    {
      id: 'migrate-roles',
      from: 'migrate',
      to: 'roles',
      label: 'service_completed_successfully',
      protocol: 'orchestration',
      payload:
        'Roles wait for the migrations because every grant names a table the migrations create.',
      evidence: [lines(compose, 72, 89)],
    },
    {
      id: 'roles-bootstrap',
      from: 'roles',
      to: 'bootstrap',
      label: 'service_completed_successfully',
      protocol: 'orchestration',
      evidence: [lines(compose, 116, 118)],
    },
    {
      id: 'bootstrap-api',
      from: 'bootstrap',
      to: 'api',
      label: 'service_completed_successfully',
      protocol: 'orchestration',
      payload:
        'The API, the chain worker, the callback worker, the settlement worker and the demo receiver all wait on bootstrap; the web waits on the API health check.',
      evidence: [
        lines(compose, 155, 157),
        lines(compose, 188, 190),
        lines(compose, 212, 214),
        lines(compose, 248, 250),
        lines(compose, 284, 286),
      ],
    },
    {
      id: 'api-web',
      from: 'api',
      to: 'web',
      label: 'service_healthy',
      protocol: 'orchestration',
      payload: 'The web starts only after GET /healthz on the API answers ok.',
      evidence: [lines(compose, 161, 172), lines(compose, 262, 264)],
    },
  ],
  flows: [
    {
      id: 'create-payment',
      name: 'Create a payment',
      kind: 'request',
      summary:
        'A merchant creates a payment with a required Idempotency-Key. The API authenticates, counts the request, reserves the key, allocates a destination and writes payment, address and the stored response in one transaction.',
      levers: [
        {
          id: 'idempotency',
          label: 'Idempotency-Key',
          options: [
            { value: 'fresh', label: 'Never seen' },
            { value: 'replayed', label: 'Seen, completed' },
            { value: 'mismatch', label: 'Seen with another body' },
          ],
          defaultValue: 'fresh',
        },
      ],
      steps: [
        {
          at: 0,
          ledger: 'POST /api/v1/payments Idempotency-Key: order-10422',
          tone: 'flight',
          edge: 'merchant-api',
          evidence: [lines(gatewayRoutes, 163, 170)],
        },
        {
          at: 600,
          ledger: 'auth.ok cp_test_… scope payments:write',
          tone: 'ok',
          node: 'api',
          evidence: [lines(authentication, 61, 99), lines(authentication, 156, 167)],
        },
        {
          at: 1200,
          ledger: 'rate_window.counted 1 of 600 in 60 s',
          tone: 'ok',
          edge: 'api-postgres',
          evidence: [lines(authentication, 103, 121), lines(rateLimitRepository, 41, 84)],
        },
        {
          at: 1800,
          ledger: 'network.resolved polygon + test key -> polygon-amoy',
          tone: 'ok',
          node: 'api',
          evidence: [lines(gatewayRoutes, 182, 203), lines(networkConfiguration, 507, 523)],
        },
        {
          at: 2400,
          ledger: 'idempotency.reserve INSERT … ON CONFLICT DO UPDATE WHERE lock expired',
          tone: 'flight',
          edge: 'api-postgres',
          evidence: [lines(idempotencyRepository, 82, 117)],
        },
        {
          at: 3000,
          ledger: 'idempotency.reserved owner_token issued, lock 60 s',
          tone: 'ok',
          node: 'api',
          when: [{ lever: 'idempotency', value: 'fresh' }],
          evidence: [lines(idempotencyRepository, 57, 63)],
        },
        {
          at: 3000,
          ledger: 'idempotency.replay stored 201 body',
          tone: 'ok',
          node: 'api',
          when: [{ lever: 'idempotency', value: 'replayed' }],
          evidence: [lines(idempotencyRepository, 139, 141)],
        },
        {
          at: 3000,
          ledger: 'idempotency.fingerprint_mismatch method, path or body differ',
          tone: 'fault',
          node: 'api',
          when: [{ lever: 'idempotency', value: 'mismatch' }],
          evidence: [lines(idempotencyRepository, 66, 73), lines(idempotencyRepository, 136, 138)],
        },
        {
          at: 3600,
          ledger: '422 IDEMPOTENCY_KEY_CONFLICT',
          tone: 'fault',
          edge: 'merchant-api',
          when: [{ lever: 'idempotency', value: 'mismatch' }],
          evidence: [lines(gatewayRoutes, 215, 221)],
        },
        {
          at: 3600,
          ledger: '201 idempotency-replayed: true, no use case ran',
          tone: 'ok',
          edge: 'merchant-api',
          when: [{ lever: 'idempotency', value: 'replayed' }],
          evidence: [lines(gatewayRoutes, 230, 237)],
        },
        {
          at: 3600,
          ledger: 'cursor.checked polygon-amoy has a scanner',
          tone: 'ok',
          edge: 'api-postgres',
          when: [{ lever: 'idempotency', value: 'fresh' }],
          evidence: [lines(createPayment, 151, 159)],
        },
        {
          at: 4200,
          ledger: 'destination.allocated from the cached public key, index from a sequence',
          tone: 'ok',
          node: 'api',
          when: [{ lever: 'idempotency', value: 'fresh' }],
          evidence: [lines(createPayment, 161, 167), lines(allocatorProvider, 64, 83)],
        },
        {
          at: 4800,
          ledger: 'BEGIN payments + payment_addresses + idempotency completion',
          tone: 'flight',
          edge: 'api-postgres',
          when: [{ lever: 'idempotency', value: 'fresh' }],
          evidence: [lines(paymentRepository, 213, 285), lines(gatewayRoutes, 269, 287)],
        },
        {
          at: 5400,
          ledger: 'COMMIT payment.created pay_… pending',
          tone: 'ok',
          node: 'postgres',
          status: { machine: 'payment', value: 'pending' },
          when: [{ lever: 'idempotency', value: 'fresh' }],
          evidence: [lines(paymentRepository, 274, 275)],
        },
        {
          at: 6000,
          ledger: '201 checkoutUrl, payment URI, QR',
          tone: 'ok',
          edge: 'merchant-api',
          when: [{ lever: 'idempotency', value: 'fresh' }],
          evidence: [lines(gatewayRoutes, 313, 315)],
        },
      ],
      assertedBy: [
        lines(idempotencySpec, 96, 142),
        lines(idempotencySpec, 368, 411),
        file('apps/api/test/gateway-api.spec.ts'),
        file('apps/api/test/rate-limit.spec.ts'),
      ],
    },
    {
      id: 'detect-credit-notify',
      name: 'Detect, credit, notify',
      kind: 'asynchronous',
      summary:
        'The chain worker scans under a fenced lease, commits a coherent window, recomputes the credited total from stored rows, waits for the confirmation count and the finality tag seconded by another provider, then writes the transition and the outbox row together. The callback worker signs and delivers.',
      levers: [
        {
          id: 'second-opinion',
          label: 'Second provider says',
          options: [
            { value: 'confirmed', label: 'Finalized' },
            { value: 'contradicted', label: 'Not finalized' },
            { value: 'unavailable', label: 'No answer' },
          ],
          defaultValue: 'confirmed',
        },
      ],
      steps: [
        {
          at: 0,
          ledger: 'lease.acquired scanner:polygon-amoy fencing_token 7',
          tone: 'ok',
          edge: 'chain-worker-postgres',
          evidence: [lines(networkWorker, 191, 215), lines(leaderLeaseRepository, 57, 81)],
        },
        {
          at: 600,
          ledger: 'cursor.adopted WHERE fencing_token <= 7',
          tone: 'ok',
          edge: 'chain-worker-postgres',
          evidence: [lines(blockCursorRepository, 106, 118)],
        },
        {
          at: 1200,
          ledger: 'chain.progress tip and finalized height',
          tone: 'flight',
          edge: 'adapters-chain',
          evidence: [lines(evmChainGateway, 161, 170)],
        },
        {
          at: 1800,
          ledger: 'fork.resolved stored tip header still matches the chain',
          tone: 'ok',
          node: 'chain-worker',
          evidence: [lines(scanNetwork, 222, 266)],
        },
        {
          at: 2400,
          ledger: 'scan.window eth_getLogs, range 20, headers depth 33',
          tone: 'flight',
          edge: 'adapters-chain',
          evidence: [lines(scanNetwork, 308, 348)],
        },
        {
          at: 3000,
          ledger: 'window.coherent every transfer sits in the block its header names',
          tone: 'ok',
          node: 'chain-worker',
          evidence: [lines(scanNetwork, 378, 402)],
        },
        {
          at: 3600,
          ledger: 'COMMIT transfers + headers + queue + cursor, fenced on token 7',
          tone: 'ok',
          edge: 'chain-worker-postgres',
          evidence: [lines(chainScanStore, 72, 170)],
        },
        {
          at: 4200,
          ledger: 'evaluation.claimed FOR UPDATE SKIP LOCKED, lease 30 s',
          tone: 'ok',
          edge: 'chain-worker-evaluation-queue',
          evidence: [lines(evaluationQueueRepository, 64, 87)],
        },
        {
          at: 4800,
          ledger:
            'credited recomputed from rows: pending -> confirming TRANSFER_CREDITED; outbox row payment.confirming',
          tone: 'ok',
          node: 'chain-worker',
          status: { machine: 'payment', value: 'confirming' },
          evidence: [lines(evaluatePayments, 125, 131), lines(ledgerObservation, 54, 75)],
        },
        {
          at: 6200,
          ledger:
            'gate.local 5 of 5 confirmations and finalized >= settling block, after several 4 s ticks',
          tone: 'wait',
          node: 'chain-worker',
          evidence: [lines(finalityPolicy, 24, 62), lines(networkConfiguration, 173, 175)],
        },
        {
          at: 6600,
          ledger: 'finality.second_opinion getBlock finalized on the second provider',
          tone: 'flight',
          edge: 'adapters-second-opinion',
          evidence: [lines(evaluatePayments, 133, 139), lines(finalityPolicy, 92, 104)],
        },
        {
          at: 7200,
          ledger: 'second_opinion.confirmed',
          tone: 'ok',
          node: 'chain-worker',
          when: [{ lever: 'second-opinion', value: 'confirmed' }],
          evidence: [lines(evmChainGateway, 172, 182)],
        },
        {
          at: 7200,
          ledger:
            'second_opinion.contradicted: a second provider disagrees that the block is finalized',
          tone: 'fault',
          node: 'chain-worker',
          when: [{ lever: 'second-opinion', value: 'contradicted' }],
          evidence: [lines(finalityPolicy, 67, 73)],
        },
        {
          at: 7200,
          ledger: 'second_opinion.unavailable: no second provider could confirm finality',
          tone: 'unknown',
          node: 'chain-worker',
          when: [{ lever: 'second-opinion', value: 'unavailable' }],
          evidence: [lines(finalityPolicy, 74, 80)],
        },
        {
          at: 7800,
          ledger:
            'payment.held confirming; figures saved, no transition, no outbox row; asked again next tick',
          tone: 'wait',
          node: 'chain-worker',
          when: [{ lever: 'second-opinion', value: 'contradicted' }],
          evidence: [lines(ledgerObservation, 68, 70), lines(evaluatePayments, 167, 182)],
        },
        {
          at: 7800,
          ledger:
            'payment.held confirming; figures saved, no transition, no outbox row; asked again next tick',
          tone: 'wait',
          node: 'chain-worker',
          when: [{ lever: 'second-opinion', value: 'unavailable' }],
          evidence: [lines(ledgerObservation, 68, 70), lines(evaluatePayments, 167, 182)],
        },
        {
          at: 7800,
          ledger:
            'CAS status_version + transition row + outbox row in one transaction: confirming -> completed',
          tone: 'ok',
          edge: 'chain-worker-outbox',
          status: { machine: 'payment', value: 'completed' },
          when: [{ lever: 'second-opinion', value: 'confirmed' }],
          evidence: [lines(paymentRepository, 577, 665), lines(evaluatePayments, 153, 165)],
        },
        {
          at: 8400,
          ledger: 'outbox.claimed DISTINCT ON merchant, environment; in_flight for 60 s',
          tone: 'ok',
          edge: 'callback-worker-outbox',
          status: { machine: 'webhook-delivery', value: 'in_flight' },
          when: [{ lever: 'second-opinion', value: 'confirmed' }],
          evidence: [lines(webhookDeliveryRepository, 154, 184)],
        },
        {
          at: 9000,
          ledger:
            'POST payment.completed webhook-id whd_… webhook-signature v1,… stored bytes, pinned address',
          tone: 'flight',
          edge: 'callback-worker-merchant',
          when: [{ lever: 'second-opinion', value: 'confirmed' }],
          evidence: [lines(deliverCallbacks, 141, 164), lines(webhookSignature, 63, 74)],
        },
        {
          at: 9600,
          ledger: 'receiver.verified 200; delivery delivered, attempt 1 recorded',
          tone: 'ok',
          node: 'merchant-endpoint',
          status: { machine: 'webhook-delivery', value: 'delivered' },
          when: [{ lever: 'second-opinion', value: 'confirmed' }],
          evidence: [lines(demoReceiver, 106, 140), lines(deliverCallbacks, 189, 195)],
        },
      ],
      assertedBy: [
        lines(lifecycleSpec, 343, 451),
        lines(blockScannerSpec, 221, 365),
        lines(callbackDeliverySpec, 175, 241),
        lines(resilienceSpec, 338, 398),
      ],
    },
    {
      id: 'reorg',
      name: 'A reorg withdraws credited money',
      kind: 'failure',
      summary:
        'The stored header ring disagrees with the chain. Within the limit the scanner rewinds, marks transfers orphaned without deleting them and lets the evaluator recompute. Beyond the limit it halts the network and pages a human.',
      levers: [
        {
          id: 'reorg',
          label: 'Reorg depth',
          options: [
            { value: 'shallow', label: 'Within maximumReorgDepth' },
            { value: 'deep', label: 'Deeper than the limit' },
          ],
          defaultValue: 'shallow',
        },
      ],
      steps: [
        {
          at: 0,
          ledger: 'state: confirming with one credited transfer at height H',
          tone: 'neutral',
          node: 'postgres',
          status: { machine: 'payment', value: 'confirming' },
          evidence: [lines(reorgSpec, 288, 296)],
        },
        {
          at: 600,
          ledger: 'chain.progress tip moved; the block at H was replaced',
          tone: 'flight',
          edge: 'adapters-chain',
          evidence: [lines(scanNetwork, 122, 124)],
        },
        {
          at: 1200,
          ledger: 'fork.walk stored header at H no longer matches readPositionAtHeight(H)',
          tone: 'wait',
          node: 'chain-worker',
          evidence: [lines(scanNetwork, 235, 266)],
        },
        {
          at: 1800,
          ledger: 'fork.found common ancestor at H-1, within maximumReorgDepth 32',
          tone: 'ok',
          node: 'chain-worker',
          when: [{ lever: 'reorg', value: 'shallow' }],
          evidence: [lines(scanNetwork, 257, 264), lines(networkConfiguration, 175, 175)],
        },
        {
          at: 1800,
          ledger:
            'fork.unresolvable every stored header diverges and more than the limit were walked',
          tone: 'fault',
          node: 'chain-worker',
          when: [{ lever: 'reorg', value: 'deep' }],
          evidence: [lines(scanNetwork, 268, 275)],
        },
        {
          at: 2400,
          ledger:
            'rewind: cursor to H-1, transfers above marked orphaned and kept, headers deleted, payment enqueued, one transaction',
          tone: 'ok',
          edge: 'chain-worker-postgres',
          when: [{ lever: 'reorg', value: 'shallow' }],
          evidence: [lines(chainScanStore, 172, 234)],
        },
        {
          at: 2400,
          ledger: 'cursor.halted halted_at and reason written, fenced on the token',
          tone: 'fault',
          edge: 'chain-worker-postgres',
          when: [{ lever: 'reorg', value: 'deep' }],
          evidence: [lines(scanNetwork, 130, 133), lines(blockCursorRepository, 120, 137)],
        },
        {
          at: 3000,
          ledger: 'evaluation.claimed; credited recomputed from surviving rows = 0',
          tone: 'ok',
          edge: 'chain-worker-evaluation-queue',
          when: [{ lever: 'reorg', value: 'shallow' }],
          evidence: [lines(evaluatePayments, 125, 131), lines(transferLedger, 82, 97)],
        },
        {
          at: 3000,
          ledger: 'evaluation.skipped a halted network is halted for both halves',
          tone: 'fault',
          node: 'chain-worker',
          when: [{ lever: 'reorg', value: 'deep' }],
          evidence: [lines(networkWorker, 134, 137)],
        },
        {
          at: 3600,
          ledger: 'confirming -> pending TRANSFERS_ORPHANED; outbox row payment.pending',
          tone: 'ok',
          edge: 'chain-worker-outbox',
          status: { machine: 'payment', value: 'pending' },
          when: [{ lever: 'reorg', value: 'shallow' }],
          evidence: [lines(ledgerObservation, 54, 57), lines(transitionTable, 107, 112)],
        },
        {
          at: 3600,
          ledger: '/readyz network:polygon-amoy degraded: scanning is halted',
          tone: 'wait',
          node: 'api',
          when: [{ lever: 'reorg', value: 'deep' }],
          evidence: [lines(healthRoutes, 66, 73)],
        },
        {
          at: 4200,
          ledger: 'chain: transaction re-mined in a replacement block',
          tone: 'flight',
          edge: 'adapters-chain',
          when: [{ lever: 'reorg', value: 'shallow' }],
          evidence: [lines(reorgSpec, 330, 352)],
        },
        {
          at: 4200,
          ledger: 'tick: halted, every time, until an operator calls resume',
          tone: 'wait',
          node: 'chain-worker',
          when: [{ lever: 'reorg', value: 'deep' }],
          evidence: [lines(scanNetwork, 113, 115), lines(blockCursorRepository, 170, 177)],
        },
        {
          at: 4800,
          ledger:
            'transfer.updated same chain identity, new position, orphaned_at cleared; never a second row',
          tone: 'ok',
          edge: 'chain-worker-postgres',
          when: [{ lever: 'reorg', value: 'shallow' }],
          evidence: [lines(chainScanStore, 77, 88)],
        },
        {
          at: 5400,
          ledger: 'pending -> confirming TRANSFER_CREDITED',
          tone: 'ok',
          node: 'chain-worker',
          status: { machine: 'payment', value: 'confirming' },
          when: [{ lever: 'reorg', value: 'shallow' }],
          evidence: [lines(ledgerObservation, 65, 67)],
        },
      ],
      assertedBy: [lines(reorgSpec, 225, 395), lines(reorgSpec, 444, 550)],
    },
    {
      id: 'callback-delivery',
      name: 'Deliver a callback to an endpoint that fails',
      kind: 'failure',
      summary:
        'The callback worker claims a due delivery, signs with a fresh timestamp and sends the stored bytes to a pinned address. A 2xx settles it. A 5xx or a timeout schedules a retry on a fixed table, recorded in the same transaction as the attempt.',
      levers: [
        {
          id: 'endpoint',
          label: 'Merchant endpoint answers',
          options: [
            { value: 'accepts', label: '200' },
            { value: 'fails', label: '503' },
            { value: 'times-out', label: 'Nothing within 10 s' },
          ],
          defaultValue: 'accepts',
        },
      ],
      steps: [
        {
          at: 0,
          ledger: 'outbox row pending: payment.completed whd_…',
          tone: 'neutral',
          node: 'webhook-outbox',
          status: { machine: 'webhook-delivery', value: 'pending' },
          evidence: [lines(migrationCallbacks, 34, 63)],
        },
        {
          at: 600,
          ledger:
            'claimDue DISTINCT ON (merchant, environment), no in-flight sibling; in_flight for 60 s',
          tone: 'ok',
          edge: 'callback-worker-outbox',
          status: { machine: 'webhook-delivery', value: 'in_flight' },
          evidence: [lines(deliverCallbacks, 72, 79), lines(webhookDeliveryRepository, 154, 184)],
        },
        {
          at: 1200,
          ledger: 'destination.decided https:443, every resolved record public, address pinned',
          tone: 'ok',
          node: 'callback-worker',
          evidence: [lines(destinationPolicy, 259, 303)],
        },
        {
          at: 1800,
          ledger:
            'signed webhook-id, fresh webhook-timestamp, v1 HMAC-SHA256 over id.timestamp.body',
          tone: 'ok',
          node: 'callback-worker',
          evidence: [lines(deliverCallbacks, 141, 149), lines(webhookSignature, 63, 74)],
        },
        {
          at: 2400,
          ledger: 'POST stored bytes through undici, lookup pinned, no redirects, 10 s timeout',
          tone: 'flight',
          edge: 'callback-worker-merchant',
          evidence: [lines(callbackTransport, 62, 125)],
        },
        {
          at: 3000,
          ledger: '200',
          tone: 'ok',
          node: 'merchant-endpoint',
          when: [{ lever: 'endpoint', value: 'accepts' }],
        },
        {
          at: 3000,
          ledger: '503',
          tone: 'fault',
          node: 'merchant-endpoint',
          when: [{ lever: 'endpoint', value: 'fails' }],
        },
        {
          at: 3000,
          ledger: 'no answer within 10 s',
          tone: 'unknown',
          node: 'merchant-endpoint',
          when: [{ lever: 'endpoint', value: 'times-out' }],
          evidence: [lines(callbackTransport, 111, 121)],
        },
        {
          at: 3600,
          ledger: 'attempt 1 delivered; delivery delivered',
          tone: 'ok',
          edge: 'callback-worker-outbox',
          status: { machine: 'webhook-delivery', value: 'delivered' },
          when: [{ lever: 'endpoint', value: 'accepts' }],
          evidence: [lines(deliverCallbacks, 189, 195)],
        },
        {
          at: 3600,
          ledger:
            'classified retryable; schedule position 1 -> 5 s x jitter 0.8 to 1.2 (live table)',
          tone: 'wait',
          node: 'callback-worker',
          when: [{ lever: 'endpoint', value: 'fails' }],
          evidence: [
            lines(webhookRetry, 52, 60),
            lines(webhookRetry, 88, 142),
            lines(deliverCallbacks, 166, 175),
          ],
        },
        {
          at: 3600,
          ledger: 'classified timeout; same schedule, position 1 -> 5 s x jitter',
          tone: 'wait',
          node: 'callback-worker',
          when: [{ lever: 'endpoint', value: 'times-out' }],
          evidence: [lines(deliverCallbacks, 288, 293), lines(webhookRetry, 88, 142)],
        },
        {
          at: 4200,
          ledger: 'attempt 1 row + status failed + next_attempt_at, one transaction',
          tone: 'ok',
          edge: 'callback-worker-outbox',
          status: { machine: 'webhook-delivery', value: 'failed' },
          when: [{ lever: 'endpoint', value: 'fails' }],
          evidence: [lines(webhookDeliveryRepository, 186, 253)],
        },
        {
          at: 4200,
          ledger: 'attempt 1 row + status failed + next_attempt_at, one transaction',
          tone: 'ok',
          edge: 'callback-worker-outbox',
          status: { machine: 'webhook-delivery', value: 'failed' },
          when: [{ lever: 'endpoint', value: 'times-out' }],
          evidence: [lines(webhookDeliveryRepository, 186, 253)],
        },
        {
          at: 5400,
          ledger: 'retry after ~5 s: same webhook-id, new timestamp, same bytes',
          tone: 'flight',
          edge: 'callback-worker-merchant',
          when: [{ lever: 'endpoint', value: 'fails' }],
          evidence: [lines(deliverCallbacks, 100, 103), lines(deliverCallbacks, 144, 146)],
        },
        {
          at: 5400,
          ledger: 'retry after ~5 s: same webhook-id, new timestamp, same bytes',
          tone: 'flight',
          edge: 'callback-worker-merchant',
          when: [{ lever: 'endpoint', value: 'times-out' }],
          evidence: [lines(deliverCallbacks, 100, 103), lines(deliverCallbacks, 144, 146)],
        },
        {
          at: 6000,
          ledger: 'schedule: 16 attempts over roughly 44 h, then abandoned; 72 h age ceiling',
          tone: 'wait',
          node: 'callback-worker',
          when: [{ lever: 'endpoint', value: 'fails' }],
          evidence: [lines(webhookRetry, 24, 36)],
        },
        {
          at: 6000,
          ledger: 'schedule: 16 attempts over roughly 44 h, then abandoned; 72 h age ceiling',
          tone: 'wait',
          node: 'callback-worker',
          when: [{ lever: 'endpoint', value: 'times-out' }],
          evidence: [lines(webhookRetry, 24, 36)],
        },
      ],
      assertedBy: [
        lines(callbackDeliverySpec, 175, 305),
        file('apps/api/src/domain/webhook-retry.spec.ts'),
      ],
    },
    {
      id: 'hostile-callback-destination',
      name: 'A callback URL that points somewhere it must not',
      kind: 'security',
      summary:
        'The same destination policy runs at creation and before every attempt. Shape is checked immediately; DNS is checked at delivery, every record must be public, and the connection is pinned to the address that was checked.',
      levers: [
        {
          id: 'destination',
          label: 'callbackUrl',
          options: [
            { value: 'public', label: 'https://hooks.example.com/…' },
            { value: 'private', label: 'Resolves to 10.0.0.5' },
            { value: 'plain-http', label: 'http://hooks.example.com/…' },
          ],
          defaultValue: 'public',
        },
      ],
      steps: [
        {
          at: 0,
          ledger: 'POST /api/v1/payments callbackUrl set',
          tone: 'flight',
          edge: 'merchant-api',
          evidence: [lines(createPayment, 133, 149)],
        },
        {
          at: 600,
          ledger: 'shape: WHATWG parse, no userinfo, hostname is not an address',
          tone: 'ok',
          node: 'api',
          evidence: [lines(destinationPolicy, 209, 234)],
        },
        {
          at: 1200,
          ledger: 'refused: a callback destination must use https',
          tone: 'fault',
          node: 'api',
          when: [{ lever: 'destination', value: 'plain-http' }],
          evidence: [lines(destinationPolicy, 240, 243)],
        },
        {
          at: 1800,
          ledger: '422 INVALID_CALLBACK_URL; nothing stored',
          tone: 'fault',
          edge: 'merchant-api',
          when: [{ lever: 'destination', value: 'plain-http' }],
          evidence: [lines(gatewayRoutes, 45, 58), lines(gatewayRoutes, 289, 298)],
        },
        {
          at: 1200,
          ledger: 'shape ok: https, port 443, fully qualified hostname',
          tone: 'ok',
          node: 'api',
          when: [{ lever: 'destination', value: 'public' }],
          evidence: [lines(destinationPolicy, 244, 254)],
        },
        {
          at: 1200,
          ledger: 'shape ok: https, port 443, fully qualified hostname',
          tone: 'ok',
          node: 'api',
          when: [{ lever: 'destination', value: 'private' }],
          evidence: [lines(destinationPolicy, 244, 254)],
        },
        {
          at: 1800,
          ledger: 'payment stored; DNS deliberately left to delivery time',
          tone: 'ok',
          edge: 'api-postgres',
          when: [{ lever: 'destination', value: 'public' }],
          evidence: [lines(createPayment, 133, 136)],
        },
        {
          at: 1800,
          ledger: 'payment stored; DNS deliberately left to delivery time',
          tone: 'ok',
          edge: 'api-postgres',
          when: [{ lever: 'destination', value: 'private' }],
          evidence: [lines(createPayment, 133, 136)],
        },
        {
          at: 3000,
          ledger: 'later: payment.completed; delivery claimed in_flight',
          tone: 'ok',
          edge: 'callback-worker-outbox',
          status: { machine: 'webhook-delivery', value: 'in_flight' },
          when: [{ lever: 'destination', value: 'public' }],
          evidence: [lines(deliverCallbacks, 97, 104)],
        },
        {
          at: 3000,
          ledger: 'later: payment.completed; delivery claimed in_flight',
          tone: 'ok',
          edge: 'callback-worker-outbox',
          status: { machine: 'webhook-delivery', value: 'in_flight' },
          when: [{ lever: 'destination', value: 'private' }],
          evidence: [lines(deliverCallbacks, 97, 104)],
        },
        {
          at: 3600,
          ledger: 'dns.resolve every record: lookup all, verbatim ordering',
          tone: 'flight',
          node: 'callback-worker',
          when: [{ lever: 'destination', value: 'public' }],
          evidence: [lines(addressResolver, 5, 19)],
        },
        {
          at: 3600,
          ledger: 'dns.resolve every record: lookup all, verbatim ordering',
          tone: 'flight',
          node: 'callback-worker',
          when: [{ lever: 'destination', value: 'private' }],
          evidence: [lines(addressResolver, 5, 19)],
        },
        {
          at: 4200,
          ledger: 'every record public; pinned to the first answer',
          tone: 'ok',
          node: 'callback-worker',
          when: [{ lever: 'destination', value: 'public' }],
          evidence: [lines(destinationPolicy, 279, 302)],
        },
        {
          at: 4200,
          ledger:
            'one record in 10.0.0.0/8 (18 IPv4 and 13 IPv6 denied blocks): refused, nothing is signed',
          tone: 'fault',
          node: 'callback-worker',
          when: [{ lever: 'destination', value: 'private' }],
          evidence: [lines(destinationPolicy, 64, 103), lines(destinationPolicy, 282, 285)],
        },
        {
          at: 4800,
          ledger: 'connect via pinned lookup; a DNS rebind at connect time changes nothing',
          tone: 'ok',
          edge: 'callback-worker-merchant',
          when: [{ lever: 'destination', value: 'public' }],
          evidence: [lines(callbackTransport, 66, 88)],
        },
        {
          at: 4800,
          ledger: 'attempt recorded with outcome blocked; delivery abandoned',
          tone: 'fault',
          edge: 'callback-worker-outbox',
          status: { machine: 'webhook-delivery', value: 'abandoned' },
          when: [{ lever: 'destination', value: 'private' }],
          evidence: [lines(deliverCallbacks, 106, 121)],
        },
        {
          at: 5400,
          ledger: 'delivered',
          tone: 'ok',
          node: 'merchant-endpoint',
          status: { machine: 'webhook-delivery', value: 'delivered' },
          when: [{ lever: 'destination', value: 'public' }],
        },
        {
          at: 5400,
          ledger:
            'allowlist: one named host:port may skip scheme, port, hostname shape and the private check; never userinfo or a bare address; only outside production, only for test payments',
          tone: 'neutral',
          node: 'callback-worker',
          when: [{ lever: 'destination', value: 'private' }],
          evidence: [
            lines(destinationPolicy, 237, 254),
            lines(deliverCallbacks, 264, 275),
            lines(configuration, 215, 225),
          ],
        },
      ],
      assertedBy: [lines(destinationPolicySpec, 54, 222), lines(callbackDeliverySpec, 307, 345)],
    },
    {
      id: 'settle',
      name: 'Settle a completed payment',
      kind: 'recovery',
      summary:
        'The settlement worker reconciles every in-flight transaction before it signs anything, plans from the on-chain balance, claims a sequence number under a row lock, checks the spend ceiling, records the signed reference and only then submits. An unanswered submit is resolved by asking the chain, never by resending.',
      levers: [
        {
          id: 'submit',
          label: 'eth_sendRawTransaction answers',
          options: [
            { value: 'accepted', label: 'Accepted' },
            { value: 'no-answer', label: 'No answer' },
            { value: 'rejected', label: 'Rejected' },
          ],
          defaultValue: 'accepted',
        },
      ],
      steps: [
        {
          at: 0,
          ledger: 'lease.acquired settlement:polygon-amoy',
          tone: 'ok',
          edge: 'settlement-worker-postgres',
          evidence: [lines(settlementWorker, 143, 171)],
        },
        {
          at: 600,
          ledger:
            'retryFailed: failed -> pending once the 300 s backoff elapsed, at most 5 attempts',
          tone: 'neutral',
          node: 'settlement-worker',
          evidence: [lines(settlePayments, 704, 733), lines(configuration, 155, 156)],
        },
        {
          at: 1200,
          ledger:
            'reconcileOutstanding: chain asked about every in-flight transaction before anything new is signed',
          tone: 'flight',
          edge: 'adapters-chain',
          evidence: [lines(settlePayments, 110, 195), lines(evmBroadcaster, 412, 447)],
        },
        {
          at: 1800,
          ledger:
            'plan: terminal payment with a payout destination; balance read from the chain, not from the credited figure',
          tone: 'ok',
          edge: 'adapters-chain',
          evidence: [lines(settlePayments, 197, 245), lines(settlementRepository, 560, 578)],
        },
        {
          at: 2400,
          ledger: 'settlement.planned stl_… one per payment (UNIQUE payment_id)',
          tone: 'ok',
          edge: 'settlement-worker-postgres',
          status: { machine: 'settlement', value: 'pending' },
          evidence: [lines(migrationSettlement, 65, 70)],
        },
        {
          at: 3000,
          ledger: 'estimate sweep fee; the deposit holds no gas, funding needed',
          tone: 'ok',
          node: 'settlement-worker',
          evidence: [lines(settlePayments, 294, 341)],
        },
        {
          at: 3600,
          ledger: 'spend ceiling: committed history at worst case + this transfer <= ceiling',
          tone: 'ok',
          node: 'settlement-worker',
          evidence: [lines(settlePayments, 368, 400), lines(spendCeiling, 51, 67)],
        },
        {
          at: 4200,
          ledger: 'sequence claimed: SELECT … FOR UPDATE, max(stored, chain count)',
          tone: 'ok',
          edge: 'settlement-worker-postgres',
          evidence: [lines(settlementRepository, 315, 360)],
        },
        {
          at: 4800,
          ledger: 'signed: transaction reference known before anything is sent',
          tone: 'ok',
          node: 'settlement-worker',
          evidence: [lines(settlePayments, 492, 503), lines(broadcasterPort, 124, 146)],
        },
        {
          at: 5400,
          ledger: 'recordBroadcast: chain_transactions row + CAS pending -> funding, before submit',
          tone: 'ok',
          edge: 'settlement-worker-postgres',
          status: { machine: 'settlement', value: 'funding' },
          evidence: [lines(settlePayments, 460, 539)],
        },
        {
          at: 6000,
          ledger: 'submit eth_sendRawTransaction',
          tone: 'flight',
          edge: 'adapters-chain',
          evidence: [lines(evmBroadcaster, 370, 400)],
        },
        {
          at: 6600,
          ledger: 'accepted',
          tone: 'ok',
          node: 'chain',
          when: [{ lever: 'submit', value: 'accepted' }],
        },
        {
          at: 6600,
          ledger: 'indeterminate: no answer; the row and the sequence number are kept',
          tone: 'unknown',
          node: 'chain',
          when: [{ lever: 'submit', value: 'no-answer' }],
          evidence: [lines(settlePayments, 542, 545), lines(broadcasterPort, 67, 72)],
        },
        {
          at: 6600,
          ledger:
            'rejected: nothing reached the mempool; row dropped, number handed back, settlement failed',
          tone: 'fault',
          node: 'settlement-worker',
          status: { machine: 'settlement', value: 'failed' },
          when: [{ lever: 'submit', value: 'rejected' }],
          evidence: [lines(settlePayments, 546, 558)],
        },
        {
          at: 7600,
          ledger:
            'next tick (15 s poll): reconcileBroadcast asks the chain: pending, mined or superseded; never resent',
          tone: 'wait',
          edge: 'adapters-chain',
          when: [{ lever: 'submit', value: 'no-answer' }],
          evidence: [lines(settlePayments, 116, 158), lines(broadcasterPort, 74, 92)],
        },
        {
          at: 7600,
          ledger:
            'funding confirmed on a later tick -> sweep estimated, signed, recorded, submitted',
          tone: 'ok',
          edge: 'adapters-chain',
          status: { machine: 'settlement', value: 'sweeping' },
          when: [{ lever: 'submit', value: 'accepted' }],
          evidence: [lines(settlePayments, 579, 604)],
        },
        {
          at: 8400,
          ledger: 'sweeping -> confirming: sweep mined',
          tone: 'ok',
          edge: 'settlement-worker-postgres',
          status: { machine: 'settlement', value: 'confirming' },
          when: [{ lever: 'submit', value: 'accepted' }],
          evidence: [lines(settlePayments, 606, 624)],
        },
        {
          at: 8400,
          ledger:
            'retryFailed: failed -> pending after 300 s, up to 5 attempts; the money stays reachable',
          tone: 'wait',
          node: 'settlement-worker',
          status: { machine: 'settlement', value: 'pending' },
          when: [{ lever: 'submit', value: 'rejected' }],
          evidence: [lines(settlePayments, 704, 733), lines(settlementStatus, 134, 141)],
        },
        {
          at: 9400,
          ledger:
            'confirming -> settled: 5 confirmations and the finalized tag; no second opinion on this path',
          tone: 'ok',
          edge: 'settlement-worker-postgres',
          status: { machine: 'settlement', value: 'settled' },
          when: [{ lever: 'submit', value: 'accepted' }],
          evidence: [lines(settlePayments, 626, 678)],
        },
      ],
      assertedBy: [
        lines(settlementSpec, 273, 336),
        lines(settlementSpec, 365, 445),
        lines(settlementSpec, 535, 550),
      ],
    },
    {
      id: 'fenced-handover',
      name: 'A wedged scanner loses the lease',
      kind: 'recovery',
      summary:
        'Worker A holds the scanner lease and stops making progress. The lease expires, worker B takes it with a higher fencing token and stamps it on the cursor. When A wakes, every write it attempts carries the old token and affects zero rows.',
      levers: [
        {
          id: 'worker-a',
          label: 'Worker A',
          options: [
            { value: 'hangs', label: 'Hangs on a stuck RPC call' },
            { value: 'stops-cleanly', label: 'Receives SIGTERM' },
          ],
          defaultValue: 'hangs',
        },
      ],
      steps: [
        {
          at: 0,
          ledger: 'A holds scanner:polygon-amoy, fencing_token 7, lease 30 s',
          tone: 'neutral',
          node: 'chain-worker',
          evidence: [lines(networkWorker, 46, 51), lines(networkWorker, 191, 215)],
        },
        {
          at: 600,
          ledger: 'A wedges mid-tick; no renewal',
          tone: 'fault',
          edge: 'adapters-chain',
          when: [{ lever: 'worker-a', value: 'hangs' }],
          evidence: [lines(networkWorker, 27, 35)],
        },
        {
          at: 600,
          ledger: 'A stop(): DELETE the lease it holds, at once',
          tone: 'ok',
          edge: 'chain-worker-postgres',
          when: [{ lever: 'worker-a', value: 'stops-cleanly' }],
          evidence: [lines(networkWorker, 163, 171), lines(leaderLeaseRepository, 107, 115)],
        },
        {
          at: 1500,
          ledger: 'lease.expired 30 s of real time with no renewal',
          tone: 'wait',
          node: 'postgres',
          when: [{ lever: 'worker-a', value: 'hangs' }],
          evidence: [lines(leaderLeaseRepository, 63, 71)],
        },
        {
          at: 1200,
          ledger: 'B acquires on its next tick; no wait for expiry',
          tone: 'ok',
          edge: 'chain-worker-postgres',
          when: [{ lever: 'worker-a', value: 'stops-cleanly' }],
          evidence: [lines(leaderLeaseSpec, 111, 119)],
        },
        {
          at: 2100,
          ledger:
            'B acquires: INSERT … ON CONFLICT DO UPDATE WHERE expires_at <= now(), fencing_token 8',
          tone: 'ok',
          edge: 'chain-worker-postgres',
          when: [{ lever: 'worker-a', value: 'hangs' }],
          evidence: [lines(leaderLeaseRepository, 62, 74)],
        },
        {
          at: 2700,
          ledger: 'B adopts the cursor: UPDATE … WHERE fencing_token <= 8',
          tone: 'ok',
          edge: 'chain-worker-postgres',
          evidence: [lines(blockCursorRepository, 106, 118)],
        },
        {
          at: 3300,
          ledger: 'B scans and commits; the cursor now carries 8',
          tone: 'ok',
          edge: 'chain-worker-postgres',
          evidence: [lines(chainScanStore, 130, 163)],
        },
        {
          at: 3900,
          ledger: 'A wakes and tries to commit its window with token 7',
          tone: 'flight',
          edge: 'chain-worker-postgres',
          when: [{ lever: 'worker-a', value: 'hangs' }],
          evidence: [lines(networkWorker, 32, 35)],
        },
        {
          at: 4500,
          ledger:
            'UPDATE block_cursors … WHERE fencing_token = 7 -> 0 rows -> ROLLBACK; lease_lost',
          tone: 'fault',
          node: 'postgres',
          when: [{ lever: 'worker-a', value: 'hangs' }],
          evidence: [lines(chainScanStore, 157, 160), lines(scanNetwork, 198, 200)],
        },
        {
          at: 5100,
          ledger: 'A drops its lease; renew answers null while B is live, acquire answers null too',
          tone: 'ok',
          node: 'chain-worker',
          when: [{ lever: 'worker-a', value: 'hangs' }],
          evidence: [lines(networkWorker, 129, 132), lines(leaderLeaseRepository, 83, 105)],
        },
        {
          at: 5700,
          ledger:
            'one leader; a window scanned twice is a no-op under UNIQUE (network, transaction, event index)',
          tone: 'ok',
          node: 'chain-worker',
          evidence: [lines(migrationCore, 145, 170)],
        },
      ],
      assertedBy: [
        lines(leaderLeaseSpec, 89, 210),
        lines(blockScannerSpec, 367, 389),
        lines(resilienceSpec, 371, 398),
      ],
    },
    {
      id: 'browser-hint',
      name: 'The browser reports a transaction hash',
      kind: 'security',
      summary:
        'After signing, the checkout page posts the transaction hash. The API stores nothing from it, enqueues the payment for evaluation and answers 202. A fabricated hash changes nothing, because every figure is re-derived from the chain by the scanner.',
      levers: [
        {
          id: 'hash',
          label: 'Reported hash',
          options: [
            { value: 'real', label: 'The real transaction' },
            { value: 'fabricated', label: '0xff…ff' },
          ],
          defaultValue: 'real',
        },
      ],
      steps: [
        {
          at: 0,
          ledger: 'POST /api/checkout/{token}',
          tone: 'flight',
          edge: 'browser-web-checkout',
          evidence: [lines(checkoutRoute, 62, 73)],
        },
        {
          at: 600,
          ledger: 'token shape checked; relayed with no credential',
          tone: 'ok',
          node: 'web',
          evidence: [lines(checkoutRoute, 15, 16), lines(checkoutRoute, 29, 52)],
        },
        {
          at: 1200,
          ledger: 'POST /v1/checkout/{token}/transaction-hint',
          tone: 'flight',
          edge: 'web-api-checkout',
          evidence: [lines(checkoutRoutes, 66, 68)],
        },
        {
          at: 1800,
          ledger: 'body parsed: a transaction reference is required',
          tone: 'ok',
          node: 'api',
          evidence: [lines(checkoutRoutes, 69, 79)],
        },
        {
          at: 2400,
          ledger: 'payment found by checkout token; unknown token answers 404',
          tone: 'ok',
          edge: 'api-postgres',
          evidence: [lines(checkoutRoutes, 81, 86), lines(paymentRepository, 314, 324)],
        },
        {
          at: 3000,
          ledger: 'enqueue ON CONFLICT DO NOTHING; the hash itself is not stored',
          tone: 'ok',
          edge: 'api-evaluation-queue',
          evidence: [lines(checkoutRoutes, 88, 92), lines(evaluationQueueRepository, 39, 54)],
        },
        {
          at: 3600,
          ledger: '202 accepted: nothing has been decided',
          tone: 'ok',
          edge: 'web-api-checkout',
          evidence: [lines(checkoutRoutes, 94, 96)],
        },
        {
          at: 4200,
          ledger:
            'scanner.tick reads the chain itself; the hint only moved the payment up the queue',
          tone: 'neutral',
          node: 'chain-worker',
          when: [{ lever: 'hash', value: 'real' }],
          evidence: [lines(checkoutRoutes, 55, 65)],
        },
        {
          at: 4200,
          ledger: 'credited amount, status and version unchanged',
          tone: 'ok',
          node: 'postgres',
          when: [{ lever: 'hash', value: 'fabricated' }],
          evidence: [lines(checkoutSpec, 201, 252)],
        },
      ],
      assertedBy: [lines(checkoutSpec, 201, 252)],
    },
  ],
  stateMachines: [
    {
      id: 'payment',
      name: 'Payment lifecycle',
      statuses: [
        { id: 'pending', terminal: false, tone: 'wait', funded: false },
        { id: 'partially_funded', terminal: false, tone: 'wait', funded: true },
        { id: 'confirming', terminal: false, tone: 'wait', funded: true },
        { id: 'completed', terminal: true, tone: 'ok', funded: true },
        { id: 'overpaid', terminal: true, tone: 'ok', funded: true },
        {
          id: 'underpaid',
          terminal: true,
          tone: 'fault',
          funded: true,
          note: 'Money is real and still at the destination; the band was never reached before expiry.',
        },
        { id: 'expired', terminal: true, tone: 'neutral', funded: false },
        { id: 'canceled', terminal: true, tone: 'neutral', funded: false },
      ],
      transitions: [
        {
          from: 'pending',
          to: 'partially_funded',
          trigger: 'TRANSFER_CREDITED',
          guard: 'credited amount is above zero but below the acceptance band',
        },
        {
          from: 'pending',
          to: 'confirming',
          trigger: 'TRANSFER_CREDITED',
          guard: 'credited amount reaches the acceptance band',
        },
        {
          from: 'pending',
          to: 'expired',
          trigger: 'EXPIRY_ELAPSED',
          guard: 'expiry has elapsed with nothing credited',
        },
        {
          from: 'pending',
          to: 'canceled',
          trigger: 'MERCHANT_CANCELED',
          guard: 'the merchant cancels while nothing is credited',
        },
        {
          from: 'partially_funded',
          to: 'confirming',
          trigger: 'TRANSFER_CREDITED',
          guard: 'a further transfer brings the credited amount into the acceptance band',
        },
        {
          from: 'partially_funded',
          to: 'pending',
          trigger: 'TRANSFERS_ORPHANED',
          guard: 'a reorg withdraws every credited transfer',
        },
        {
          from: 'partially_funded',
          to: 'underpaid',
          trigger: 'EXPIRY_ELAPSED',
          guard: 'expiry has elapsed with value credited but below the acceptance band',
        },
        {
          from: 'confirming',
          to: 'completed',
          trigger: 'CHAIN_PROGRESS_OBSERVED',
          guard: 'the finality gate opens and the credited amount is within the acceptance band',
        },
        {
          from: 'confirming',
          to: 'overpaid',
          trigger: 'CHAIN_PROGRESS_OBSERVED',
          guard: 'the finality gate opens and the credited amount exceeds the acceptance band',
        },
        {
          from: 'confirming',
          to: 'partially_funded',
          trigger: 'TRANSFERS_ORPHANED',
          guard: 'a reorg drops the credited amount below the acceptance band but above zero',
        },
        {
          from: 'confirming',
          to: 'pending',
          trigger: 'TRANSFERS_ORPHANED',
          guard: 'a reorg withdraws every credited transfer',
        },
      ],
      notes: [
        'Eight statuses, eleven edges, five triggers. docs/state-machine.md is generated from this table and CI fails if it differs.',
        'confirming cannot expire: expiring a funded payment because a timer fired is stealing.',
        'There is no failed status. A reverted ERC-20 transfer emits no event, so there is nothing to fail; settlement failure lives on its own resource.',
        'Status is assigned in one place. Every write is a compare-and-swap on status_version, backed by UNIQUE (payment_id, to_version) on the audit trail.',
      ],
      evidence: [
        lines(transitionTable, 23, 113),
        lines(paymentStatus, 9, 36),
        lines('docs/state-machine.md', 1, 84),
        lines(migrationCore, 177, 198),
      ],
    },
    {
      id: 'settlement',
      name: 'Settlement lifecycle',
      statuses: [
        { id: 'pending', terminal: false, tone: 'wait' },
        {
          id: 'funding',
          terminal: false,
          tone: 'flight',
          note: 'The treasury is sending exactly the estimated fee to the deposit address.',
        },
        { id: 'sweeping', terminal: false, tone: 'flight' },
        { id: 'confirming', terminal: false, tone: 'wait' },
        { id: 'settled', terminal: true, tone: 'ok', funded: true },
        {
          id: 'failed',
          terminal: false,
          tone: 'fault',
          note: 'Deliberately not terminal. Money in an address this system controls must stay reachable; attempts are counted so retrying cannot loop.',
        },
      ],
      transitions: [
        {
          from: 'pending',
          to: 'funding',
          trigger: 'SETTLEMENT_PLANNED',
          guard:
            'the deposit address cannot cover the sweep fee and a funding transfer was broadcast',
        },
        {
          from: 'pending',
          to: 'sweeping',
          trigger: 'SETTLEMENT_PLANNED',
          guard:
            'the deposit address already holds enough native currency, so no funding is needed',
        },
        {
          from: 'funding',
          to: 'sweeping',
          trigger: 'GAS_FUNDED',
          guard: 'the funding transfer is confirmed and the sweep was broadcast',
        },
        {
          from: 'sweeping',
          to: 'confirming',
          trigger: 'SWEEP_MINED',
          guard: 'the sweep is in a block and is accumulating confirmations',
        },
        {
          from: 'confirming',
          to: 'settled',
          trigger: 'CONFIRMATIONS_REACHED',
          guard: 'the sweep has the required confirmations and the block is covered by finality',
        },
        {
          from: 'pending',
          to: 'failed',
          trigger: 'ATTEMPT_FAILED',
          guard: 'planning could not proceed, for instance no payout destination is configured',
        },
        {
          from: 'funding',
          to: 'failed',
          trigger: 'ATTEMPT_FAILED',
          guard: 'the funding transfer reverted, or the treasury cannot cover it',
        },
        {
          from: 'sweeping',
          to: 'failed',
          trigger: 'ATTEMPT_FAILED',
          guard: 'the sweep reverted on chain',
        },
        {
          from: 'confirming',
          to: 'failed',
          trigger: 'ATTEMPT_FAILED',
          guard: 'a reorg removed the sweep after it had been mined',
        },
        {
          from: 'failed',
          to: 'pending',
          trigger: 'RETRY_REQUESTED',
          guard:
            'an operator or the retry schedule asks for another attempt, and the funds are still there',
        },
      ],
      notes: [
        'Six statuses, ten edges, seven declared triggers. SWEEP_BROADCAST is declared and drives no edge.',
        'The repository refuses a move the table does not declare and additionally requires the status version to match.',
        'failed -> pending is driven by SettlementWorker.runOnce through retryFailed, after a 300 s backoff and at most 5 attempts by default.',
      ],
      evidence: [
        lines(settlementStatus, 22, 142),
        lines(settlementRepository, 486, 509),
        lines(settlePayments, 704, 733),
        lines(configuration, 155, 156),
      ],
    },
    {
      id: 'webhook-delivery',
      name: 'Webhook delivery',
      statuses: [
        { id: 'pending', terminal: false, tone: 'wait' },
        {
          id: 'in_flight',
          terminal: false,
          tone: 'flight',
          note: 'At most one per merchant environment, enforced by a partial unique index.',
        },
        {
          id: 'delivered',
          terminal: false,
          tone: 'ok',
          note: 'Left only by an operator redelivery, which keeps the same webhook-id.',
        },
        {
          id: 'failed',
          terminal: false,
          tone: 'wait',
          note: 'Means a retry is scheduled at next_attempt_at; the claim query treats it like pending.',
        },
        {
          id: 'abandoned',
          terminal: false,
          tone: 'fault',
          note: 'The schedule was spent, the age ceiling passed, the answer was permanent, or the destination was refused.',
        },
      ],
      transitions: [
        {
          from: 'pending',
          to: 'in_flight',
          trigger: 'claimDue',
          guard:
            'next_attempt_at <= now() and no in-flight row for the same merchant and environment',
        },
        {
          from: 'failed',
          to: 'in_flight',
          trigger: 'claimDue',
          guard:
            'next_attempt_at <= now() and no in-flight row for the same merchant and environment',
        },
        {
          from: 'in_flight',
          to: 'delivered',
          trigger: 'completeAttempt',
          guard: 'the endpoint answered 2xx',
        },
        {
          from: 'in_flight',
          to: 'failed',
          trigger: 'completeAttempt',
          guard:
            'a retryable answer or a timeout, with a retry inside the schedule and the age ceiling',
        },
        {
          from: 'in_flight',
          to: 'abandoned',
          trigger: 'completeAttempt',
          guard:
            'a 3xx, a refused destination, a spent schedule, the age ceiling, or a 4xx other than 429 past the client error ceiling',
        },
        {
          from: 'in_flight',
          to: 'failed',
          trigger: 'releaseExpiredClaims',
          guard: 'claim_expires_at < now(), so a worker that died releases its work',
        },
        {
          from: 'delivered',
          to: 'pending',
          trigger: 'requeue',
          guard:
            'an operator asks for a redelivery; a new cycle starts, attempt numbers keep rising',
        },
        {
          from: 'failed',
          to: 'pending',
          trigger: 'requeue',
          guard: 'an operator asks for a redelivery',
        },
        {
          from: 'abandoned',
          to: 'pending',
          trigger: 'requeue',
          guard: 'an operator asks for a redelivery',
        },
      ],
      notes: [
        'Derived from the repository SQL rather than from a declared table: the statuses are a PostgreSQL enum and the moves are the four statements that write them.',
        'No status is terminal, because requeue accepts any row that is not in flight.',
      ],
      evidence: [
        lines(migrationCallbacks, 8, 10),
        lines(webhookDeliveryRepository, 154, 184),
        lines(webhookDeliveryRepository, 194, 253),
        lines(webhookDeliveryRepository, 262, 299),
        lines(webhookDeliveryRepository, 386, 409),
      ],
    },
  ],
  decisions: [
    {
      id: 'adr-0001',
      title: 'PostgreSQL is the only durable store',
      decision:
        'There is no broker. Work queues are tables in the same database that holds the payments, and background processes drain them. The delivery row is written in the transaction that changes the status, and the scan cursor advances in the transaction that writes the transfers it covers.',
      alternatives: [
        'Redis with BullMQ: the dual write between commit and enqueue.',
        'A transactional outbox plus a broker with a relay: correct, and a whole component for throughput nothing here needs.',
        'LISTEN/NOTIFY instead of polling: not durable, would sit on top of the table anyway.',
      ],
      cost: 'Throughput, and a missing capability: no delayed-job scheduler, no priorities, no fan-out. Retry scheduling is a next_attempt_at column and a query.',
      themes: ['durability', 'correctness'],
      evidence: [
        file('docs/adr/0001-postgres-as-the-only-durable-store.md'),
        lines(paymentRepository, 636, 655),
      ],
    },
    {
      id: 'adr-0002',
      title: 'Leased leadership with fencing tokens',
      decision:
        'A leader_leases table with an expiry and a monotonically increasing fencing token. The holder renews; the token is written into every cursor update as part of the WHERE clause.',
      alternatives: [
        'A session advisory lock: no failover when a process hangs but stays connected.',
        'A transaction-scoped advisory lock per tick: serialises networks that have no reason to be serialised.',
        'A leader election service: a whole dependency for a problem one table solves.',
      ],
      cost: 'A lease can be lost while the holder is healthy but slow, which causes a handover that was not needed. The cost is one duplicated scan window, which is a no-op.',
      themes: ['correctness', 'operability'],
      evidence: [
        file('docs/adr/0002-leased-leadership-with-fencing-tokens.md'),
        lines(leaderLeaseRepository, 57, 81),
      ],
    },
    {
      id: 'adr-0003',
      title: 'The finality tag gates completion, not the confirmation count alone',
      decision:
        'Both, whichever is later: confirmations at or above the requirement and the finalized tag covering the settling block, seconded by a second, independently operated provider. If the finality view stalls, alert and hold. Never fall back to the count.',
      alternatives: [
        'Count only: a guess about block time, and Polygon changed its block time twice in eighteen months.',
        'Tag only: no independent check on a single provider.',
        'blockTag safe: type-checks in viem and is not served by Polygon; a lint rule bans it.',
      ],
      cost: 'Availability, deliberately: a finality outage stops completions and someone has to be paged. Plus one extra RPC call per completion for the second opinion.',
      themes: ['correctness', 'operability'],
      evidence: [
        file('docs/adr/0003-finality-tag-over-confirmation-count.md'),
        lines(finalityPolicy, 24, 104),
      ],
    },
    {
      id: 'adr-0004',
      title: 'The chain port speaks ledger vocabulary with opaque identifiers',
      decision:
        'ChainGateway names positions, headers, transfers and finality, never a block hash, log index, topic, ABI, chain id or nonce. A lint rule bans that vocabulary in domain and application. Reading and writing are separate ports so the read path never touches key material.',
      alternatives: [
        'An interface shaped like getLogs(topics, fromBlock, toBlock): an EVM client with different capitalisation that a non-EVM adapter would have to lie to.',
      ],
      cost: 'A translation layer, and some awkwardness where an EVM concept has no neutral name: event index for logIndex reads foreign to someone who knows Ethereum.',
      themes: ['boundaries', 'tooling'],
      evidence: [
        file('docs/adr/0004-ledger-shaped-chain-port.md'),
        lines(chainGatewayPort, 22, 37),
        lines('eslint.config.js', 224, 226),
      ],
    },
    {
      id: 'adr-0005',
      title: 'One HD-derived address per payment',
      decision:
        'A BIP-32/44 hierarchical wallet, one address per payment at m/44h/60h/0h/0/{index}, allocated from the account-level public key alone, so the process that creates payments cannot sign.',
      alternatives: [
        'A shared address with a memo field: customers omit the memo.',
        'A fresh random key per payment, stored encrypted: turns seed recovery into database recovery.',
        'Non-custodial, pay the merchant directly: better on custody, and it moves key management onto the merchant.',
      ],
      cost: 'A sweep transaction per payment and gas to fund it, plus the exposures in limitations 1 and 2: the key encryption key is an environment variable, and non-hardened derivation means the extended public key plus one leaked child key yields the branch.',
      themes: ['security', 'correctness'],
      evidence: [
        file('docs/adr/0005-hd-derived-address-per-payment.md'),
        lines(paymentDestination, 20, 47),
      ],
    },
    {
      id: 'adr-0006',
      title: 'Callbacks follow Standard Webhooks',
      decision:
        'webhook-id, webhook-timestamp and webhook-signature v1,<base64>, signing {id}.{timestamp}.{body} with HMAC-SHA256. The id is byte-identical across retries, the timestamp is regenerated per attempt, the body is serialized once and stored.',
      alternatives: [
        'A bespoke HMAC scheme, which every merchant would implement against prose and some would implement wrong.',
      ],
      cost: 'Little. The whsec_ prefix collides with a secret-scanning pattern on GitHub, which is why no credential-shaped literal appears in the source at all.',
      themes: ['security', 'boundaries'],
      evidence: [
        file('docs/adr/0006-standard-webhooks.md'),
        lines(webhookSignature, 3, 13),
        lines(deliverCallbacks, 21, 29),
      ],
    },
    {
      id: 'adr-0007',
      title: 'Few ports, and the obvious ones refused',
      decision:
        'The ADR names five ports: ChainGateway, SettlementBroadcaster, PaymentAddressAllocator, Clock and RandomSource. In the code two are interfaces and the other three are function-typed dependencies passed to the use cases. Repositories, UnitOfWork, EventBus, a Logger port and a RetryPolicy class are refused.',
      alternatives: [
        'Repository interfaces: would exist to enable a worse test than the real PostgreSQL the suite runs against.',
        'An EventBus: the outbox row is the publication, and a bus would be a second place to disagree.',
      ],
      cost: 'Use cases name concrete classes, so a reader has to know that PaymentRepository means PostgreSQL.',
      themes: ['boundaries'],
      evidence: [
        file('docs/adr/0007-ports-and-the-ones-refused.md'),
        lines(createPayment, 48, 70),
        lines(deliverCallbacks, 39, 57),
      ],
    },
    {
      id: 'adr-0008',
      title: 'Fastify and a hand-written composition root, not NestJS',
      decision:
        'Fastify 5 with a composition root that constructs everything explicitly, in dependency order, in one file. No decorators, no reflect-metadata, no lock on a TypeScript version. Boundaries are enforced by no-restricted-imports zones.',
      alternatives: [
        'NestJS: a runtime resolution step that can fail on a token that was only ever a string.',
        'Express: slower, with worse async error handling, and an unhandled rejection here means an undetected payment.',
      ],
      cost: 'Request logging, error shaping, validation wiring and lifecycle are written by hand, a few hundred lines. A NestJS developer reads the composition root instead of knowing the conventions.',
      themes: ['tooling', 'boundaries'],
      evidence: [
        file('docs/adr/0008-no-dependency-injection-framework.md'),
        lines(compositionRoot, 64, 97),
      ],
    },
    {
      id: 'adr-0009',
      title: 'Per-family address derivation, and what ed25519 costs',
      decision:
        'Destinations are derived per family from the one master seed: secp256k1 at m/44h/60h and m/44h/195h from a public key, ed25519 at m/44h/501h/{i}h/0h with the seed opened per allocation and zeroed in a finally. The strategy is a discriminated union so the compiler enforces the difference.',
      alternatives: [
        'Force TRON and Solana into the EVM representation: a base58 address is not a hex address.',
        'One shared base58 form for both: the original shape, and wrong, split by migration 0015.',
        'Pre-derive a pool of Solana addresses offline: restores the property at the cost of a pool table, a refill worker and an exhaustion mode.',
        'A second key hierarchy: two seeds to back up and no security benefit.',
      ],
      cost: 'Solana payment creation touches the seed and Polygon and TRON do not, permanently. Funds accumulate at TRON and Solana addresses with no sweeper.',
      themes: ['security', 'correctness'],
      evidence: [
        file('docs/adr/0009-per-family-address-derivation.md'),
        lines(allocatorProvider, 38, 51),
        lines(paymentDestination, 39, 57),
      ],
    },
  ],
  fragments: [
    {
      id: 'incoherent-window',
      title: 'A window is checked against its own headers',
      path: scanNetwork,
      lines: [378, 402],
      language: 'ts',
      demonstrates:
        'Logs and headers are separate requests. A transfer whose block reference disagrees with the header at its height means a reorg landed between the two reads, so the window is discarded and read again next tick.',
    },
    {
      id: 'outbox-in-transaction',
      title: 'The outbox row inside the status transaction',
      path: paymentRepository,
      lines: [636, 655],
      language: 'ts',
      demonstrates:
        'The delivery row is inserted after the payments UPDATE and the audit row and before COMMIT. A replayed transition conflicts on (payment_id, event_type) and produces one notification.',
    },
    {
      id: 'lease-acquire',
      title: 'Acquire a lease with a fencing token',
      path: leaderLeaseRepository,
      lines: [57, 81],
      language: 'ts',
      demonstrates:
        'One statement takes an unheld or expired lease, or extends the holder own, and increments the fencing token. A live lease held by someone else returns no row.',
    },
    {
      id: 'fenced-cursor-advance',
      title: 'The cursor advances only under the current token',
      path: chainScanStore,
      lines: [130, 160],
      language: 'ts',
      demonstrates:
        'The cursor UPDATE carries fencing_token = $7 and halted_at IS NULL. Zero rows means another worker holds the lease, and the whole window rolls back.',
    },
    {
      id: 'evaluation-claim',
      title: 'Claim payments with SKIP LOCKED',
      path: evaluationQueueRepository,
      lines: [64, 87],
      language: 'ts',
      demonstrates:
        'A leased claim for one network only, so a worker watching Amoy never judges a mainnet payment against the wrong tip.',
    },
    {
      id: 'callback-claim',
      title: 'One in-flight delivery per merchant environment',
      path: webhookDeliveryRepository,
      lines: [153, 184],
      language: 'ts',
      demonstrates:
        'DISTINCT ON keeps one merchant events in order within a batch and NOT EXISTS keeps it across workers. No SKIP LOCKED here; the partial unique index and the merchant deduplication on webhook-id are the guards.',
    },
    {
      id: 'finality-second-opinion',
      title: 'The finality gate, with a second provider veto',
      path: finalityPolicy,
      lines: [24, 83],
      language: 'ts',
      demonstrates:
        'The count first, then the local finalized height, then the second provider. contradicted and unavailable both hold the payment; only a confirmed second opinion makes it creditable.',
    },
    {
      id: 'webhook-verify',
      title: 'Constant-time verification across every secret',
      path: webhookSignature,
      lines: [132, 145],
      language: 'ts',
      demonstrates:
        'Every candidate signature is compared against every active secret without an early exit, so timing does not reveal which one matched.',
    },
    {
      id: 'idempotency-reserve',
      title: 'Reserve an idempotency key in one statement',
      path: idempotencyRepository,
      lines: [82, 117],
      language: 'ts',
      demonstrates:
        'INSERT ... ON CONFLICT DO UPDATE claims an abandoned reservation only when its lock expired and the fingerprint is identical. The owner token proves which attempt may write the response.',
    },
    {
      id: 'callback-worker-grants',
      title: 'What the callback worker may touch',
      path: rolesSql,
      lines: [60, 67],
      language: 'sql',
      demonstrates:
        'The process that connects to stranger-chosen addresses sees the outbox, the attempts and the signing secrets, and nothing else.',
    },
    {
      id: 'live-sequence-index',
      title: 'One live transaction per account and sequence',
      path: migrationSettlement,
      lines: [152, 160],
      language: 'sql',
      demonstrates:
        'The double-spend guard. A second transaction for the same account and nonce is refused by the index unless the first was marked replaced or dropped.',
    },
    {
      id: 'address-strategies',
      title: 'Public key only, or requires the seed',
      path: allocatorProvider,
      lines: [38, 51],
      language: 'ts',
      demonstrates:
        'Polygon and TRON allocate from a cached public key. Solana cannot: ed25519 derivation is hardened only, so the seed is opened per allocation.',
    },
  ],
  verification: {
    layers: [
      {
        name: 'Unit and property',
        tool: 'Vitest projects shared, api, web and tools',
        proves:
          'The transition tables, the finality policy, the destination policy, the signature module and the lint mandates behave as documented, with the two state machine modules held at 100 percent coverage.',
        examples: [
          {
            path: 'packages/shared/src/payment-state-machine.spec.ts',
            proves:
              'All 56 ordered pairs of distinct statuses are enumerated: 11 allowed, 45 rejected under every trigger.',
          },
          {
            path: 'apps/api/src/domain/finality-policy.spec.ts',
            proves:
              'Confirmations without finality, and finality without confirmations, both refuse.',
          },
          {
            path: destinationPolicySpec,
            proves:
              'Plain http, other ports, userinfo, bare addresses, mixed public and private records and mapped IPv4 are refused; the allowlist relaxes only what it names.',
          },
          {
            path: 'packages/shared/src/server/webhook-signature.spec.ts',
            proves:
              'A moved signature, an altered byte, a future timestamp and an unknown version are rejected; either secret verifies during rotation.',
          },
          {
            path: 'tools/eslint-mandates.spec.mjs',
            proves:
              'The real ESLint configuration rejects else, abbreviations, chain vocabulary in the domain and viem in the domain layer.',
          },
        ],
      },
      {
        name: 'Integration',
        tool: 'Vitest project api-integration: embedded PostgreSQL 18 plus a real Anvil chain, one database per spec cloned from a migrated template',
        proves:
          'The money invariants hold under injected database failure, reorgs, concurrent workers and real callbacks over a socket.',
        examples: [
          {
            path: resilienceSpec,
            proves:
              'The database is failed at every query index of a scanner tick and an evaluator tick; no transfer is ever above the cursor and no status change is ever without its delivery row.',
          },
          {
            path: reorgSpec,
            proves:
              'A fork in a window with no transfers is detected; credited money is marked orphaned and re-credited on re-mine; a fork deeper than the limit halts.',
          },
          {
            path: leaderLeaseSpec,
            proves:
              'Exactly one holder under contention, handover after expiry, and a write carrying a stale fencing token affects zero rows.',
          },
          {
            path: outboxSpec,
            proves:
              'The payment update rolls back when the delivery insert fails, and a replayed transition leaves one delivery.',
          },
          {
            path: callbackDeliverySpec,
            proves:
              'Callbacks reach a real HTTP server, verify with the shared module, keep the webhook-id across redelivery and regenerate the timestamp.',
          },
          {
            path: settlementSpec,
            proves:
              'A sweep moves the on-chain balance, never sends twice, refuses to cross the spend ceiling and refuses the wrong chain.',
          },
        ],
      },
      {
        name: 'Local chains',
        tool: 'Vitest project chain-local: java-tron and agave-test-validator in Docker',
        proves:
          'A TRON and a Solana payment reach completed from a transaction the suite broadcast itself.',
        examples: [
          {
            path: 'apps/api/local/tron/lifecycle.spec.ts',
            proves:
              'A TRON destination is accepted by the chain and a real transfer completes the payment.',
          },
          {
            path: 'apps/api/local/solana/lifecycle.spec.ts',
            proves:
              'A Solana destination is accepted by the validator and a real transfer completes the payment.',
          },
        ],
      },
      {
        name: 'Live reads',
        tool: 'Vitest project chain-live, read-only against Nile and Devnet, run on demand',
        proves: 'The adapters decode what the public networks really return today.',
        examples: [
          {
            path: 'apps/api/live/tron/nile.spec.ts',
            proves:
              'Genesis identity, solidified head and a real TRC-20 transfer decode as TronGrid reports them.',
          },
          {
            path: 'apps/api/live/solana/devnet.spec.ts',
            proves: 'Finalized slots, skipped slots and parent links read correctly.',
          },
        ],
      },
      {
        name: 'End to end',
        tool: 'Playwright, chromium, against the stack started by scripts/demo.mjs',
        proves: 'The dashboard and checkout work against the real API with a generated key.',
        examples: [
          {
            path: 'e2e/dashboard.spec.ts',
            proves:
              'A real key lands on the dashboard, the key never reaches page JavaScript, and no route scrolls sideways at 360 pixels.',
          },
        ],
      },
    ],
    pipeline: [
      {
        name: 'static',
        detail:
          'npm ci, scan:secrets first, build, lint, format:check, typecheck, knip, docs:check.',
      },
      {
        name: 'web',
        detail:
          'Builds packages/shared then apps/web, the only step that catches a class purged by Tailwind.',
      },
      {
        name: 'e2e',
        detail:
          'Builds, installs chromium, runs npm run test:e2e:demo; the Playwright report is uploaded on failure.',
      },
      { name: 'secrets', detail: 'gitleaks over the full history with fetch-depth 0.' },
      {
        name: 'integration',
        detail:
          'Foundry v1.8.1 pinned, then npm run test:coverage: shared, api, web, tools and api-integration together, the only job that runs the integration suite.',
      },
      { name: 'unit', detail: 'npm test: the fast suites with no database and no chain.' },
      {
        name: 'Amoy validation',
        detail:
          'A separate workflow on dispatch or a weekly cron, gated by a GitHub Environment; refuses a key with mainnet history, then sends one real payment on Amoy and watches the backend conclude.',
      },
    ],
    checks: [
      {
        command: 'npm run scan:secrets',
        refuses:
          'A credential-shaped literal or a tracked .env in the files git tracks. Runs in the pre-commit hook and in CI.',
      },
      {
        command: 'npm run docs:check',
        refuses: 'A docs/state-machine.md that differs from the compiled transition table.',
      },
      {
        command: 'npm run lint',
        refuses:
          'else, abbreviated identifiers, chain vocabulary in domain or application, viem or Prisma imports in the domain, node builtins in the browser-safe shared entry, blockTag safe, checksummed address literals.',
      },
      { command: 'npm run knip', refuses: 'Unused files, exports and dependencies.' },
      {
        command: 'npm run check:testnet-key',
        refuses:
          'A funding key whose address has a balance or a nonce on any of four mainnets. Fails closed when the endpoints do not answer.',
      },
      {
        command: 'npx commitlint --edit',
        refuses: 'A commit message outside the conventional format, from the commit-msg hook.',
      },
    ],
    evidence: [
      lines(ciWorkflow, 18, 136),
      lines(testnetWorkflow, 12, 56),
      lines(vitestConfig, 5, 124),
      file('.husky/pre-commit'),
      file('.husky/commit-msg'),
      file('scripts/verify-docs.mjs'),
      file('scripts/scan-secrets.mjs'),
      file('knip.json'),
    ],
  },
  security: [
    {
      concern: 'A test key reaching mainnet',
      control:
        'The environment is a property of the key, a predicate on every query, and a database CHECK on payments that ties environment to network. A test key cannot spell mainnet because the gateway takes a family, not a network.',
      evidence: [
        lines('apps/api/migrations/0008_canonical_account_form.sql', 155, 158),
        file('apps/api/test/schema-constraints.spec.ts'),
        lines(paymentRepository, 287, 312),
        lines(networkConfiguration, 500, 523),
      ],
    },
    {
      concern: 'Offline verification of stolen API keys',
      control:
        'Only an HMAC-SHA256 digest of the secret under a server-held pepper is stored, compared in constant time with the length checked first. A malformed key never reaches the database.',
      evidence: [lines(apiKey, 17, 24), lines(apiKey, 62, 96), lines(authentication, 67, 89)],
    },
    {
      concern: 'Enumeration through error responses',
      control:
        'Every authentication failure answers the same 401 body. Another merchant payment answers 404 because the merchant and environment are in the query, not checked afterwards.',
      evidence: [
        lines(authentication, 16, 18),
        lines(authentication, 53, 89),
        lines(gatewayRoutes, 137, 153),
      ],
    },
    {
      concern: 'SSRF through callbackUrl',
      control:
        'WHATWG parsing, https on 443 only, no userinfo, no bare address, no single-label host, every DNS record checked against 18 IPv4 and 13 IPv6 denied blocks, and the connection pinned to the checked address through undici lookup. Applied at creation and before every attempt. Redirects are never followed.',
      evidence: [
        lines(destinationPolicy, 3, 25),
        lines(destinationPolicy, 259, 303),
        lines(callbackTransport, 62, 125),
      ],
    },
    {
      concern: 'Webhook forgery and replay',
      control:
        'Standard Webhooks HMAC over id.timestamp.body, tolerance of 300 s in both directions, constant-time comparison across every secret, and a receiver that deduplicates on webhook-id.',
      evidence: [lines(webhookSignature, 96, 146), lines(demoReceiver, 106, 131)],
    },
    {
      concern: 'Key material in the wrong process',
      control:
        'wallet_seeds is revoked from the chain worker and the callback worker. The settlement worker is granted it by name; the API reaches it through its grant on every table and opens a seed only to build a cached public key for Polygon and TRON, and per allocation for Solana, zeroing it in a finally. The derivation path is never in a response type and is on the log redaction list.',
      evidence: [
        lines(rolesSql, 39, 47),
        lines(rolesSql, 82, 91),
        lines(allocatorProvider, 85, 103),
        lines(paymentDestination, 10, 18),
        lines('apps/api/src/observability/logger.ts', 44, 50),
      ],
    },
    {
      concern: 'The merchant key leaking into the browser',
      control:
        'The dashboard holds the key in an httpOnly, SameSite Lax cookie read only on the server; the BFF attaches it and forwards 15 path patterns only. An end-to-end test asserts page JavaScript cannot see it.',
      evidence: [
        lines(session, 3, 15),
        lines(bffRoute, 16, 44),
        lines('e2e/dashboard.spec.ts', 86, 95),
      ],
    },
    {
      concern: 'Unbounded spend by a compromised or buggy signer',
      control:
        'A per-network spend ceiling checked before signing against the treasury whole committed history, unresolved transactions counted at worst case. Production refuses to start a signer without one.',
      evidence: [
        lines(settlePayments, 368, 400),
        lines(spendCeiling, 50, 67),
        lines(configuration, 200, 213),
      ],
    },
    {
      concern: 'Paying a merchant twice',
      control:
        'UNIQUE (payment_id) on settlements, a partial unique index on live (account, sequence_number) transactions, and a sequence claimed under a row lock. An unanswered submit is resolved by asking the chain, never by resending.',
      evidence: [
        lines(migrationSettlement, 65, 70),
        lines(migrationSettlement, 152, 160),
        lines(settlePayments, 460, 577),
      ],
    },
    {
      concern: 'Signing for the wrong chain',
      control:
        'The chain id is asserted at startup by the scanner and again by the broadcaster before anything is signed; a mismatch throws rather than warns.',
      evidence: [lines(evmChainGateway, 137, 142), lines(settlementWorker, 65, 83)],
    },
    {
      concern: 'A flood from one key starving others',
      control:
        'A fixed 60 s window of 600 requests per key, counted with one upsert in PostgreSQL so it holds across replicas, only after the key is known to be valid.',
      evidence: [
        lines(migrationRateLimits, 1, 26),
        lines(rateLimitRepository, 33, 84),
        lines(authentication, 103, 121),
      ],
    },
    {
      concern: 'Secrets committed to the repository',
      control:
        'A bespoke scanner over tracked files in the pre-commit hook and in CI, plus gitleaks over the whole history in its own job; a test asserts the audit log never receives a credential-shaped value.',
      evidence: [
        file('scripts/scan-secrets.mjs'),
        lines(ciWorkflow, 81, 92),
        lines('apps/api/migrations/0014_audit_log.sql', 14, 15),
        lines('apps/api/test/gateway-api.spec.ts', 698, 698),
      ],
    },
  ],
  limitations: [
    {
      statement:
        'The key encryption key is an environment variable on the host. Anyone who can read the environment of the API or the chain worker can unwrap every unswept deposit key. No KMS adapter ships.',
      evidence: [lines(limitations, 13, 30)],
    },
    {
      statement:
        'Derivation is non-hardened on Polygon and TRON: the account extended public key plus any single leaked child key yields every key in that branch. Solana pays the opposite price and opens the seed on every allocation.',
      evidence: [lines(limitations, 32, 53), lines(allocatorProvider, 64, 83)],
    },
    {
      statement:
        'A single configured RPC URL leaves finality-gated payments in confirming forever: the second opinion is built from the endpoints after the first, and an empty list answers unavailable.',
      evidence: [
        lines(compositionRoot, 286, 291),
        lines(evmChainGateway, 172, 175),
        lines(limitations, 210, 213),
      ],
    },
    {
      statement:
        'The finality quorum defeats one lagging or dishonest provider, not a correlated failure. A stall converts into an outage rather than a wrong completion.',
      evidence: [lines(limitations, 55, 68)],
    },
    {
      statement:
        'The callback claim has no SKIP LOCKED and no fencing token. Two workers can attempt the same delivery; the receiver deduplication on webhook-id is what prevents a duplicate side effect.',
      evidence: [lines(webhookDeliveryRepository, 154, 184), lines(limitations, 224, 226)],
    },
    {
      statement:
        '/readyz calls a cursor stale when updated_at is older than 120 s, and adoptLease refreshes updated_at on every tick. A lease holder that adopts and then scans nothing reads as healthy.',
      evidence: [lines(healthRoutes, 44, 87), lines(blockCursorRepository, 111, 118)],
    },
    {
      statement:
        'Settlement is EVM only. TRON and Solana declare supportsSettlement false, no broadcaster exists for them, and funds arriving there wait for an operator holding the seed.',
      evidence: [
        lines(networkConfiguration, 295, 298),
        lines(compositionRoot, 460, 468),
        lines(configuration, 328, 334),
      ],
    },
    {
      statement:
        'TRON and Solana were validated on local nodes and by live reads only. No payment was ever sent on public Nile or Devnet, and mainnet was broadcast on once, on Polygon.',
      evidence: [lines(limitations, 148, 192)],
    },
    {
      statement:
        'A native Polygon transfer made by a contract appears in no block body and is not detected; reconciliation comparing the destination balance is what notices it.',
      evidence: [lines(limitations, 88, 94)],
    },
    {
      statement:
        'A transient DNS failure classifies a destination as refused and the delivery is abandoned, where a retry would have succeeded.',
      evidence: [
        lines(destinationPolicy, 269, 274),
        lines(deliverCallbacks, 106, 121),
        lines(limitations, 223, 223),
      ],
    },
    {
      statement:
        'One in-flight settlement per network account is a hard throughput ceiling, and it is also what makes a double spend under a crash at broadcast impossible.',
      evidence: [lines(limitations, 96, 100), lines(migrationSettlement, 152, 160)],
    },
    {
      statement:
        'There are no refunds and no automated recovery of a settlement that exhausted its attempts; both states are recorded and wait for a person.',
      evidence: [lines(limitations, 116, 122)],
    },
    {
      statement:
        'Observability is pino logs plus /healthz, /health, /readyz and /readiness. There is no metrics endpoint and no tracing.',
      evidence: [lines(healthRoutes, 94, 138), file('apps/api/src/observability/logger.ts')],
    },
    {
      statement:
        'No test asserts that roles.sql covers every table or that the role refusals hold, and CI never builds the container images. The README and the roles.sql header both say a test asserts the refusals; no such test exists.',
      evidence: [
        lines(limitations, 240, 241),
        lines(readme, 75, 79),
        lines(rolesSql, 8, 9),
        lines(resilienceSpec, 23, 39),
      ],
    },
    {
      statement:
        'A payment that re-enters a status after a reorg emits no second callback. The outbox row conflicts on (payment_id, event_type) and is dropped, so a merchant told completed and then walked back is not told again when it completes a second time.',
      evidence: [
        lines(paymentRepository, 636, 655),
        lines(migrationCallbacks, 60, 63),
        lines(limitations, 227, 228),
      ],
    },
    {
      statement:
        'The finality second-opinion client is never asked its chain identity. An endpoint misconfigured to another chain contributes an opinion about the wrong ledger instead of being refused.',
      evidence: [lines(evmChainGateway, 128, 142), lines(limitations, 214, 215)],
    },
    {
      statement:
        'A callback response body is read in full before it is cut to a snippet, so a hostile endpoint can make every attempt expensive.',
      evidence: [lines(callbackTransport, 102, 105), lines(limitations, 233, 234)],
    },
    {
      statement:
        'The integration evidence is about this code under these conditions: nothing here has run under sustained load, against a rate-limited provider, or for a year.',
      evidence: [lines(limitations, 138, 146)],
    },
  ],
  boardFlow: 'detect-credit-notify',
});
