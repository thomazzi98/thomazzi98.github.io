import { useSignal } from '@preact/signals';
import { useEffect, useMemo, useRef } from 'preact/hooks';
import type { Tone } from '../../systems/schema';
import { formatClock } from '../player/format';
import { SchematicPair } from '../schematic/SchematicPair';
import { liveEdges, liveNodes, readLive, type LiveLine } from './flow';
import {
  createPayment,
  formatUsdc,
  parseUsdcAmount,
  readPayment,
  readReadiness,
  type CryptoInstrument,
  type GatewayFailure,
  type IntegrationStatus,
  type PaymentDetail,
  type Readiness,
} from './gateway';

/**
 * A real payment, driven from this page through the gateway and nothing else.
 *
 * The page creates the payment, shows the destination CryptoPay issued, and then reads the
 * gateway back every two seconds until the record settles. Every light on the drawing and every
 * line in the ledger comes from that record: no timer advances a state, and closing the tab
 * changes nothing about the payment.
 */

export interface LiveDemoProps {
  readonly defaultGatewayUrl: string;
}

const storageKeys = { url: 'live.gateway-url', key: 'live.gateway-key' } as const;
const pollMilliseconds = 2000;
const phonePattern = /^\+[1-9]\d{7,14}$/;

const readStored = (name: string): string | undefined => {
  try {
    return globalThis.localStorage.getItem(name) ?? undefined;
  } catch {
    return undefined;
  }
};

const writeStored = (name: string, value: string): void => {
  try {
    globalThis.localStorage.setItem(name, value);
  } catch {
    // A page that cannot remember the key still works; the visitor types it again.
  }
};

const integrationTone: Record<IntegrationStatus, Tone> = {
  up: 'ok',
  down: 'fault',
  not_configured: 'unknown',
};

const integrationText: Record<IntegrationStatus, string> = {
  up: 'reachable',
  down: 'not answering',
  not_configured: 'not configured',
};

interface ReachBadgeProps {
  readonly label: string;
  readonly status: IntegrationStatus | undefined;
}

const ReachBadge = ({ label, status }: ReachBadgeProps) => (
  <span class="badge" data-tone={status === undefined ? 'neutral' : integrationTone[status]}>
    {label} · {status === undefined ? 'unknown' : integrationText[status]}
  </span>
);

const reachOf = (
  isChecked: boolean,
  readiness: Readiness | undefined,
): IntegrationStatus | undefined => {
  if (!isChecked) {
    return undefined;
  }
  return readiness === undefined ? 'down' : 'up';
};

const integrationOf = (
  readiness: Readiness | undefined,
  name: string,
): IntegrationStatus | undefined => readiness?.checks.integrations?.[name]?.status;

const failureText = (failure: GatewayFailure): string => {
  if (failure.code === 'unreachable') {
    return `${failure.message} Is the stack running, and is this origin allowed to call it?`;
  }
  if (failure.status === 401) {
    return 'The gateway refused the API key.';
  }
  return `${failure.message} (${failure.code})`;
};

const cryptoInstrumentOf = (detail: PaymentDetail | undefined): CryptoInstrument | undefined =>
  detail?.instrument?.type === 'crypto' ? detail.instrument : undefined;

interface WalletProvider {
  request(arguments_: { method: string; params?: unknown[] }): Promise<unknown>;
}

const walletProvider = (): WalletProvider | undefined =>
  (globalThis as { ethereum?: WalletProvider }).ethereum;

const padWord = (hex: string): string => hex.replace(/^0x/, '').padStart(64, '0');

/**
 * Hands the EIP-681 request to a browser wallet, which is the customer's, not this site's: the
 * wallet talks to the chain, and this page never does. It sends the token transfer the URI
 * encodes, on the chain the URI names, from whichever account the wallet offers.
 */
const payWithWallet = async (uri: string): Promise<string> => {
  const wallet = walletProvider();
  if (wallet === undefined) {
    throw new Error('No browser wallet is available.');
  }
  const match =
    /^ethereum:(0x[0-9a-f]{40})@(\d+)\/transfer\?address=(0x[0-9a-f]{40})&uint256=(\d+)$/i.exec(
      uri,
    );
  if (match === null) {
    throw new Error('The payment URI is not a token transfer this page can hand to a wallet.');
  }
  const [, token, chainId, recipient, amount] = match;
  await wallet.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: `0x${Number(chainId).toString(16)}` }],
  });
  const accounts = (await wallet.request({ method: 'eth_requestAccounts' })) as string[];
  const from = accounts[0];
  if (from === undefined) {
    throw new Error('The wallet offered no account.');
  }
  const data = `0xa9059cbb${padWord(recipient ?? '')}${padWord(BigInt(amount ?? '0').toString(16))}`;
  const hash = await wallet.request({
    method: 'eth_sendTransaction',
    params: [{ from, to: token, data }],
  });
  return String(hash);
};

const LiveLedger = ({ lines, origin }: { lines: readonly LiveLine[]; origin: string }) => (
  <div class="ledger live__ledger" data-ledger>
    <div class="ledger__head">
      <span class="kicker">Ledger · what the gateway recorded</span>
      <span class="kicker">
        {String(lines.length)} lines · live · T+0 at {new Date(origin).toLocaleTimeString()}
      </span>
    </div>
    <div class="ledger__scroll" role="log" aria-label="Live ledger" tabIndex={0}>
      {lines.map((line) => (
        <p
          key={line.key}
          class="ledger__line"
          style={{ '--tone': line.tone === 'neutral' ? 'transparent' : `var(--${line.tone})` }}
        >
          <span class="ledger__time mono">{formatClock(line.at)}</span>
          <span class="ledger__station">{line.station}</span>
          <span class="ledger__message">{line.message}</span>
        </p>
      ))}
    </div>
  </div>
);

export const LiveDemo = ({ defaultGatewayUrl }: LiveDemoProps) => {
  const gatewayUrl = useSignal(defaultGatewayUrl);
  const apiKey = useSignal('');
  const amount = useSignal('1.50');
  const phone = useSignal('');
  const readiness = useSignal<Readiness | undefined>(undefined);
  const checked = useSignal(false);
  const busy = useSignal(false);
  const error = useSignal<string | undefined>(undefined);
  const detail = useSignal<PaymentDetail | undefined>(undefined);
  const requestedAt = useSignal<number | undefined>(undefined);
  const walletNote = useSignal<string | undefined>(undefined);
  const copied = useSignal(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    gatewayUrl.value = readStored(storageKeys.url) ?? defaultGatewayUrl;
    apiKey.value = readStored(storageKeys.key) ?? '';
  }, [defaultGatewayUrl, gatewayUrl, apiKey]);

  const reading = useMemo(
    () => (detail.value === undefined ? undefined : readLive(detail.value)),
    [detail.value],
  );

  const checkReach = async () => {
    readiness.value = await readReadiness(gatewayUrl.value);
    checked.value = true;
  };

  const poll = async (paymentId: string) => {
    const result = await readPayment(
      { baseUrl: gatewayUrl.value, apiKey: apiKey.value },
      paymentId,
    );
    if (!result.ok) {
      error.value = failureText(result.failure);
      return;
    }
    detail.value = result.body;
    if (readLive(result.body).settled) {
      return;
    }
    pollTimer.current = setTimeout(() => {
      void poll(paymentId);
    }, pollMilliseconds);
  };

  useEffect(
    () => () => {
      clearTimeout(pollTimer.current);
    },
    [],
  );

  const create = async (event: Event) => {
    event.preventDefault();
    error.value = undefined;
    walletNote.value = undefined;
    const amountMinor = parseUsdcAmount(amount.value);
    if (amountMinor === undefined) {
      error.value = 'Enter an amount such as 1.50, with at most six decimals.';
      return;
    }
    const trimmedPhone = phone.value.trim();
    if (trimmedPhone !== '' && !phonePattern.test(trimmedPhone)) {
      error.value = 'The phone must be international, such as +5511999998888, or empty.';
      return;
    }
    writeStored(storageKeys.url, gatewayUrl.value);
    writeStored(storageKeys.key, apiKey.value);
    busy.value = true;
    clearTimeout(pollTimer.current);
    detail.value = undefined;
    const stamp = crypto.randomUUID().slice(0, 8);
    requestedAt.value = Date.now();
    const created = await createPayment(
      { baseUrl: gatewayUrl.value, apiKey: apiKey.value },
      {
        amountMinor,
        currency: 'USDC',
        reference: `portfolio-${stamp}`,
        description: 'Portfolio live demonstration',
        phone: trimmedPhone === '' ? undefined : trimmedPhone,
        idempotencyKey: `portfolio-${crypto.randomUUID()}`,
      },
    );
    busy.value = false;
    if (!created.ok) {
      error.value = failureText(created.failure);
      return;
    }
    if (created.body.failureReason !== undefined) {
      error.value = `The gateway could not route the payment: ${created.body.failureReason}`;
    }
    await poll(created.body.id);
  };

  const copyUri = async (uri: string) => {
    try {
      await navigator.clipboard.writeText(uri);
      copied.value = true;
      setTimeout(() => {
        copied.value = false;
      }, 1500);
    } catch {
      copied.value = false;
    }
  };

  const pay = async (uri: string) => {
    walletNote.value = undefined;
    try {
      const hash = await payWithWallet(uri);
      walletNote.value = `The wallet broadcast ${hash}. CryptoPay will see it on its next scan.`;
    } catch (cause) {
      walletNote.value = cause instanceof Error ? cause.message : 'The wallet refused.';
    }
  };

  const current = detail.value;
  const instrument = cryptoInstrumentOf(current);
  const hasWallet = walletProvider() !== undefined;
  const gatewayReach = reachOf(checked.value, readiness.value);

  return (
    <div class="live" data-settled={reading?.settled === true ? 'true' : 'false'}>
      <div class="board__rail live__rail" role="group" aria-label="Live demonstration status">
        <span class="badge" data-tone="flight">
          live · real services
        </span>
        <ReachBadge label="gateway" status={gatewayReach} />
        <ReachBadge label="cryptopay" status={integrationOf(readiness.value, 'cryptopay')} />
        <ReachBadge
          label="whatsapp"
          status={integrationOf(readiness.value, 'whatsappNotification')}
        />
        <button
          type="button"
          class="control"
          onClick={() => {
            void checkReach();
          }}
        >
          Check reach
        </button>
      </div>

      <form class="live__form" onSubmit={(event) => void create(event)}>
        <details class="live__connection" open={apiKey.value === ''}>
          <summary class="kicker">Gateway connection</summary>
          <div class="live__fields">
            <label class="live__field">
              <span>Gateway URL</span>
              <input
                type="url"
                value={gatewayUrl.value}
                onInput={(event) => {
                  gatewayUrl.value = event.currentTarget.value;
                }}
                required
              />
            </label>
            <label class="live__field">
              <span>API key (payments:write and payments:read)</span>
              <input
                type="password"
                autocomplete="off"
                value={apiKey.value}
                onInput={(event) => {
                  apiKey.value = event.currentTarget.value;
                }}
                placeholder="mpg_test_…"
                required
              />
            </label>
          </div>
          <p class="live__hint">
            Kept in this browser only. The key is issued by the gateway's seed and printed once by{' '}
            <code>node scripts/demo-stack.mjs up</code>.
          </p>
        </details>
        <div class="live__fields">
          <label class="live__field">
            <span>Amount in USDC</span>
            <input
              type="text"
              inputMode="decimal"
              value={amount.value}
              onInput={(event) => {
                amount.value = event.currentTarget.value;
              }}
              required
            />
          </label>
          <label class="live__field">
            <span>WhatsApp number to notify (optional, E.164)</span>
            <input
              type="tel"
              value={phone.value}
              onInput={(event) => {
                phone.value = event.currentTarget.value;
              }}
              placeholder="+5511988887777"
            />
          </label>
          <button type="submit" class="control live__submit" disabled={busy.value}>
            {busy.value ? 'Creating…' : 'Create a payment'}
          </button>
        </div>
        {error.value === undefined ? null : (
          <p class="live__error" role="alert">
            {error.value}
          </p>
        )}
      </form>

      <p class="live__headline" aria-live="polite">
        {reading === undefined
          ? 'Nothing has been created yet. The drawing lights as the gateway records each step.'
          : reading.headline}
      </p>

      <SchematicPair
        systemId="live"
        title="The live flow"
        description="This page, the payment gateway, CryptoPay, a local chain, the WhatsApp Notification Platform and WAHA."
        nodes={liveNodes}
        edges={liveEdges}
        activity={reading?.activity ?? {}}
        activeEdge={reading?.activeEdge}
      />

      {current === undefined ? null : (
        <div class="live__panels">
          <section class="live__panel" aria-labelledby="live-instrument">
            <h3 id="live-instrument" class="kicker">
              Payment {current.id}
            </h3>
            <dl class="live__facts">
              <div>
                <dt>Status</dt>
                <dd>
                  <span class="badge" data-tone={reading?.activity.gateway ?? 'neutral'}>
                    {current.status.replaceAll('_', ' ')}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Amount</dt>
                <dd class="mono">{formatUsdc(current.amountMinor)}</dd>
              </div>
              <div>
                <dt>Captured</dt>
                <dd class="mono">{formatUsdc(current.capturedAmountMinor)}</dd>
              </div>
              <div>
                <dt>Provider</dt>
                <dd class="mono">
                  {current.provider ?? '—'} {current.providerReference ?? ''}
                </dd>
              </div>
              {current.paidAt === undefined ? null : (
                <div>
                  <dt>Paid at</dt>
                  <dd class="mono">{current.paidAt}</dd>
                </div>
              )}
            </dl>
            {instrument === undefined ? null : (
              <div class="live__instrument">
                <img
                  class="live__qr"
                  src={instrument.qrCodeImageDataUri}
                  alt={`QR code for ${formatUsdc(current.amountMinor)} to ${instrument.destinationAddress} on ${instrument.network}`}
                  width={192}
                  height={192}
                />
                <div class="live__destination">
                  <p class="kicker">
                    {instrument.network} · {instrument.asset}
                  </p>
                  <p class="mono live__address">{instrument.destinationAddress}</p>
                  <p class="live__uri mono">{instrument.paymentUri}</p>
                  <div class="live__actions">
                    <a class="control" href={instrument.paymentUri}>
                      Open in a wallet
                    </a>
                    <button
                      type="button"
                      class="control"
                      onClick={() => {
                        void copyUri(instrument.paymentUri);
                      }}
                    >
                      {copied.value ? 'Copied' : 'Copy URI'}
                    </button>
                    {hasWallet ? (
                      <button
                        type="button"
                        class="control"
                        onClick={() => {
                          void pay(instrument.paymentUri);
                        }}
                      >
                        Pay with the browser wallet
                      </button>
                    ) : null}
                  </div>
                  {walletNote.value === undefined ? null : (
                    <p class="live__hint">{walletNote.value}</p>
                  )}
                  <p class="live__hint">
                    The chain is local: pay from a wallet connected to it, or let the gateway's
                    end-to-end test pay as the customer. This page never touches the chain.
                  </p>
                </div>
              </div>
            )}
          </section>
          <section class="live__panel" aria-label="Ledger">
            <LiveLedger lines={reading?.lines ?? []} origin={current.createdAt} />
          </section>
        </div>
      )}
      <noscript>
        <p class="board__noscript">
          The live demonstration needs JavaScript: it creates a payment through the gateway from
          this page and reads it back as it settles.
        </p>
      </noscript>
    </div>
  );
};
