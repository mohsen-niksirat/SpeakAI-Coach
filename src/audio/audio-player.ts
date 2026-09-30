export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private scheduledTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  public onVolumeChange: ((volume: number) => void) | null = null;

  constructor() {
    this.initContext();
  }

  private initContext() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 24000,
    });
  }

  playChunk(base64Audio: string) {
    if (!this.audioContext) this.initContext();
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }

    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    let sum = 0;

    for (let i = 0; i < int16Array.length; i++) {
      const val = int16Array[i] / 32768.0;
      float32Array[i] = val;
      sum += val * val;
    }

    if (this.onVolumeChange) {
      const rms = Math.sqrt(sum / float32Array.length);
      this.onVolumeChange(Math.min(1, rms * 5));
    }

    const audioBuffer = this.audioContext!.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = this.audioContext!.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext!.destination);

    const currentTime = this.audioContext!.currentTime;
    if (this.scheduledTime < currentTime) {
      this.scheduledTime = currentTime;
    }

    source.start(this.scheduledTime);
    this.scheduledTime += audioBuffer.duration;
    this.activeSources.push(source);

    source.onended = () => {
      this.activeSources = this.activeSources.filter((s) => s !== source);
      if (this.activeSources.length === 0) {
        this.onVolumeChange?.(0);
      }
    };
  }

  stopAll() {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch (_) {}
    }
    this.activeSources = [];
    if (this.audioContext) {
      this.scheduledTime = this.audioContext.currentTime;
    }
    this.onVolumeChange?.(0);
  }

  close() {
    this.stopAll();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    this.audioContext = null;
  }
}
