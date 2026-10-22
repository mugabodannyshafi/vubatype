"use client";

import { readSoundPreferences, subscribeSoundPreferences, type SoundMode } from "@/lib/sound/preferences";

export type TypingStroke = "hit" | "miss" | "backspace" | "finish";

const SAMPLE_URLS = ["/sounds/key-1.wav", "/sounds/key-2.wav", "/sounds/key-3.wav", "/sounds/key-4.wav"];
const MAX_VOICES = 6;

type Voice = {
  source: AudioBufferSourceNode;
  gain: GainNode;
  released: boolean;
};

type StrokeShape = {
  rate: number;
  gain: number;
};

type AudioContextConstructor = typeof AudioContext;

function createAudioContext(): AudioContext | null {
  const scoped = window as Window & { webkitAudioContext?: AudioContextConstructor };
  const Context = window.AudioContext ?? scoped.webkitAudioContext;
  if (!Context) {
    return null;
  }
  return new Context();
}

function varied(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function shapeFor(stroke: TypingStroke | "finish-b", mode: SoundMode): StrokeShape {
  let rate = 1;
  let gain = 1;

  if (stroke === "hit") {
    rate = varied(0.97, 1.04);
    gain = varied(0.85, 1);
  } else if (stroke === "miss") {
    rate = varied(0.74, 0.82);
    gain = varied(0.45, 0.6);
  } else if (stroke === "backspace") {
    rate = varied(1.05, 1.12);
    gain = varied(0.5, 0.65);
  } else if (stroke === "finish") {
    rate = 1.06;
    gain = 0.72;
  } else {
    rate = 0.84;
    gain = 0.8;
  }

  if (mode === "soft") {
    rate *= 0.94;
    gain *= 0.7;
  }

  return { rate, gain };
}

class TypingSoundEngine {
  private context: AudioContext | null = null;
  private filter: BiquadFilterNode | null = null;
  private master: GainNode | null = null;
  private buffers: AudioBuffer[] = [];
  private voices: Voice[] = [];
  private lastSample = -1;
  private loading: Promise<void> | null = null;
  private unlockPromise: Promise<void> | null = null;
  private queued: TypingStroke | null = null;
  private listening = false;
  private gestureInstalled = false;

  installGestureListener(): void {
    if (this.gestureInstalled || typeof window === "undefined") {
      return;
    }
    this.gestureInstalled = true;

    const onGesture = () => {
      if (readSoundPreferences().mode === "off") {
        return;
      }
      void this.unlock();
    };

    window.addEventListener("pointerdown", onGesture);
    window.addEventListener("keydown", onGesture);
  }

  async unlock(): Promise<void> {
    if (!this.unlockPromise) {
      this.unlockPromise = this.open().catch(() => {
        this.unlockPromise = null;
      });
    }
    await this.unlockPromise;
  }

  play(stroke: TypingStroke): void {
    if (readSoundPreferences().mode === "off") {
      return;
    }

    if (!this.isReady()) {
      this.queued = stroke;
      void this.unlock().then(() => this.flush());
      return;
    }

    this.queued = null;
    this.emit(stroke);
  }

  private async open(): Promise<void> {
    this.ensureGraph();
    if (!this.context) {
      return;
    }
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
    await this.preload();
    this.syncOutput();
  }

  private ensureGraph(): void {
    if (this.context || typeof window === "undefined") {
      return;
    }

    const context = createAudioContext();
    if (!context) {
      return;
    }

    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 18000;
    filter.Q.value = 0.7;

    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 12;
    compressor.ratio.value = 8;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.05;

    const master = context.createGain();
    master.gain.value = readSoundPreferences().volume;

    filter.connect(compressor);
    compressor.connect(master);
    master.connect(context.destination);

    this.context = context;
    this.filter = filter;
    this.master = master;
    this.bindPreferences();
  }

  private bindPreferences(): void {
    if (this.listening) {
      return;
    }
    this.listening = true;
    subscribeSoundPreferences(() => this.syncOutput());
  }

  private syncOutput(): void {
    if (!this.context || !this.filter || !this.master) {
      return;
    }

    const { mode, volume } = readSoundPreferences();
    const now = this.context.currentTime;
    this.master.gain.setTargetAtTime(volume, now, 0.01);
    this.filter.frequency.setTargetAtTime(mode === "soft" ? 1600 : 18000, now, 0.01);
  }

  private async preload(): Promise<void> {
    if (this.buffers.length > 0) {
      return;
    }
    if (this.loading) {
      await this.loading;
      return;
    }

    const context = this.context;
    if (!context) {
      return;
    }

    this.loading = (async () => {
      const decoded = await Promise.all(SAMPLE_URLS.map((url) => this.loadSample(context, url)));
      this.buffers = decoded.filter((buffer): buffer is AudioBuffer => buffer !== null);
    })();

    try {
      await this.loading;
    } finally {
      this.loading = null;
    }
  }

  private async loadSample(context: AudioContext, url: string): Promise<AudioBuffer | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return null;
      }
      const bytes = await response.arrayBuffer();
      return await context.decodeAudioData(bytes.slice(0));
    } catch {
      return null;
    }
  }

  private isReady(): boolean {
    return this.context?.state === "running" && this.buffers.length > 0;
  }

  private flush(): void {
    const stroke = this.queued;
    this.queued = null;
    if (!stroke || readSoundPreferences().mode === "off" || !this.isReady()) {
      return;
    }
    this.emit(stroke);
  }

  private emit(stroke: TypingStroke): void {
    this.syncOutput();
    if (stroke === "finish") {
      this.schedule("finish", 50);
      this.schedule("finish-b", 140);
      return;
    }
    this.startVoice(shapeFor(stroke, readSoundPreferences().mode));
  }

  private schedule(stroke: TypingStroke | "finish-b", delayMs: number): void {
    window.setTimeout(() => {
      const mode = readSoundPreferences().mode;
      if (mode === "off" || !this.isReady()) {
        return;
      }
      this.startVoice(shapeFor(stroke, mode));
    }, delayMs);
  }

  private startVoice(shape: StrokeShape): void {
    const context = this.context;
    const filter = this.filter;
    if (!context || !filter || this.buffers.length === 0) {
      return;
    }

    while (this.voices.length >= MAX_VOICES) {
      const oldest = this.voices.shift();
      if (oldest) {
        this.release(oldest);
      }
    }

    const source = context.createBufferSource();
    source.buffer = this.nextBuffer();
    source.playbackRate.value = shape.rate;

    const gain = context.createGain();
    gain.gain.value = shape.gain;
    source.connect(gain);
    gain.connect(filter);

    const voice: Voice = { source, gain, released: false };
    source.onended = () => {
      this.voices = this.voices.filter((item) => item !== voice);
      source.disconnect();
      gain.disconnect();
    };

    source.start();
    this.voices.push(voice);
  }

  private nextBuffer(): AudioBuffer {
    let index = Math.floor(Math.random() * this.buffers.length);
    if (this.buffers.length > 1 && index === this.lastSample) {
      index = (index + 1) % this.buffers.length;
    }
    this.lastSample = index;
    return this.buffers[index] ?? this.buffers[0];
  }

  private release(voice: Voice): void {
    if (voice.released || !this.context) {
      return;
    }
    voice.released = true;
    const now = this.context.currentTime;
    try {
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
      voice.gain.gain.linearRampToValueAtTime(0, now + 0.008);
      voice.source.stop(now + 0.012);
    } catch {
      voice.source.stop();
    }
  }
}

const engine = new TypingSoundEngine();

export function installSoundGestureListener(): void {
  engine.installGestureListener();
}

export function playTypingSound(stroke: TypingStroke): void {
  engine.play(stroke);
}
