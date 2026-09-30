import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseReport, heuristicBand, generateSessionReport } from './session-report';
import { Provider } from '../types';

const valid = {
  overallBand: 6.5,
  criteria: [
    { key: 'fluency', band: 6.5, comment: 'Smooth with minor hesitations.' },
    { key: 'lexical', band: 6, comment: 'Adequate range.' },
    { key: 'grammar', band: 6.5, comment: 'Good control.' },
    { key: 'pronunciation', band: 7, comment: 'Clear overall.' },
  ],
  strengths: ['Fluent delivery'],
  improvements: ['Wider vocabulary'],
};

describe('parseReport', () => {
  it('parses a valid report', () => {
    const report = parseReport(JSON.stringify(valid));
    expect(report.overallBand).toBe(6.5);
    expect(report.criteria).toHaveLength(4);
    expect(report.criteria[0].label).toBe('Fluency & Coherence');
    expect(report.strengths).toEqual(['Fluent delivery']);
  });

  it('strips markdown fences', () => {
    const report = parseReport('```json\n' + JSON.stringify(valid) + '\n```');
    expect(report.overallBand).toBe(6.5);
  });

  it('throws on incomplete JSON (missing criteria)', () => {
    expect(() => parseReport('{"overallBand": 6.5, "criteria": []}')).toThrow();
    expect(() => parseReport('not json at all')).toThrow();
  });

  it('drops unknown criteria keys and keeps known ones', () => {
    const messy = {
      ...valid,
      criteria: [...valid.criteria, { key: 'vibe', band: 9, comment: 'nice' }],
    };
    const report = parseReport(JSON.stringify(messy));
    expect(report.criteria).toHaveLength(4);
    expect(report.criteria.map((c) => String(c.key))).not.toContain('vibe');
  });

  it('rounds bands to the nearest 0.5', () => {
    const odd = JSON.stringify({ ...valid, overallBand: 6.24 });
    expect(parseReport(odd).overallBand).toBe(6);
  });
});

describe('heuristicBand', () => {
  it('rises with vocabulary and falls with corrections', () => {
    expect(heuristicBand(0, 0)).toBeCloseTo(7.5);
    expect(heuristicBand(5, 0)).toBeCloseTo(6.5);
    expect(heuristicBand(0, 5)).toBeCloseTo(8);
  });

  it('clamps to the 5.5–8.5 range', () => {
    expect(heuristicBand(100, 0)).toBe(5.5);
    expect(heuristicBand(0, 100)).toBe(8.5);
  });
});

describe('generateSessionReport key rotation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rotates to the next key when the first key fails with a network error or 403', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify(valid) } }],
          }),
          { status: 200 },
        ),
      );

    const provider: Provider = {
      id: 'p1',
      name: 'Test OpenAI',
      kind: 'openai-chat',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      keys: ['bad-key-1', 'good-key-2'],
      keyIndex: 0,
    };

    const result = await generateSessionReport(provider, 'Speaker: Hello', []);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.usedKeyIndex).toBe(1);
    expect(result.report.overallBand).toBe(6.5);
  });
});
