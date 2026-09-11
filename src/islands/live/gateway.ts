/**
 * The payment gateway's public surface, as the demo uses it: create a payment, read it back,
 * ask what is reachable behind it. Nothing else is called from this site; CryptoPay, the chain
 * and the notification platform are only ever seen through what the gateway records about them.
 */

export interface CryptoInstrument {
  readonly type: 'crypto';
  readonly network: string;
  readonly asset: string;
  readonly destinationAddress: string;
  readonly paymentUri: string;
  readonly qrCodeImageDataUri: string;
  readonly expiresAt?: string;
}

export interface Transition {
  readonly sequence: number;
  readonly fromStatus: string;
  readonly toStatus: string;
  readonly trigger: string;
  readonly evidenceClass: string;
  readonly reason?: string;
  readonly occurredAt: string;
}

export interface ProviderNotification {
  readonly provider: string;
  readonly eventType: string;
  readonly receivedAt: string;
  readonly disposition: string;
}

export interface PaymentEvent {
  readonly type: string;
  readonly occurredAt: string;
  readonly delivery: {
    readonly channel: string;
    readonly status: string;
    readonly attempts: number;
    readonly reference?: string;
    readonly publishedAt?: string;
    readonly lastFailure?: string;
  };
}

export interface PaymentDetail {
  readonly id: string;
  readonly status: string;
  readonly paymentMethod: string;
  readonly amountMinor: string;
  readonly capturedAmountMinor: string;
  readonly currency: string;
  readonly merchantReference: string;
  readonly createdAt: string;
  readonly expiresAt?: string;
  readonly paidAt?: string;
  readonly provider?: string;
  readonly providerReference?: string;
  readonly instrument?: CryptoInstrument | { readonly type: 'pix' };
  readonly transitions: readonly Transition[];
  readonly providerNotifications: readonly ProviderNotification[];
  readonly events: readonly PaymentEvent[];
}

export interface CreatedPayment {
  readonly id: string;
  readonly status: string;
  readonly failureCode?: string;
  readonly failureReason?: string;
}

export type IntegrationStatus = 'up' | 'down' | 'not_configured';

export interface Readiness {
  readonly status: string;
  readonly checks: {
    readonly database: { readonly status: string };
    readonly integrations?: Readonly<Record<string, { readonly status: IntegrationStatus }>>;
  };
}

export interface GatewayConnection {
  readonly baseUrl: string;
  readonly apiKey: string;
}

export interface GatewayFailure {
  readonly status: number;
  readonly code: string;
  readonly message: string;
}

export type GatewayResult<Body> =
  | { readonly ok: true; readonly body: Body }
  | { readonly ok: false; readonly failure: GatewayFailure };

const errorOf = (status: number, body: unknown): GatewayFailure => {
  const error =
    typeof body === 'object' && body !== null && 'error' in body
      ? (body as { error?: { code?: unknown; message?: unknown } }).error
      : undefined;
  return {
    status,
    code: typeof error?.code === 'string' ? error.code : 'unexpected_response',
    message:
      typeof error?.message === 'string'
        ? error.message
        : `The gateway answered ${String(status)} without a documented error.`,
  };
};

const trimSlash = (url: string): string => url.replace(/\/+$/, '');

const call = async <Body>(
  connection: GatewayConnection,
  path: string,
  init: RequestInit & { readonly idempotencyKey?: string } = {},
): Promise<GatewayResult<Body>> => {
  let response: Response;
  try {
    response = await fetch(`${trimSlash(connection.baseUrl)}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${connection.apiKey}`,
        'content-type': 'application/json',
        ...(init.idempotencyKey === undefined ? {} : { 'idempotency-key': init.idempotencyKey }),
      },
    });
  } catch {
    return {
      ok: false,
      failure: {
        status: 0,
        code: 'unreachable',
        message: 'The gateway could not be reached from this page.',
      },
    };
  }
  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    return { ok: false, failure: errorOf(response.status, body) };
  }
  return { ok: true, body: body as Body };
};

export interface CreatePaymentInput {
  readonly amountMinor: number;
  readonly currency: string;
  readonly reference: string;
  readonly description: string;
  readonly phone: string | undefined;
  readonly idempotencyKey: string;
}

export const createPayment = (
  connection: GatewayConnection,
  input: CreatePaymentInput,
): Promise<GatewayResult<CreatedPayment>> =>
  call(connection, '/v1/payments', {
    method: 'POST',
    idempotencyKey: input.idempotencyKey,
    body: JSON.stringify({
      amount: input.amountMinor,
      currency: input.currency,
      paymentMethod: 'crypto',
      reference: input.reference,
      description: input.description,
      ...(input.phone === undefined ? {} : { customer: { phone: input.phone } }),
    }),
  });

export const readPayment = (
  connection: GatewayConnection,
  paymentId: string,
): Promise<GatewayResult<PaymentDetail>> =>
  call(connection, `/v1/payments/${encodeURIComponent(paymentId)}`);

/** Readiness carries no credential; it is the one thing asked before a key is known. */
export const readReadiness = async (baseUrl: string): Promise<Readiness | undefined> => {
  try {
    const response = await fetch(`${trimSlash(baseUrl)}/ready`);
    const body: unknown = await response.json();
    return body as Readiness;
  } catch {
    return undefined;
  }
};

const decimalPattern = /^(\d{1,3})(?:\.(\d{1,6}))?$/;

/**
 * "1.50" to 1500000, on strings and integers only: a float in between would be someone's money.
 * Six decimals is USDC's precision, and three whole digits keeps a demo within a demo ceiling.
 */
export const parseUsdcAmount = (text: string): number | undefined => {
  const match = decimalPattern.exec(text.trim());
  if (match === null) {
    return undefined;
  }
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? '').padEnd(6, '0'));
  const minor = whole * 1_000_000 + fraction;
  return minor === 0 ? undefined : minor;
};

export const formatUsdc = (minor: string): string => {
  const padded = minor.padStart(7, '0');
  return `${padded.slice(0, -6)}.${padded.slice(-6)} USDC`;
};
