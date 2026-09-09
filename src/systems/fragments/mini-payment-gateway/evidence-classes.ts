/**
 * How much confidence a transition demands.
 *
 * `authenticated_provider_read` exists because Appmax webhooks carry no signature
 * of any kind. A webhook may therefore never move money on its own; it schedules a
 * read, and only the read's evidence can fund a payment.
 */
export const EVIDENCE_CLASSES = ['internal', 'authenticated_provider_read', 'operator'] as const;

export type EvidenceClass = (typeof EVIDENCE_CLASSES)[number];
