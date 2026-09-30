import { FeedbackLog, SessionReport, CriterionScore, Provider } from '../types';
import { cleanApiKey, isGoogleApiKey, normalizeBaseUrl } from './providers';

export function heuristicBand(corrections: number, vocab: number): number {
  return Math.max(5.5, Math.min(8.5, 7.5 - corrections * 0.2 + vocab * 0.1));
}

const CRITERIA_LABELS: Record<CriterionScore['key'], string> = {
  fluency: 'Fluency & Coherence',
  lexical: 'Lexical Resource',
  grammar: 'Grammatical Range & Accuracy',
  pronunciation: 'Pronunciation',
};

function roundBand(value: number): number {
  return Math.min(9, Math.max(0, Math.round(value * 2) / 2));
}

export function parseReport(text: string): SessionReport {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const data = JSON.parse(cleaned);

  const criteria: CriterionScore[] = (Array.isArray(data.criteria) ? data.criteria : [])
    .filter((c: { key?: string }) => CRITERIA_LABELS[c.key as CriterionScore['key']])
    .map((c: { key: CriterionScore['key']; band: number; comment?: string }) => ({
      key: c.key,
      label: CRITERIA_LABELS[c.key],
      band: roundBand(Number(c.band)),
      comment: String(c.comment || ''),
    }));

  if (criteria.length !== 4 || typeof data.overallBand !== 'number') {
    throw new Error('Report JSON is missing required fields');
  }

  return {
    overallBand: roundBand(Number(data.overallBand)),
    criteria,
    strengths: Array.isArray(data.strengths) ? data.strengths.map(String).slice(0, 5) : [],
    improvements: Array.isArray(data.improvements) ? data.improvements.map(String).slice(0, 5) : [],
  };
}

function buildPrompt(transcriptText: string, corrections: FeedbackLog[]): string {
  const correctionList =
    corrections
      .map((c) => `- [${c.type}] said "${c.userSpoke}" → "${c.betterAlternative}" (${c.explanation})`)
      .join('\n') || '(none recorded)';

  return `You are a senior IELTS Speaking examiner producing a post-session report.

Evaluate the speaking session below on the four official IELTS criteria:
- fluency: Fluency & Coherence
- lexical: Lexical Resource
- grammar: Grammatical Range & Accuracy
- pronunciation: Pronunciation

Rules:
- Bands use the IELTS 0-9 scale in 0.5 steps.
- Judge from the transcript evidence. For pronunciation, infer conservatively from the transcript (pauses, phrasing) and say in the comment when evidence is limited.
- overallBand is the average of the four criteria rounded to the nearest 0.5.
- Each comment is one short sentence (max 20 words).
- strengths and improvements are 3-5 short bullet strings each.

TRANSCRIPT:
${transcriptText.slice(0, 8000)}

CORRECTIONS LOGGED DURING THE SESSION:
${correctionList}

Respond with ONLY valid JSON in exactly this shape:
{"overallBand": 6.5, "criteria": [{"key": "fluency", "band": 6.5, "comment": "..."}, {"key": "lexical", "band": 6.5, "comment": "..."}, {"key": "grammar", "band": 6.5, "comment": "..."}, {"key": "pronunciation", "band": 6.5, "comment": "..."}], "strengths": ["...", "..."], "improvements": ["...", "..."]}`;
}

class HttpStatusError extends Error {
  status: number;
  constructor(status: number) {
    super(`Report request failed with status ${status}`);
    this.status = status;
  }
}

class ReportNetworkError extends Error {
  constructor(message = 'Report request timed out after 45s.') {
    super(message);
  }
}

function isRetryable(err: unknown): boolean {
  if (err instanceof HttpStatusError) {
    return (
      err.status === 401 ||
      err.status === 403 ||
      err.status === 429 ||
      err.status === 500 ||
      err.status === 502 ||
      err.status === 503
    );
  }
  return err instanceof TypeError || err instanceof ReportNetworkError;
}

async function callGemini(baseUrl: string, model: string, apiKey: string, prompt: string): Promise<string> {
  const base = normalizeBaseUrl(baseUrl) || 'https://generativelanguage.googleapis.com';
  const cleanKey = cleanApiKey(apiKey);
  const safeModel = model.includes('native-audio') ? 'gemini-2.5-flash' : model;
  const payload = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45000);
  let res: Response;
  try {
    const endpointUrl = /aiplatform\.googleapis\.com/i.test(base)
      ? `${base}/v1beta1/publishers/google/models/${safeModel}:generateContent?key=${encodeURIComponent(cleanKey)}`
      : `${base}/v1beta/models/${safeModel}:generateContent?key=${encodeURIComponent(cleanKey)}`;
    res = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      signal: ctrl.signal,
    });
    if (!res.ok && (res.status === 401 || res.status === 403) && /^AQ\./i.test(cleanKey) && !/aiplatform\.googleapis\.com/i.test(base)) {
      const vRes = await fetch(
        `https://aiplatform.googleapis.com/v1beta1/publishers/google/models/${safeModel}:generateContent?key=${encodeURIComponent(cleanKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          signal: ctrl.signal,
        },
      );
      if (vRes.ok) res = vRes;
    }
  } catch {
    throw new ReportNetworkError('Report request timed out after 45s.');
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new HttpStatusError(res.status);
  const data = await res.json();
  return (
    data?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text || '')
      .join('') || ''
  );
}

async function callOpenAIChat(baseUrl: string, model: string, apiKey: string, prompt: string): Promise<string> {
  const base = normalizeBaseUrl(baseUrl) || 'https://api.openai.com/v1';
  const cleanKey = cleanApiKey(apiKey);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45000);
  let res: Response;
  try {
    res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cleanKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'You are an IELTS Speaking examiner. Always answer with valid JSON only.' },
          { role: 'user', content: prompt },
        ],
      }),
      signal: ctrl.signal,
    });
  } catch {
    throw new ReportNetworkError('Report request timed out after 45s.');
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new HttpStatusError(res.status);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

export interface ReportResult {
  report: SessionReport;
  usedKeyIndex: number;
}

// Tries provider keys in rotation order starting from the active one;
// advances past 401/429/5xx so a single exhausted key never blocks the report.
export async function generateSessionReport(
  provider: Provider,
  transcriptText: string,
  corrections: FeedbackLog[],
): Promise<ReportResult> {
  const prompt = buildPrompt(transcriptText, corrections);
  const keys = provider.keys.length > 0 ? provider.keys : [''];
  const model = provider.reportModel?.trim() || provider.model;
  const start = Math.min(Math.max(provider.keyIndex, 0), keys.length - 1);

  let lastError: unknown = null;

  for (let i = 0; i < keys.length; i++) {
    const idx = (start + i) % keys.length;
    const key = cleanApiKey(keys[idx]);
    const useGeminiApi =
      provider.kind === 'gemini-live' ||
      /generativelanguage\.googleapis\.com|aiplatform\.googleapis\.com/i.test(normalizeBaseUrl(provider.baseUrl)) ||
      isGoogleApiKey(key);
    try {
      const text = useGeminiApi
        ? await callGemini(provider.baseUrl, model, key, prompt)
        : await callOpenAIChat(provider.baseUrl, model, key, prompt);

      if (!text) throw new Error('Report response was empty');
      return { report: parseReport(text), usedKeyIndex: idx };
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || i === keys.length - 1) break;
      console.warn(`Report attempt with key #${idx + 1} failed, rotating to next key…`, err);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Report generation failed');
}
