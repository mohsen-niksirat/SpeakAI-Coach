import { describe, it, expect } from 'vitest';
import { mergeTranscript } from './transcript';
import { TranscriptEntry } from '../types';

describe('mergeTranscript', () => {
  it('creates a new open entry for the first chunk', () => {
    const next = mergeTranscript([], 'user', 'Hello', false);
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ role: 'user', text: 'Hello', done: false });
  });

  it('appends consecutive chunks of the same open role', () => {
    const first = mergeTranscript([], 'user', 'Hello ', false);
    const second = mergeTranscript(first, 'user', 'world', true);
    expect(second).toHaveLength(1);
    expect(second[0].text).toBe('Hello world');
    expect(second[0].done).toBe(true);
  });

  it('starts a new entry when the speaker changes', () => {
    const user: TranscriptEntry[] = mergeTranscript([], 'user', 'Hi', true);
    const both = mergeTranscript(user, 'model', 'Hello there', false);
    expect(both).toHaveLength(2);
    expect(both[1].role).toBe('model');
  });

  it('starts a new entry after the previous one finished', () => {
    const first = mergeTranscript([], 'user', 'one', true);
    const second = mergeTranscript(first, 'user', 'two', true);
    expect(second).toHaveLength(2);
    expect(second[0].text).toBe('one');
    expect(second[1].text).toBe('two');
  });

  it('never mutates the input array', () => {
    const entries = mergeTranscript([], 'user', 'a', false);
    const snapshot = [...entries];
    mergeTranscript(entries, 'user', 'b', true);
    expect(entries).toEqual(snapshot);
  });
});
