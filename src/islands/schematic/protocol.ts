import type { EdgeProtocol, NodeKind } from '../../systems/schema';

export const protocolTag: Record<EdgeProtocol, string> = {
  http: 'HTTP',
  https: 'HTTPS',
  sql: 'SQL',
  'json-rpc': 'RPC',
  webhook: 'WEBHOOK',
  'in-process': 'CALL',
  orchestration: 'ORDER',
};

export const protocolName: Record<EdgeProtocol, string> = {
  http: 'HTTP',
  https: 'HTTPS',
  sql: 'SQL over a database connection',
  'json-rpc': 'JSON-RPC',
  webhook: 'Webhook (HTTP callback)',
  'in-process': 'In-process call',
  orchestration: 'Start-up ordering',
};

export const kindName: Record<NodeKind, string> = {
  actor: 'actor',
  process: 'process',
  job: 'one-shot job',
  store: 'store',
  queue: 'queue',
  external: 'external',
  frontend: 'front end',
  package: 'package',
};
