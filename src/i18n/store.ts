import { useSyncExternalStore } from 'react';
import { en, fa, TranslationKey } from './dictionaries';

export type Lang = 'en' | 'fa';

const STORAGE_KEY = 'speakai_lang';
const listeners = new Set<() => void>();

function readInitialLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'fa' || stored === 'en') return stored;
  } catch {
    // storage unavailable
  }
  return 'en';
}

let lang: Lang = readInitialLang();

function applyHtml() {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
}
applyHtml();

function emit() {
  for (const fn of listeners) fn();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getLang(): Lang {
  return lang;
}

export function setLang(next: Lang): void {
  if (next === lang) return;
  lang = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // storage unavailable
  }
  applyHtml();
  emit();
}

export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  const dict = (lang === 'fa' ? fa : en) as Record<string, string>;
  let text = dict[key] ?? (en as Record<string, string>)[key] ?? key;
  if (params) {
    text = text.replace(/\{(\w+)\}/g, (match, name) =>
      name in params ? String(params[name]) : match,
    );
  }
  return text;
}

// Reactive translation hook: components re-render on language change.
export function useT(): typeof t {
  useSyncExternalStore(subscribe, getLang, getLang);
  return t;
}

export function useLang(): [Lang, (next: Lang) => void] {
  const current = useSyncExternalStore(subscribe, getLang, getLang);
  return [current, setLang];
}
