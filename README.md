# SpeakAI Coach

**English** | [فارسی](README.fa.md)

Real-time AI speaking coach for IELTS and everyday English practice. Talk with an AI coach over low-latency WebSocket audio, get live grammar corrections and vocabulary capture, and receive an AI-evaluated band report at the end of every session.

Works with **Google Gemini Live**, **OpenAI Realtime**, and any compatible gateway — you bring your own API keys, they never leave your browser.

![SpeakAI Coach settings](screenshot%2001.jpg)

*Configuration: pick a coach persona, separate voice and report providers, and manage multiple API keys per provider.*

## Features

- **Ultra-low-latency speech-to-speech** — Gemini Live or OpenAI Realtime over a bidirectional WebSocket; no STT → LLM → TTS pipeline.
- **Natural barge-in** — interrupt the coach at any moment; playback stops instantly.
- **Custom multi-provider setup** — add any number of providers with name, type, base URL, model, report model, and API keys. Voice provider and report provider can be different (e.g. Gemini for voice, OpenRouter for the report).
- **Key rotation** — attach multiple keys per provider; on connection failures or 429/401 responses the app automatically rotates through your keys, and mid-session drops trigger a bounded auto-reconnect with rotation.
- **Coach personas** — IELTS examiner, friendly native speaker, tech interviewer, debate partner.
- **Live coaching tools** — vocabulary cards and grammar corrections are logged mid-conversation via function calling, without breaking the flow.
- **Live transcript** — the full conversation is transcribed in real time.
- **Session report** — after each session a text model evaluates the transcript against the four IELTS criteria (Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation) and returns an overall band with strengths and focus areas.
- **Leitner-ready export** — vocabulary deck exports to CSV, JSON, or Anki text; the deck persists in your browser between sessions.
- **English & Persian UI** — switch languages from the header; Persian layout is fully RTL.
- **Client-first & BYOK** — no backend, no accounts; all keys live in browser localStorage.

## Try it

A live build is served by GitHub Pages after each push to `main`:

`https://mohsen-niksirat.github.io/SpeakAI-Coach/`

(Enable it once in the repo: **Settings → Pages → Source: GitHub Actions**.)

## Local development

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build in dist/
```

Open **Settings**, add a provider, paste your API key(s), pick a persona and voice, then start a session. Microphone permission is required.

## Provider types

| Type | Voice chat | Session report | Example base URL |
|---|---|---|---|
| Gemini Live | realtime | Gemini `generateContent` | `https://generativelanguage.googleapis.com` |
| OpenAI Realtime | realtime | OpenAI `chat/completions` | `https://api.openai.com/v1` |
| OpenAI-compatible | browser voice (STT → chat → TTS) | `chat/completions` | `https://openrouter.ai/api/v1` |

Notes:

- **Browser voice** makes any text-only provider (OpenRouter, VyceAI, DeepSeek relays, …) usable for speaking practice: your speech is recognized by the browser (Web Speech API), the reply comes from the provider's chat model, and the browser speaks it back. Needs Chrome/Edge and is a bit slower than realtime providers.
- Keys are sent per protocol: Gemini uses `?key=`, Realtime uses OpenAI's browser subprotocol auth plus `?api_key=` for gateways, chat uses `Authorization: Bearer`.
- `Report model` optionally uses a different (cheaper) text model for the end-of-session evaluation.
- Rotation always starts from the active key and advances only on failures, so a healthy key is never skipped.

## Disclaimer

**This is an AI-based practice estimate, not an official IELTS score.** The band report is generated from the session transcript for practice purposes only; IELTS results are issued solely by official test centers. Pronunciation is inferred from the transcript alone and has limited accuracy — a real pronunciation assessment requires audio-level analysis (stress, intonation, phonemes).

## License

Licensed under the [Apache License 2.0](LICENSE) — see [NOTICE](NOTICE).

## Stack

Vite · React 18 · TypeScript · Tailwind CSS · Gemini Live API · OpenAI Realtime API

## Roadmap status

| Phase | Status |
|---|---|
| 1. Scaffolding & core UI | ✅ done |
| 2. Audio engine & live WebSocket | ✅ done |
| 3. Function calling & live feedback | ✅ done |
| 4. Session analytics & Leitner export | ✅ done |
| Multi-provider + key rotation + GitHub Pages | ✅ done |
| 5. Telegram Mini App integration | ⏳ planned |
