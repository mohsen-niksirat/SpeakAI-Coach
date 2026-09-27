import { CoachRole, VoiceName, Provider } from '../types';
import { VoiceClient, VoiceClientCallbacks, getRolePrompt, TOOL_DECLARATIONS, handleToolCall } from './voice-client';

function geminiType(value: string): string {
  return value === 'object' ? 'OBJECT' : value === 'string' ? 'STRING' : value;
}

function toGeminiTool(decl: (typeof TOOL_DECLARATIONS)[number]) {
  const params = decl.parameters as unknown as {
    type: string;
    properties: Record<string, { type: string; enum?: string[]; description?: string }>;
    required: string[];
  };
  return {
    name: decl.name,
    description: decl.description,
    parameters: {
      type: geminiType(params.type),
      properties: Object.fromEntries(
        Object.entries(params.properties).map(([key, prop]) => [
          key,
          {
            type: geminiType(prop.type),
            ...(prop.enum ? { enum: prop.enum } : {}),
            ...(prop.description ? { description: prop.description } : {}),
          },
        ]),
      ),
      required: params.required,
    },
  };
}

export class GeminiLiveClient implements VoiceClient {
  private ws: WebSocket | null = null;
  private callbacks: VoiceClientCallbacks;
  private provider: Provider;
  private apiKey: string;
  private role: CoachRole;
  private voice: VoiceName;

  constructor(callbacks: VoiceClientCallbacks, provider: Provider, apiKey: string, role: CoachRole, voice: VoiceName) {
    this.callbacks = callbacks;
    this.provider = provider;
    this.apiKey = apiKey;
    this.role = role;
    this.voice = voice;
  }

  connect() {
    const base = this.provider.baseUrl || 'https://generativelanguage.googleapis.com';
    const url = `${base}/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.sendSetup();
    };

    this.ws.onmessage = (event) => {
      this.handleServerMessage(event.data);
    };

    this.ws.onerror = () => {
      this.callbacks.onError('WebSocket connection error. Check your API key, base URL and network.');
    };

    this.ws.onclose = (event) => {
      this.callbacks.onClose(event.code);
    };
  }

  private sendSetup() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const setupPayload = {
      setup: {
        model: this.provider.model.startsWith('models/') ? this.provider.model : `models/${this.provider.model}`,
        generationConfig: {
          responseModalities: ['audio'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: this.voice,
              },
            },
          },
        },
        systemInstruction: {
          parts: [{ text: getRolePrompt(this.role) }],
        },
        inputAudioTranscription: { languageCodes: ['en'] },
        outputAudioTranscription: { languageCodes: ['en'] },
        tools: [
          {
            functionDeclarations: TOOL_DECLARATIONS.map(toGeminiTool),
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
          const result = handleToolCall(call.name, call.args || {});
          if (result?.card) this.callbacks.onVocabDiscovered(result.card);
          if (result?.feedback) this.callbacks.onFeedbackGiven(result.feedback);
          functionResponses.push({
            name: call.name,
            id: call.id,
            response: {
              result: result?.card
                ? 'Saved to student flashcards.'
                : result?.feedback
                  ? 'Logged for feedback report.'
                  : 'Unknown tool.',
            },
          });
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
      ws.onerror = null;
      ws.close();
    }
  }
}
