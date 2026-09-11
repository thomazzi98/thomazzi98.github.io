import { describe, expect, it } from 'vitest';
import { liveEdges, liveNodes, readLive } from '../../../src/islands/live/flow';
import { formatUsdc, parseUsdcAmount, type PaymentDetail } from '../../../src/islands/live/gateway';
import paidFixture from './paid-payment.fixture.json';

// A payment the gateway actually recorded during the end-to-end run, read back through its own
// API; only the QR code is shortened. What the drawing shows is derived from this and nothing else.
const paid = paidFixture as PaymentDetail;

const without = (detail: PaymentDetail, changes: Partial<PaymentDetail>): PaymentDetail => ({
  ...detail,
  ...changes,
});

const awaiting: PaymentDetail = without(paid, {
  status: 'awaiting_payment',
  capturedAmountMinor: '0',
  paidAt: undefined,
  transitions: paid.transitions.slice(0, 2),
  providerNotifications: [],
  events: [],
});

describe('the live topology', () => {
  it('draws every station the flow crosses, wired in the order it runs', () => {
    expect(liveNodes.map((node) => node.id)).toEqual([
      'portfolio',
      'gateway',
      'cryptopay',
      'chain',
      'whatsapp',
      'waha',
    ]);
    for (const edge of liveEdges) {
      expect(liveNodes.some((node) => node.id === edge.from)).toBe(true);
      expect(liveNodes.some((node) => node.id === edge.to)).toBe(true);
    }
    expect(liveEdges.find((edge) => edge.id === 'notify')?.protocol).toBe('webhook');
  });
});

describe('reading a gateway record', () => {
  it('lights the whole flow for a payment that was paid and handed over', () => {
    const reading = readLive(paid);
    expect(reading.activity).toEqual({
      portfolio: 'ok',
      gateway: 'ok',
      cryptopay: 'ok',
      chain: 'ok',
      whatsapp: 'ok',
      waha: 'ok',
    });
    expect(reading.activeEdge).toBeUndefined();
    expect(reading.settled).toBe(true);
    expect(reading.headline).toMatch(/authenticated read/);
  });

  it('prints the record as a ledger, in the order it happened, from the gateway clock', () => {
    const lines = readLive(paid).lines;
    expect(lines.map((line) => line.station)).toEqual([
      'gateway',
      'gateway',
      'cryptopay',
      'cryptopay',
      'gateway',
      'gateway',
      'whatsapp',
    ]);
    const moments = lines.map((line) => line.at);
    expect(moments).toEqual([...moments].sort((first, second) => first - second));
    // The attempt opens in the transaction after the one that created the payment.
    expect(lines[0]?.at).toBeGreaterThanOrEqual(0);
    expect(lines[0]?.at).toBeLessThan(1000);
    expect(
      lines.find((line) => line.tone === 'ok' && line.station === 'gateway')?.message,
    ).toContain('authenticated provider read');
    expect(lines[2]?.message).toContain('payment.confirming');
    expect(lines[3]?.message).toContain('scheduled an authenticated read');
    expect(lines[6]?.message).toContain('Accepted the notification');
  });

  it('waits on the chain while the destination is unpaid, and keeps asking', () => {
    const reading = readLive(awaiting);
    expect(reading.activity).toMatchObject({
      gateway: 'wait',
      cryptopay: 'wait',
      chain: 'wait',
      whatsapp: 'neutral',
      waha: 'neutral',
    });
    expect(reading.activeEdge).toBe('scan');
    expect(reading.settled).toBe(false);
    expect(reading.headline).toBe('Destination issued. Waiting for a transfer on the chain.');
  });

  it('moves to the webhook once CryptoPay has spoken and the read is pending', () => {
    const notified = without(awaiting, {
      providerNotifications: paid.providerNotifications,
    });
    const reading = readLive(notified);
    expect(reading.activity.cryptopay).toBe('ok');
    expect(reading.activity.chain).toBe('ok');
    expect(reading.activity.gateway).toBe('wait');
    expect(reading.activeEdge).toBe('notify');
  });

  it('keeps asking while the paid event is still being handed over', () => {
    const pending = without(paid, {
      events: [
        {
          type: 'payment.paid',
          occurredAt: paid.paidAt ?? paid.createdAt,
          delivery: { channel: 'whatsapp', status: 'pending', attempts: 0 },
        },
      ],
    });
    const reading = readLive(pending);
    expect(reading.activity.whatsapp).toBe('wait');
    expect(reading.activity.waha).toBe('neutral');
    expect(reading.activeEdge).toBe('deliver');
    expect(reading.settled).toBe(false);
  });

  it('settles a paid payment with nobody to notify, and says so', () => {
    const skipped = without(paid, {
      events: paid.events.map((event) => ({
        ...event,
        delivery: { channel: 'whatsapp', status: 'skipped', attempts: 1, publishedAt: paid.paidAt },
      })),
    });
    const reading = readLive(skipped);
    expect(reading.activity.whatsapp).toBe('unknown');
    expect(reading.settled).toBe(true);
    expect(reading.headline).toContain('no phone number');
  });

  it('marks a failed payment as a fault and stops', () => {
    const failed = without(awaiting, {
      status: 'failed',
      transitions: [
        ...awaiting.transitions,
        {
          sequence: 3,
          fromStatus: 'awaiting_payment',
          toStatus: 'failed',
          trigger: 'PAYMENT_REFUSED',
          evidenceClass: 'authenticated_provider_read',
          occurredAt: paid.paidAt ?? paid.createdAt,
        },
      ],
    });
    const reading = readLive(failed);
    expect(reading.activity.gateway).toBe('fault');
    expect(reading.settled).toBe(true);
    expect(reading.lines.at(-1)?.tone).toBe('fault');
  });
});

describe('amounts', () => {
  it('turns a decimal into six-decimal minor units without a float', () => {
    expect(parseUsdcAmount('1.50')).toBe(1_500_000);
    expect(parseUsdcAmount('0.000001')).toBe(1);
    expect(parseUsdcAmount('25')).toBe(25_000_000);
    expect(parseUsdcAmount('0')).toBeUndefined();
    expect(parseUsdcAmount('1.0000001')).toBeUndefined();
    expect(parseUsdcAmount('1,5')).toBeUndefined();
  });

  it('formats minor units back as the asset', () => {
    expect(formatUsdc('1500000')).toBe('1.500000 USDC');
    expect(formatUsdc('0')).toBe('0.000000 USDC');
  });
});
