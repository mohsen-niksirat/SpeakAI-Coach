import { Provider } from '../types';
import { cleanApiKey, normalizeBaseUrl, sanitizeProvider } from './providers';
import { toWebSocketUrl } from './voice-client';

export interface KeyTestResult {
  keyPreview: string;
  ok: boolean;
  warning?: boolean;
  latencyMs: number;
  model?: string;
  mode?: 'live-ws' | 'hybrid-rest' | 'realtime' | 'chat';
  messageFa: string;
  messageEn: string;
}

export interface ProviderTestResult {
  providerId: string;
  ok: boolean;
  warning?: boolean;
  results: KeyTestResult[];
}

export function formatKeyPreview(rawKey: string): string {
  const k = cleanApiKey(rawKey);
  if (!k) return '—';
  if (k.length <= 10) return k;
  return `${k.slice(0, 6)}...${k.slice(-4)}`;
}

function stripModelsPrefix(model: string): string {
  return String(model || '').replace(/^models\//, '');
}

async function probeGeminiWebSocket(baseUrl: string, apiKey: string, model: string): Promise<boolean> {
  if (typeof WebSocket === 'undefined') return false;
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        ws.close();
      } catch {
        // ignore close errors
      }
      resolve(ok);
    };

    const wsBase = toWebSocketUrl(baseUrl);
    const url = `${wsBase}/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(apiKey)}`;
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      resolve(false);
      return;
    }

    const timer = setTimeout(() => finish(false), 4500);

    ws.onopen = () => {
      try {
        ws.send(
          JSON.stringify({
            setup: {
              model: `models/${stripModelsPrefix(model)}`,
              generationConfig: {
                responseModalities: ['AUDIO'],
              },
            },
          }),
        );
      } catch {
        finish(false);
      }
    };

    ws.onmessage = async (event) => {
      try {
        let text = '';
        if (typeof event.data === 'string') {
          text = event.data;
        } else if (typeof Blob !== 'undefined' && event.data instanceof Blob) {
          text = await event.data.text();
        } else if (event.data instanceof ArrayBuffer) {
          text = new TextDecoder().decode(event.data);
        } else if (ArrayBuffer.isView(event.data)) {
          text = new TextDecoder().decode(event.data);
        }
        if (text.includes('setupComplete')) {
          finish(true);
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => finish(false);
    ws.onclose = () => finish(false);
  });
}

async function testGeminiKey(provider: Provider, apiKey: string): Promise<KeyTestResult> {
  const start = Date.now();
  const keyPreview = formatKeyPreview(apiKey);

  if (!/^AIza[0-9A-Za-z_-]{10,}/.test(apiKey)) {
    return {
      keyPreview,
      ok: false,
      latencyMs: Date.now() - start,
      messageFa: `❌ فرمت کلید («${keyPreview}») معتبر نیست؛ کلید Google AI Studio باید با AIzaSy شروع شود.`,
      messageEn: `❌ Invalid key format ("${keyPreview}"); Google AI Studio keys must start with AIzaSy.`,
    };
  }

  const rawBase = normalizeBaseUrl(provider.baseUrl || 'https://generativelanguage.googleapis.com');
  const base = /api\.openai\.com|groq\.com|openrouter\.ai/i.test(rawBase)
    ? 'https://generativelanguage.googleapis.com'
    : rawBase;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  let res: Response;
  try {
    res = await fetch(`${base}/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=200`, {
      signal: ctrl.signal,
    });
  } catch {
    clearTimeout(timer);
    return {
      keyPreview,
      ok: false,
      latencyMs: Date.now() - start,
      messageFa: `❌ عدم دسترسی به سرور گوگل (${base}). اینترنت یا فیلترشکن خود را بررسی کنید.`,
      messageEn: `❌ Cannot reach Google API (${base}). Check your network or VPN.`,
    };
  } finally {
    clearTimeout(timer);
  }

  const latencyMs = Date.now() - start;

  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      errMsg = body?.error?.message || errMsg;
    } catch {
      // ignore json parse error
    }

    if (/User location is not supported/i.test(errMsg)) {
      return {
        keyPreview,
        ok: false,
        latencyMs,
        messageFa:
          '❌ خطای موقعیت جغرافیایی (User location is not supported): فیلترشکن شما دامنه googleapis.com را دور می‌زند (Split-Tunneling) یا سرور فعلی فیلترشکن برای API گوگل مسدود است. حالت Routing فیلترشکن را روی Global بگذارید یا سرور را تغییر دهید.',
        messageEn:
          '❌ User location is not supported: Your VPN is bypassing googleapis.com (Split-Tunneling) or its IP is blocked by Google API. Set VPN routing to Global or switch servers.',
      };
    }

    if (res.status === 429 || /quota|rate.?limit/i.test(errMsg)) {
      return {
        keyPreview,
        ok: false,
        warning: true,
        latencyMs,
        messageFa: `⚠️ کلید معتبر است اما سقف مصرف لحظه‌ای/روزانه آن پر شده است (429): ${errMsg}`,
        messageEn: `⚠️ Key is valid but currently rate-limited / quota exhausted (429): ${errMsg}`,
      };
    }

    return {
      keyPreview,
      ok: false,
      latencyMs,
      messageFa: `❌ کلید توسط سرور گوگل رد شد (${res.status}): ${errMsg}`,
      messageEn: `❌ Key rejected by Google (${res.status}): ${errMsg}`,
    };
  }

  let targetModel = stripModelsPrefix(provider.model || 'gemini-2.5-flash-native-audio-latest');
  try {
    const data = await res.json();
    const models: Array<{ name: string; methods: string[] }> = (data?.models ?? []).map((m: any) => ({
      name: stripModelsPrefix(m?.name || ''),
      methods: m?.supportedGenerationMethods ?? [],
    }));
    const bidi = models.filter((m) => m.methods.includes('bidiGenerateContent')).map((m) => m.name);
    if (provider.kind === 'gemini-live' && bidi.length > 0 && !bidi.includes(targetModel)) {
      targetModel = bidi[0];
    }
  } catch {
    // keep configured model
  }

  if (provider.kind === 'gemini-live') {
    const wsOk = await probeGeminiWebSocket(base, apiKey, targetModel);
    const totalMs = Date.now() - start;
    if (wsOk) {
      return {
        keyPreview,
        ok: true,
        latencyMs: totalMs,
        model: targetModel,
        mode: 'live-ws',
        messageFa: `✅ اتصال عالی (${totalMs}ms) — کلید جمینای و WebSocket صدای زنده دوطرفه (${targetModel}) کاملاً برقرار است.`,
        messageEn: `✅ Connected (${totalMs}ms) — Gemini key & Live Audio WebSocket (${targetModel}) verified.`,
      };
    }
    return {
      keyPreview,
      ok: true,
      warning: true,
      latencyMs: totalMs,
      model: provider.reportModel || 'gemini-2.5-flash',
      mode: 'hybrid-rest',
      messageFa: `✅ کلید جمینای سالم است (${latencyMs}ms)، اما اینترنت/VPN فعلی WebSocket را محدود کرده است — مکالمه به‌صورت خودکار با حالت صوتی هیبرید جمینای انجام خواهد شد.`,
      messageEn: `✅ Gemini key is valid (${latencyMs}ms), but WebSocket is restricted by your network/VPN — sessions will automatically use Gemini Hybrid Voice mode.`,
    };
  }

  return {
    keyPreview,
    ok: true,
    latencyMs,
    model: targetModel,
    mode: 'hybrid-rest',
    messageFa: `✅ اتصال برقرار است (${latencyMs}ms) — کلید جمینای روی حالت هیبرید (${targetModel}) آماده استفاده است.`,
    messageEn: `✅ Connected (${latencyMs}ms) — Gemini Hybrid Voice (${targetModel}) is ready.`,
  };
}

async function testOpenAICompatibleKey(provider: Provider, apiKey: string): Promise<KeyTestResult> {
  const start = Date.now();
  const keyPreview = formatKeyPreview(apiKey);
  const base = normalizeBaseUrl(provider.baseUrl) || 'https://api.openai.com/v1';
  const isOpenRouter = /openrouter\.ai/i.test(base);
  const isGroq = /groq\.com/i.test(base);

  const primaryModel =
    provider.model ||
    (isGroq ? 'llama-3.3-70b-versatile' : isOpenRouter ? 'openrouter/free' : 'gpt-4o-mini');

  const candidateModels = isOpenRouter
    ? Array.from(new Set([primaryModel, 'openrouter/free', 'meta-llama/llama-3.3-70b-instruct']))
    : isGroq
    ? Array.from(new Set([primaryModel, 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant']))
    : [primaryModel];

  // For OpenAI Realtime, test /v1/models first since gpt-realtime is a WebSocket model
  if (provider.kind === 'openai-realtime') {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(`${base}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      const latencyMs = Date.now() - start;
      if (res.ok) {
        return {
          keyPreview,
          ok: true,
          latencyMs,
          model: provider.model || 'gpt-realtime',
          mode: 'realtime',
          messageFa: `✅ کلید OpenAI معتبر است (${latencyMs}ms) — مدل ${provider.model || 'gpt-realtime'} آماده اتصال است.`,
          messageEn: `✅ OpenAI key verified (${latencyMs}ms) — ${provider.model || 'gpt-realtime'} ready.`,
        };
      }
      const body = await res.json().catch(() => null);
      const errMsg = body?.error?.message || `HTTP ${res.status}`;
      return {
        keyPreview,
        ok: false,
        latencyMs,
        messageFa: `❌ خطای کلید OpenAI (${res.status}): ${errMsg}`,
        messageEn: `❌ OpenAI key error (${res.status}): ${errMsg}`,
      };
    } catch {
      clearTimeout(timer);
      return {
        keyPreview,
        ok: false,
        latencyMs: Date.now() - start,
        messageFa: `❌ عدم دسترسی به سرور ${base}. وضعیت اینترنت یا فیلترشکن را بررسی کنید.`,
        messageEn: `❌ Cannot reach ${base}. Check your internet or VPN connection.`,
      };
    }
  }

  let lastStatus = 500;
  let lastErrMsg = '';

  for (const model of candidateModels) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      };
      if (isOpenRouter && typeof window !== 'undefined') {
        headers['HTTP-Referer'] = window.location.origin || 'https://mohsen-niksirat.github.io';
        headers['X-Title'] = 'SpeakAI Coach';
      }

      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          max_tokens: 5,
          temperature: 0,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      const latencyMs = Date.now() - start;

      if (res.ok) {
        return {
          keyPreview,
          ok: true,
          latencyMs,
          model,
          mode: 'chat',
          messageFa: `✅ اتصال برقرار است (${latencyMs}ms) — پاسخ تست از مدل «${model}» با موفقیت دریافت شد.`,
          messageEn: `✅ Connected (${latencyMs}ms) — Test response received from "${model}".`,
        };
      }

      lastStatus = res.status;
      const body = await res.json().catch(() => null);
      lastErrMsg = body?.error?.message || `HTTP ${res.status}`;

      if (res.status === 401 || res.status === 403 || /invalid.*api.*key|unauthorized/i.test(lastErrMsg)) {
        return {
          keyPreview,
          ok: false,
          latencyMs,
          messageFa: `❌ کلید نامعتبر است (${res.status}): ${lastErrMsg}`,
          messageEn: `❌ Invalid API key (${res.status}): ${lastErrMsg}`,
        };
      }

      if (res.status === 402 || /insufficient_quota|credit|balance/i.test(lastErrMsg)) {
        return {
          keyPreview,
          ok: false,
          latencyMs,
          messageFa: `❌ اعتبار دلاری این اکانت تمام شده است (${res.status}): ${lastErrMsg}`,
          messageEn: `❌ Insufficient account balance/quota (${res.status}): ${lastErrMsg}`,
        };
      }

      if (res.status === 429) {
        return {
          keyPreview,
          ok: true,
          warning: true,
          latencyMs,
          model,
          messageFa: `⚠️ کلید سالم است اما در حال حاضر محدودیت سرعت لحظه‌ای (Rate Limit 429) دارد؛ چند ثانیه دیگر امتحان کنید.`,
          messageEn: `⚠️ Key is valid but hit a temporary rate limit (429); wait a few seconds.`,
        };
      }
    } catch {
      clearTimeout(timer);
      return {
        keyPreview,
        ok: false,
        latencyMs: Date.now() - start,
        messageFa: `❌ عدم دسترسی به سرور ${base}. اینترنت یا فیلترشکن خود را بررسی کنید.`,
        messageEn: `❌ Cannot reach ${base}. Check your internet or VPN.`,
      };
    }
  }

  const latencyMs = Date.now() - start;
  return {
    keyPreview,
    ok: false,
    latencyMs,
    messageFa: `❌ خطا از سرور (${lastStatus}): ${lastErrMsg}`,
    messageEn: `❌ Provider error (${lastStatus}): ${lastErrMsg}`,
  };
}

export async function testSingleKey(rawProvider: Provider, rawKey: string): Promise<KeyTestResult> {
  const key = cleanApiKey(rawKey);
  if (!key) {
    return {
      keyPreview: '—',
      ok: false,
      latencyMs: 0,
      messageFa: '❌ کلیدی وارد نشده است.',
      messageEn: '❌ No API key provided.',
    };
  }
  const provider = sanitizeProvider({ ...rawProvider, keys: [key], keyIndex: 0 });
  const isGemini =
    provider.kind === 'gemini-live' ||
    /generativelanguage\.googleapis\.com/i.test(provider.baseUrl) ||
    /^AIza[0-9A-Za-z_-]{10,}/.test(key);

  if (isGemini) {
    return testGeminiKey(provider, key);
  }
  return testOpenAICompatibleKey(provider, key);
}

export async function testProviderConnection(rawProvider: Provider): Promise<ProviderTestResult> {
  const provider = sanitizeProvider(rawProvider);
  const keys = (provider.keys || []).map(cleanApiKey).filter(Boolean);
  if (keys.length === 0) {
    return {
      providerId: provider.id,
      ok: false,
      results: [
        {
          keyPreview: '—',
          ok: false,
          latencyMs: 0,
          messageFa: '❌ هیچ کلیدی برای این سرویس ثبت نشده است.',
          messageEn: '❌ No API keys configured for this provider.',
        },
      ],
    };
  }

  const results: KeyTestResult[] = [];
  for (const key of keys) {
    const res = await testSingleKey(provider, key);
    results.push(res);
  }

  const anyOk = results.some((r) => r.ok);
  const anyWarning = results.some((r) => r.warning);

  return {
    providerId: provider.id,
    ok: anyOk,
    warning: anyWarning,
    results,
  };
}
