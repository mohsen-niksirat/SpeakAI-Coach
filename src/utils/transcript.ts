import { TranscriptEntry, TranscriptRole } from '../types';

function newEntryId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// Appends a transcript chunk: consecutive chunks of the same open role are
// merged into one entry; a finished entry (or a role switch) starts a new one.
export function mergeTranscript(
  entries: TranscriptEntry[],
  role: TranscriptRole,
  text: string,
  finished: boolean,
): TranscriptEntry[] {
  const last = entries[entries.length - 1];
  if (last && last.role === role && !last.done) {
    return [...entries.slice(0, -1), { ...last, text: last.text + text, done: finished || last.done }];
  }
  return [...entries, { id: newEntryId(), role, text, done: finished }];
}
