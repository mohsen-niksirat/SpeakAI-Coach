import { CoachRole, VoiceName, VocabCard, FeedbackLog, TranscriptRole } from '../types';

const LIVE_MODEL = 'gemini-live-2.5-flash-preview';

interface ClientCallbacks {
  onSetupComplete: () => void;
  onAudioData: (base64Pcm: string) => void;
  onInterrupted: () => void;
  onTranscript: (role: TranscriptRole, text: string, finished: boolean) => void;
  onVocabDiscovered: (card: VocabCard) => void;
  onFeedbackGiven: (feedback: FeedbackLog) => void;
  onError: (err: string) => void;
  onClose: (code: number) => void;
}

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private callbacks: ClientCallbacks;

  constructor(callbacks: ClientCallbacks) {
    this.callbacks = callbacks;
  }

  private getRolePrompt(role: CoachRole): string {
    switch (role) {
      case 'ielts_examiner':
        return `You are a certified, friendly yet rigorous IELTS Speaking Examiner.
Conduct a realistic IELTS Speaking interview (Part 1, Part 2, or Part 3).
Speak naturally, ask one question at a time, and do not make speech turns too long.
Keep the conversation engaging. Silently invoke 'record_vocabulary' when using or observing high-band words,
and 'flag_grammar_mistake' whenever the candidate makes a grammatical or collocation error.`;
      case 'job_interview':
        return `You are an experienced HR and Technical Interviewer at an international tech company.
Conduct a professional English behavioral and technical interview. Keep questions focused and realistic.
Record new vocabulary and grammar flaws silently via tools.`;
      case 'debate_partner':
        return `You are an articulate, respectful debate sparring partner.
Choose or discuss controversial yet friendly topics, challenge the user's opinions constructively,
and prompt them to defend their thoughts with high-level vocabulary.`;
      case 'friendly_chat':
      default:
        return `You are a kind, engaging native English friend named Alex.
Have a warm, everyday conversation about hobbies, culture, daily life, or technology.
Keep sentences natural, concise, and encourage the user to speak more.`;
    }
  }

  connect(apiKey: string, role: CoachRole, voice: VoiceName) {
    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.sendSetup(role, voice);
    };

    this.ws.onmessage = (event) => {
      this.handleServerMessage(event.data);
    };

    this.ws.onerror = () => {
      this.callbacks.onError('WebSocket connection error. Check your API key and network.');
    };

    this.ws.onclose = (event) => {
      this.callbacks.onClose(event.code);
    };
  }

  private sendSetup(role: CoachRole, voice: VoiceName) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const setupPayload = {
      setup: {
        model: `models/${LIVE_MODEL}`,
        generationConfig: {
          responseModalities: ['audio'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice,
              },
            },
          },
        },
        systemInstruction: {
          parts: [{ text: this.getRolePrompt(role) }],
        },
        inputAudioTranscription: { languageCodes: ['en'] },
        outputAudioTranscription: { languageCodes: ['en'] },
        tools: [
          {
            functionDeclarations: [
              {
                name: 'record_vocabulary',
                description: 'Record an advanced, noteworthy, or misused vocabulary word into the student Leitner flashcard deck.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    word: { type: 'STRING', description: 'The base word or idiom' },
                    phonetic: { type: 'STRING', description: 'IPA pronunciation guide' },
                    definition: { type: 'STRING', description: 'Short English definition' },
                    contextSentence: { type: 'STRING', description: 'Example sentence in conversational context' },
                  },
                  required: ['word', 'definition', 'contextSentence'],
                },
              },
              {
                name: 'flag_grammar_mistake',
                description: 'Log a grammar, tense, or collocation mistake made by the user silently for live feedback.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    userSpoke: { type: 'STRING', description: 'What the user actually said' },
                    betterAlternative: { type: 'STRING', description: 'How a native speaker would say it correctly' },
                    explanation: { type: 'STRING', description: 'Brief explanation of the rule violated' },
                    type: { type: 'STRING', enum: ['grammar', 'vocabulary', 'pronunciation'] },
                  },
                  required: ['userSpoke', 'betterAlternative', 'explanation', 'type'],
                },
              },
            ],
          },
        ],
      },
    };

    this.ws.send(JSON.stringify(setupPayload));
  }

  sendAudioChunk(base64Pcm16: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const realtimeInput = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'audio/pcm;rate=16000',
            data: base64Pcm16,
          },
        ],
      },
    };

    this.ws.send(JSON.stringify(realtimeInput));
  }

  private handleServerMessage(data: string) {
    try {
      const msg = JSON.parse(data);

      if (msg.setupComplete) {
        this.callbacks.onSetupComplete();
        return;
      }

      if (msg.serverContent?.modelTurn?.parts) {
        for (const part of msg.serverContent.modelTurn.parts) {
          if (part.inlineData?.data) {
            this.callbacks.onAudioData(part.inlineData.data);
          }
        }
      }

      const inputT = msg.serverContent?.inputTranscription;
      if (inputT?.text) {
        this.callbacks.onTranscript('user', inputT.text, !!inputT.finished);
      }

      const outputT = msg.serverContent?.outputTranscription;
      if (outputT?.text) {
        this.callbacks.onTranscript('model', outputT.text, !!outputT.finished);
      }

      if (msg.serverContent?.interrupted) {
        this.callbacks.onInterrupted();
      }

      if (msg.toolCall?.functionCalls) {
        const functionResponses = [];

        for (const call of msg.toolCall.functionCalls) {
          if (call.name === 'record_vocabulary') {
            const card: VocabCard = {
              id: Math.random().toString(36).substring(7),
              word: call.args.word,
              phonetic: call.args.phonetic || '',
              definition: call.args.definition,
              contextSentence: call.args.contextSentence,
              timestamp: new Date().toLocaleTimeString(),
            };
            this.callbacks.onVocabDiscovered(card);
            functionResponses.push({
              name: call.name,
              id: call.id,
              response: { result: 'Saved to student flashcards.' },
            });
          } else if (call.name === 'flag_grammar_mistake') {
            const feedback: FeedbackLog = {
              id: Math.random().toString(36).substring(7),
              userSpoke: call.args.userSpoke,
              betterAlternative: call.args.betterAlternative,
              explanation: call.args.explanation,
              type: call.args.type || 'grammar',
              timestamp: new Date().toLocaleTimeString(),
            };
            this.callbacks.onFeedbackGiven(feedback);
            functionResponses.push({
              name: call.name,
              id: call.id,
              response: { result: 'Logged for feedback report.' },
            });
          }
        }

        if (functionResponses.length > 0) {
          this.ws?.send(
            JSON.stringify({
              toolResponse: {
                functionResponses,
              },
            })
          );
        }
      }
    } catch (err) {
      console.error('Error parsing live WS payload:', err);
    }
  }

  disconnect() {
    if (this.ws) {
      const ws = this.ws;
      this.ws = null;
      ws.onclose = null;
      ws.close();
    }
  }
}
