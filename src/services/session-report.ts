import { FeedbackLog, SessionReport, CriterionScore } from '../types';

const REPORT_MODEL = 'gemini-flash-latest';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

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

function parseReport(text: string): SessionReport {
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

export async function generateSessionReport(
  apiKey: string,
  transcriptText: string,
  corrections: FeedbackLog[],
): Promise<SessionReport> {
  const correctionList =
    corrections
      .map((c) => `- [${c.type}] said "${c.userSpoke}" → "${c.betterAlternative}" (${c.explanation})`)
      .join('\n') || '(none recorded)';

  const prompt = `You are a senior IELTS Speaking examiner producing a post-session report.

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

  const res = await fetch(`${API_BASE}/${REPORT_MODEL}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Report request failed with status ${res.status}`);
  }

  const data = await res.json();
  const text: string =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text || '')
      .join('') || '';

  if (!text) throw new Error('Report response was empty');
  return parseReport(text);
}
