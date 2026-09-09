export const APPMAX_DESCRIPTOR: ProviderDescriptor = {
  code: 'appmax',
  displayName: 'Appmax',
  capabilities: ['pix.create', 'pix.status', 'order.read', 'refund.full', 'webhook.receive'],
  supportedCurrencies: ['BRL'],
  // Order creation has no idempotency key and no merchant reference, so a retry
  // can produce a second order. The routing layer needs this as a fact.
  instrumentCreationIsIdempotent: false,
};
