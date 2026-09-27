# SpeakAI Coach

Real-time AI speaking coach for IELTS and everyday English practice. Talk with a Gemini-powered coach over low-latency WebSocket audio, get live grammar corrections and vocabulary capture, and receive an AI-evaluated band report at the end of every session.

## Features

- **Ultra-low-latency speech-to-speech** — Gemini Live API over a bidirectional WebSocket; audio streams as raw PCM (16 kHz in, 24 kHz out), no STT → LLM → TTS pipeline.
- **Natural barge-in** — interrupt the coach at any moment; playback stops instantly.
- **Coach personas** — IELTS examiner, friendly native speaker, tech interviewer, debate partner.
- **Live coaching tools** — vocabulary cards and grammar corrections are logged mid-conversation via function calling, without breaking the flow.
- **Live transcript** — the full conversation is transcribed in real time.
- **Session report** — after each session Gemini evaluates the transcript against the four IELTS criteria (Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation) and returns an overall band with strengths and focus areas.
- **Leitner-ready export** — vocabulary deck exports to CSV, JSON, or Anki text; the deck persists in your browser between sessions.
- **BYOK & client-first** — your Gemini API key stays in browser localStorage; no backend, no accounts.

## Getting started

```bash
npm install
npm run dev
```

Open the app, click **Settings**, paste a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey), pick a persona and voice, then start a session. Microphone permission is required.

Production build:

```bash
npm run build
```

## Stack

Vite · React 18 · TypeScript · Tailwind CSS · Gemini Live WebSocket API

## Roadmap status

| Phase | Status |
|---|---|
| 1. Scaffolding & core UI | ✅ done |
| 2. Audio engine & live WebSocket | ✅ done |
| 3. Function calling & live feedback | ✅ done |
| 4. Session analytics & Leitner export | ✅ done |
| 5. Telegram Mini App integration | ⏳ planned |
