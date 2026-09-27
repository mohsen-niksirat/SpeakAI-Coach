import { describe, it, expect } from 'vitest';
import {
  classifyCloseCode,
  classifyHttpStatus,
  isRotatable,
  shouldRotateOnReconnect,
  ProviderError,
  asProviderError,
} from './errors';

describe('classifyHttpStatus', () => {
  it('maps auth failures to invalid_key', () => {
    expect(classifyHttpStatus(401)).toBe('invalid_key');
    expect(classifyHttpStatus(403)).toBe('invalid_key');
    expect(classifyHttpStatus(400, 'API key not valid')).toBe('invalid_key');
  });

  it('maps 429 to rate_limited', () => {
    expect(classifyHttpStatus(429)).toBe('rate_limited');
    expect(classifyHttpStatus(400, 'quota exceeded, rate limit')).toBe('rate_limited');
  });

  it('maps missing models to model_unavailable', () => {
    expect(classifyHttpStatus(404)).toBe('model_unavailable');
    expect(classifyHttpStatus(400, 'model gemini-x not found')).toBe('model_unavailable');
  });

  it('falls back to unknown', () => {
    expect(classifyHttpStatus(500)).toBe('unknown');
    expect(classifyHttpStatus(418, 'teapot')).toBe('unknown');
  });
});

describe('classifyCloseCode', () => {
  it('detects model errors from the close reason regardless of code', () => {
    expect(
      classifyCloseCode(1008, 'models/x is not found for API version v1beta, or is not supported for bidiGenerateContent'),
    ).toBe('model_unavailable');
  });

  it('treats generic 1008 as setup_rejected', () => {
    expect(classifyCloseCode(1008, 'policy violation')).toBe('setup_rejected');
  });

  it('treats abnormal closures as network', () => {
    expect(classifyCloseCode(1006)).toBe('network');
    expect(classifyCloseCode(1002)).toBe('network');
  });

  it('falls back to unknown', () => {
    expect(classifyCloseCode(1011, 'internal error')).toBe('unknown');
  });
});

describe('rotation policy', () => {
  it('rotates on key-class failures only', () => {
    expect(isRotatable('invalid_key')).toBe(true);
    expect(isRotatable('rate_limited')).toBe(true);
    expect(isRotatable('model_unavailable')).toBe(true);
    expect(isRotatable('unknown')).toBe(true);
    expect(isRotatable('network')).toBe(false);
    expect(isRotatable('setup_rejected')).toBe(false);
  });

  it('never rotates after a network drop, rotates for everything else', () => {
    expect(shouldRotateOnReconnect('network')).toBe(false);
    expect(shouldRotateOnReconnect('rate_limited')).toBe(true);
    expect(shouldRotateOnReconnect('invalid_key')).toBe(true);
    expect(shouldRotateOnReconnect('setup_rejected')).toBe(true);
  });
});

describe('ProviderError', () => {
  it('keeps kind through asProviderError', () => {
    const original = new ProviderError('rate_limited', 'slow down');
    expect(asProviderError(original, 'fallback')).toBe(original);
    expect(asProviderError(new Error('boom'), 'fallback').kind).toBe('unknown');
    expect(asProviderError('plain', 'fallback').message).toBe('fallback');
  });
});
