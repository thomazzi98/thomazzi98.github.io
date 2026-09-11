import type { Tone } from '../../systems/schema';
import type { SchematicEdge, SchematicNode } from '../schematic/Schematic';
import type { PaymentDetail } from './gateway';

/**
 * The topology the live demonstration crosses, and how a gateway record lights it.
 *
 * Every tone below is derived from what the gateway stored: the attempt it opened, the provider
 * reference it recorded, the notifications it received and verified, the transition that funded
 * the payment and the evidence it demanded, and what became of the paid event. Nothing here is a
 * timer or a guess; a part lights when the record says the step happened.
 */

export const liveNodes: readonly SchematicNode[] = [
  { id: 'portfolio', label: 'This page', kind: 'frontend' },
  { id: 'gateway', label: 'Payment gateway', kind: 'process' },
  { id: 'cryptopay', label: 'CryptoPay', kind: 'process' },
  { id: 'chain', label: 'Local chain', kind: 'external' },
  { id: 'whatsapp', label: 'WhatsApp platform', kind: 'process' },
  { id: 'waha', label: 'WAHA', kind: 'external' },
];

export const liveEdges: readonly SchematicEdge[] = [
  { id: 'create', from: 'portfolio', to: 'gateway', label: 'POST /v1/payments', protocol: 'http' },
  {
    id: 'issue',
    from: 'gateway',
    to: 'cryptopay',
    label: 'POST /api/v1/payments',
    protocol: 'http',
  },
  { id: 'scan', from: 'cryptopay', to: 'chain', label: 'scan and confirm', protocol: 'json-rpc' },
  { id: 'notify', from: 'cryptopay', to: 'gateway', label: 'signed webhook', protocol: 'webhook' },
  { id: 'deliver', from: 'gateway', to: 'whatsapp', label: 'payment.paid', protocol: 'http' },
  { id: 'send', from: 'whatsapp', to: 'waha', label: 'send', protocol: 'http' },
];

export type LiveStation = 'portfolio' | 'gateway' | 'cryptopay' | 'chain' | 'whatsapp';

export interface LiveLine {
  readonly key: string;
  readonly at: number;
  readonly tone: Tone;
  readonly station: LiveStation;
  readonly message: string;
}

export interface LiveReading {
  readonly activity: Readonly<Record<string, Tone>>;
  readonly activeEdge: string | undefined;
  readonly headline: string;
  readonly lines: readonly LiveLine[];
  /** Whether the record can still change, so a page knows when to stop asking. */
  readonly settled: boolean;
}

const terminalStatuses = new Set(['paid', 'failed', 'expired', 'cancelled']);
const closedDeliveries = new Set(['delivered', 'skipped', 'abandoned']);

const millisecondsSince = (origin: string, moment: string): number =>
  Math.max(0, Date.parse(moment) - Date.parse(origin));

const shortReference = (reference: string | undefined): string =>
  reference === undefined ? '' : ` ${reference}`;

const transitionLine = (
  detail: PaymentDetail,
  transition: PaymentDetail['transitions'][number],
): LiveLine | undefined => {
  const base = {
    key: `transition-${String(transition.sequence)}`,
    at: millisecondsSince(detail.createdAt, transition.occurredAt),
  };
  const provider = detail.provider ?? 'the provider';
  switch (transition.toStatus) {
    case 'processing': {
      return {
        ...base,
        tone: 'flight',
        station: 'gateway',
        message: `Opened attempt against ${provider} and sent the creation request.`,
      };
    }
    case 'awaiting_payment': {
      return {
        ...base,
        tone: 'wait',
        station: 'gateway',
        message: `${provider} answered with a destination${shortReference(detail.providerReference)}; awaiting payment.`,
      };
    }
    case 'paid': {
      return {
        ...base,
        tone: 'ok',
        station: 'gateway',
        message:
          `Paid, on ${transition.evidenceClass.replaceAll('_', ' ')} (${transition.trigger}). ${transition.reason ?? ''}`.trim(),
      };
    }
    case 'unknown': {
      return {
        ...base,
        tone: 'unknown',
        station: 'gateway',
        message: 'The provider outcome could not be determined; reconciliation owns it now.',
      };
    }
    case 'failed':
    case 'expired':
    case 'cancelled': {
      return {
        ...base,
        tone: 'fault',
        station: 'gateway',
        message:
          `${transition.toStatus} (${transition.trigger}). ${transition.reason ?? ''}`.trim(),
      };
    }
    default: {
      return undefined;
    }
  }
};

const notificationLine = (
  detail: PaymentDetail,
  notification: PaymentDetail['providerNotifications'][number],
  index: number,
): LiveLine => {
  const scheduled = notification.disposition === 'scheduled_read';
  return {
    key: `notification-${String(index)}`,
    at: millisecondsSince(detail.createdAt, notification.receivedAt),
    tone: 'flight',
    station: 'cryptopay',
    message: scheduled
      ? `Signed ${notification.eventType} verified; the gateway scheduled an authenticated read.`
      : `Signed ${notification.eventType} verified and recorded; nothing to read yet.`,
  };
};

// An event's own time is when the provider says the money arrived; it was written in the
// transaction that funded the payment, which is when it appears on the ledger.
const fundedAt = (detail: PaymentDetail): string | undefined =>
  detail.transitions.find((transition) => transition.toStatus === 'paid')?.occurredAt;

const eventLines = (detail: PaymentDetail): LiveLine[] =>
  detail.events.flatMap((event, index) => {
    const written: LiveLine = {
      key: `event-${String(index)}`,
      at: millisecondsSince(detail.createdAt, fundedAt(detail) ?? event.occurredAt),
      tone: 'ok',
      station: 'gateway',
      message: `${event.type} written in the same transaction as the money (paid at ${event.occurredAt}).`,
    };
    const { delivery } = event;
    if (delivery.publishedAt === undefined) {
      return [written];
    }
    const outcome: Record<string, { tone: Tone; message: string }> = {
      delivered: {
        tone: 'ok',
        message: `Accepted the notification${shortReference(delivery.reference)} after ${String(delivery.attempts)} attempt(s); sending through WAHA is the platform's.`,
      },
      skipped: {
        tone: 'unknown',
        message: 'Nobody to notify: the payment carried no phone number.',
      },
      abandoned: {
        tone: 'fault',
        message: `Delivery abandoned: ${delivery.lastFailure ?? 'no reason recorded'}.`,
      },
    };
    const reading = outcome[delivery.status] ?? {
      tone: 'wait' as const,
      message: `Delivery ${delivery.status}.`,
    };
    return [
      written,
      {
        key: `delivery-${String(index)}`,
        at: millisecondsSince(detail.createdAt, delivery.publishedAt),
        tone: reading.tone,
        station: 'whatsapp',
        message: reading.message,
      },
    ];
  });

const chainTone = (detail: PaymentDetail): Tone => {
  if (detail.providerNotifications.length > 0 || detail.status === 'paid') {
    return 'ok';
  }
  return detail.instrument?.type === 'crypto' && detail.status === 'awaiting_payment'
    ? 'wait'
    : 'neutral';
};

const cryptopayTone = (detail: PaymentDetail): Tone => {
  const completed = detail.providerNotifications.some(
    (notification) => notification.disposition === 'scheduled_read',
  );
  if (completed || detail.status === 'paid') {
    return 'ok';
  }
  return detail.providerReference === undefined ? 'neutral' : 'wait';
};

const gatewayTone = (detail: PaymentDetail): Tone => {
  if (detail.status === 'paid') {
    return 'ok';
  }
  if (detail.status === 'unknown') {
    return 'unknown';
  }
  return terminalStatuses.has(detail.status) ? 'fault' : 'wait';
};

const whatsappTone = (detail: PaymentDetail): Tone => {
  const event = detail.events[0];
  if (event === undefined) {
    return 'neutral';
  }
  const byStatus: Record<string, Tone> = {
    delivered: 'ok',
    skipped: 'unknown',
    abandoned: 'fault',
  };
  return byStatus[event.delivery.status] ?? 'wait';
};

const activeEdgeOf = (detail: PaymentDetail): string | undefined => {
  const event = detail.events[0];
  if (event !== undefined) {
    return closedDeliveries.has(event.delivery.status) ? undefined : 'deliver';
  }
  if (detail.status === 'paid' || terminalStatuses.has(detail.status)) {
    return undefined;
  }
  if (detail.providerNotifications.length > 0) {
    return 'notify';
  }
  return detail.providerReference === undefined ? 'issue' : 'scan';
};

const headlineOf = (detail: PaymentDetail): string => {
  const event = detail.events[0];
  if (event?.delivery.status === 'delivered') {
    return 'Paid on chain, confirmed on an authenticated read, and the notification handed over.';
  }
  if (event?.delivery.status === 'skipped') {
    return 'Paid and confirmed; there was no phone number to notify.';
  }
  if (detail.status === 'paid') {
    return 'Paid and confirmed; handing the paid event to the notification platform.';
  }
  if (detail.providerNotifications.length > 0) {
    return 'CryptoPay has seen the transfer; the gateway is reading it back before believing it.';
  }
  if (detail.status === 'awaiting_payment') {
    return 'Destination issued. Waiting for a transfer on the chain.';
  }
  if (detail.status === 'unknown') {
    return 'The provider gave no usable answer; reconciliation is asking again.';
  }
  return `The payment is ${detail.status.replaceAll('_', ' ')}.`;
};

export const readLive = (detail: PaymentDetail): LiveReading => {
  const lines = [
    ...detail.transitions.flatMap((transition) => {
      const line = transitionLine(detail, transition);
      return line === undefined ? [] : [line];
    }),
    ...detail.providerNotifications.map((notification, index) =>
      notificationLine(detail, notification, index),
    ),
    ...eventLines(detail),
  ].sort((first, second) => first.at - second.at);

  const event = detail.events[0];
  const settled =
    terminalStatuses.has(detail.status) &&
    (detail.status !== 'paid' ||
      (event !== undefined && closedDeliveries.has(event.delivery.status)));

  return {
    activity: {
      portfolio: 'ok',
      gateway: gatewayTone(detail),
      cryptopay: cryptopayTone(detail),
      chain: chainTone(detail),
      whatsapp: whatsappTone(detail),
      waha: event?.delivery.status === 'delivered' ? 'ok' : 'neutral',
    },
    activeEdge: activeEdgeOf(detail),
    headline: headlineOf(detail),
    lines,
    settled,
  };
};
