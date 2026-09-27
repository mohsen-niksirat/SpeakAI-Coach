export type ProviderErrorKind =
  | 'invalid_key'
  | 'rate_limited'
  | 'model_unavailable'
  | 'network'
  | 'setup_rejected'
  | 'unknown';

export class ProviderError extends Error {
  readonly kind: ProviderErrorKind;

  constructor(kind: ProviderErrorKind, message: string) {
    super(message);
    this.name = 'ProviderError';
    this.kind = kind;
  }
}

export function asProviderError(err: unknown, fallbackMessage: string): ProviderError {
  if (err instanceof ProviderError) return err;
  if (err instanceof Error && err.message) return new ProviderError('unknown', err.message);
  return new ProviderError('unknown', fallbackMessage);
}

// Failures where trying another key can plausibly help.
export function isRotatable(kind: ProviderErrorKind): boolean {
  return (
    kind === 'invalid_key' || kind === 'rate_limited' || kind === 'model_unavailable' || kind === 'unknown'
  );
}

// Reconnect policy after the session was already established.
export function shouldRotateOnReconnect(kind: ProviderErrorKind): boolean {
  // A network drop says nothing about the key — retry the same one.
  return kind !== 'network';
}

export function classifyHttpStatus(status: number, message = ''): ProviderErrorKind {
  if (status === 401 || status === 403 || /api key|unauthorized|permission denied/i.test(message)) {
    return 'invalid_key';
  }
  if (status === 429 || /rate limit|quota/i.test(message)) return 'rate_limited';
  if (status === 404 || /model.*not.*found|not supported/i.test(message)) return 'model_unavailable';
  return 'unknown';
}

export function classifyCloseCode(code: number, reason = ''): ProviderErrorKind {
  if (/not found|not supported for bidi|unknown model|does not exist/i.test(reason)) {
    return 'model_unavailable';
  }
  if (code === 1008) return 'setup_rejected';
  if (code === 1006 || code === 1002 || code === 1015) return 'network';
  return 'unknown';
}
