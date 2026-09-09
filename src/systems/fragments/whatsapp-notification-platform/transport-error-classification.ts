export function classifyTransportError(error: unknown, wasAborted: boolean): ProviderFailure {
  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message : 'The provider request failed.';

  if (wasAborted) {
    return createProviderFailure('provider_aborted', message);
  }
  if (ABORT_ERROR_NAMES.has(name)) {
    return createProviderFailure('provider_timeout', message);
  }

  const systemCode = readSystemErrorCode(error);
  if (systemCode !== undefined && PRE_CONNECTION_ERROR_CODES.has(systemCode)) {
    return createProviderFailure('provider_unreachable', message);
  }
  return createProviderFailure('provider_connection_lost', message);
