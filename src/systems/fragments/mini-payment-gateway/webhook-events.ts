/**
 * The webhook events relevant to a Pix payment.
 *
 * None of these funds a payment on its own. Appmax sends no signature of any
 * kind, so an event is a prompt to read authoritative state, and the read decides.
 * What the mapping gives us is the ability to ignore events that cannot possibly
 * change anything, rather than reading on every delivery.
 */
export const APPMAX_PIX_WEBHOOK_EVENTS = [
  'order_pix_created',
  'order_paid_by_pix',
  'order_pix_expired',
  'order_approved',
  'order_paid',
  'order_integrated',
  'order_refund',
  'order_partial_refund',
  'order_chargeback_in_treatment',
  'order_charge_back_gain',
  'order_refused_by_risk',
] as const;
