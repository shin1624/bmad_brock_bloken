import { linearToLogarithmic } from "../stores/uiStore";

const MAX_SIMULTANEOUS_SOUNDS = 10;
const DEFAULT_SAMPLE_RATE = 44100;

export interface SoundPlaybackOptions {
  volume?: number;
  pan?: number;
  loop?: boolean;
  offset?: number;
  playbackRate?: number;
}

export interface BgmPlaybackOptions extends SoundPlaybackOptions {
  fadeIn?: number;
}

interface LoadedBufferMetadata {
  name: string;
  buffer: AudioBuffer;
}

class AudioBufferPool {
  private pooledNodes: AudioBufferSourceNode[] = [];

  constructor(private readonly context: AudioContext, private readonly maxSize = 32) {}

  acquire(): AudioBufferSourceNode {
    const node = this.pooledNodes.pop() || this.context.createBufferSource();
    node.buffer = null;
    node.onended = null;
    return node;
  }

  release(node: AudioBufferSourceNode): void {
    try {
      node.stop();
    } catch {
      /* noop */
    }

    try {
      node.disconnect();
    } catch {
      /* noop */
    }

    node.buffer = null;
    node.onended = null;

    if (this.pooledNodes.length < this.maxSize) {
      this.pooledNodes.push(node);
    }
  }

  clear(): void {
    this.pooledNodes.forEach((node) => {
      try {
        node.disconnect();
      } catch {
        /* noop */
      }
    });
    this.pooledNodes = [];
  }
}

class AudioMonitor {
  constructor(private readonly service: AudioService) {}

  getActiveNodeCount(): number {
    return this.service.getActiveSfxCount();
  }

  getMemoryUsage(): number {
    return this.service.getEstimatedMemoryUsage();
  }

  getLatency(): number {
    return this.service.getLatency();
  }
}

export class AudioService {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private panner: StereoPannerNode | null = null;

  private bufferPool: AudioBufferPool | null = null;
  private monitor: AudioMonitor | null = null;

  private audioBuffers: Map<string, LoadedBufferMetadata> = new Map();
  private loadingPromises: Map<string, Promise<AudioBuffer>> = new Map();

  private activeSfxNodes: Set<AudioBufferSourceNode> = new Set();
  private activeQueue: AudioBufferSourceNode[] = [];

  private currentBgm: {
    name: string;
    source: AudioBufferSourceNode;
  } | null = null;

  private audioEnabled = true;
  private soundEnabled = true;
  private musicEnabled = true;

  private masterLevel = 1;
  private sfxLevel = 1;
  private bgmLevel = 1;

  private unlocked = false;
  private supported = typeof window !== "undefined" &&
    ("AudioContext" in window || "webkitAudioContext" in window);

  async initialize(): Promise<void> {
    if (!this.supported) return;
    if (this.context) return;

    const AudioContextCtor: typeof AudioContext =
      (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);

    this.context = new AudioContextCtor({ sampleRate: DEFAULT_SAMPLE_RATE });

    this.masterGain = this.context.createGain();
    this.sfxGain = this.context.createGain();
    this.bgmGain = this.context.createGain();
    this.panner = this.context.createStereoPanner ? this.context.createStereoPanner() : null;

    this.masterGain.connect(this.context.destination);
    this.sfxGain.connect(this.masterGain);
    this.bgmGain.connect(this.masterGain);

    this.bufferPool = new AudioBufferPool(this.context);
    this.monitor = new AudioMonitor(this);

    document.addEventListener(
      "pointerdown",
      this.handleUserInteraction,
      { once: true },
    );

    this.updateGains();
  }

  private ensureInitialized(): AudioContext {
    if (!this.context) {
      throw new Error("AudioService: initialize must be called before use");
    }
    return this.context;
  }

  async unlock(): Promise<void> {
    if (!this.context || this.unlocked === true) return;
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
    this.unlocked = true;
  }

  private handleUserInteraction = async (): Promise<void> => {
    try {
      await this.unlock();
    } catch {
      /* ignore */
    }
  };

  async loadSound(name: string, url: string): Promise<AudioBuffer> {
    if (!this.supported) {
      throw new Error("AudioService: Web Audio API not supported");
    }

    if (this.audioBuffers.has(name)) {
      return this.audioBuffers.get(name)!.buffer;
    }

    if (this.loadingPromises.has(name)) {
      return this.loadingPromises.get(name)!;
    }

    const context = this.ensureInitialized();
    const promise = fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`AudioService: failed to load sound ${name}`);
        }
        return response.arrayBuffer();
      })
      .then((arrayBuffer) => context.decodeAudioData(arrayBuffer))
      .then((buffer) => {
        this.audioBuffers.set(name, { name, buffer });
        this.loadingPromises.delete(name);
        return buffer;
      });

    this.loadingPromises.set(name, promise);
    return promise;
  }

  async playSound(name: string, options: SoundPlaybackOptions = {}): Promise<void> {
    if (!this.supported || !this.audioEnabled || !this.soundEnabled) return;

    await this.initialize();
    const context = this.ensureInitialized();
    const existing = this.audioBuffers.get(name);
    if (!existing) {
      throw new Error(`AudioService: sound "${name}" has not been preloaded`);
    }
    const buffer = existing.buffer;
    const gainNode = context.createGain();
    const source = this.bufferPool?.acquire() ?? context.createBufferSource();

    source.buffer = buffer;
    source.loop = options.loop ?? false;
    if (typeof options.playbackRate === "number") {
      source.playbackRate.value = options.playbackRate;
    }

    const effectiveVolume = typeof options.volume === "number" ? options.volume : 1;
    gainNode.gain.value = effectiveVolume;

    const sfxGain = this.sfxGain ?? this.masterGain;
    if (!sfxGain) return;

    source.connect(gainNode);

    let destination: AudioNode = sfxGain;
    if (this.panner && typeof options.pan === "number") {
      this.panner.pan.value = Math.max(-1, Math.min(1, options.pan));
      gainNode.connect(this.panner);
      destination = this.panner;
    } else {
      gainNode.connect(destination);
    }

    source.onended = () => {
      this.activeSfxNodes.delete(source);
      const index = this.activeQueue.indexOf(source);
      if (index >= 0) {
        this.activeQueue.splice(index, 1);
      }
      this.bufferPool?.release(source);
    };

    this.trackSfxSource(source);

    source.start(0, options.offset ?? 0);
  }

  private trackSfxSource(source: AudioBufferSourceNode): void {
    this.activeSfxNodes.add(source);
    this.activeQueue.push(source);

    if (this.activeQueue.length > MAX_SIMULTANEOUS_SOUNDS) {
      const oldest = this.activeQueue.shift();
      if (oldest) {
        try {
          oldest.stop();
        } catch {
          /* noop */
        }
      }
    }
  }

  async playBGM(name: string, options: BgmPlaybackOptions = {}): Promise<void> {
    if (!this.supported || !this.audioEnabled || !this.musicEnabled) return;
    await this.initialize();
    const context = this.ensureInitialized();
    const existing = this.audioBuffers.get(name);
    if (!existing) {
      throw new Error(`AudioService: BGM "${name}" has not been preloaded`);
    }
    const buffer = existing.buffer;

    if (this.currentBgm) {
      this.currentBgm.source.stop();
      this.currentBgm = null;
    }

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = options.loop ?? true;

    const fadeIn = options.fadeIn ?? 0;
    const gain = context.createGain();
    gain.gain.value = fadeIn > 0 ? 0 : 1;

    source.connect(gain);
    gain.connect(this.bgmGain ?? this.masterGain ?? context.destination);

    this.currentBgm = { name, source };
    source.start(0, options.offset ?? 0);

    if (fadeIn > 0) {
      const now = context.currentTime;
      gain.gain.linearRampToValueAtTime(1, now + fadeIn);
    }
  }

  pauseBGM(): void {
    if (!this.currentBgm) return;
    try {
      this.currentBgm.source.stop();
    } catch {
      /* noop */
    }
  }

  async resumeBGM(): Promise<void> {
    if (!this.currentBgm) return;
    await this.playBGM(this.currentBgm.name);
  }

  stopBgm(): void {
    if (!this.currentBgm) return;
    try {
      this.currentBgm.source.stop();
    } catch {
      /* noop */
    }
    this.currentBgm = null;
  }

  setMasterVolume(volume: number): void {
    this.masterLevel = Math.max(0, Math.min(1, volume));
    this.updateGains();
  }

  setSfxVolume(volume: number): void {
    this.sfxLevel = Math.max(0, Math.min(1, volume));
    this.updateGains();
  }

  setBgmVolume(volume: number): void {
    this.bgmLevel = Math.max(0, Math.min(1, volume));
    this.updateGains();
  }

  setAudioEnabled(enabled: boolean): void {
    this.audioEnabled = enabled;
    this.updateGains();
  }

  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    this.updateGains();
  }

  setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    this.updateGains();
  }

  private updateGains(): void {
    if (!this.masterGain || !this.sfxGain || !this.bgmGain) return;

    const masterValue = this.audioEnabled
      ? linearToLogarithmic(this.masterLevel)
      : 0;
    this.masterGain.gain.value = masterValue;

    this.sfxGain.gain.value = this.audioEnabled && this.soundEnabled
      ? linearToLogarithmic(this.sfxLevel)
      : 0;

    this.bgmGain.gain.value = this.audioEnabled && this.musicEnabled
      ? linearToLogarithmic(this.bgmLevel)
      : 0;
  }

  getMonitor(): AudioMonitor {
    if (!this.monitor) {
      this.monitor = new AudioMonitor(this);
    }
    return this.monitor;
  }

  getActiveSfxCount(): number {
    return this.activeSfxNodes.size;
  }

  getEstimatedMemoryUsage(): number {
    let bytes = 0;
    this.audioBuffers.forEach(({ buffer }) => {
      const sampleCount = buffer.length * buffer.numberOfChannels;
      bytes += sampleCount * 4; // 32-bit float per sample
    });
    return bytes;
  }

  getLatency(): number {
    if (!this.context) return 0;
    return (this.context.baseLatency ?? 0) * 1000;
  }

  dispose(): void {
    this.stopBgm();
    this.activeSfxNodes.forEach((node) => {
      try {
        node.stop();
        node.disconnect();
      } catch {
        /* noop */
      }
    });
    this.activeSfxNodes.clear();
    this.activeQueue = [];
    this.bufferPool?.clear();
    this.bufferPool = null;

    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {
        /* noop */
      }
    }

    if (this.context) {
      this.context.close().catch(() => undefined);
    }

    this.audioBuffers.clear();
    this.loadingPromises.clear();
    this.context = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.bgmGain = null;
    this.monitor = null;
    this.unlocked = false;
  }
}

export class SilentAudioService extends AudioService {
  async initialize(): Promise<void> {
    return Promise.resolve();
  }

  async loadSound(): Promise<AudioBuffer> {
    return Promise.reject(new Error("Audio disabled"));
  }

  async playSound(): Promise<void> {
    return Promise.resolve();
  }

  async playBGM(): Promise<void> {
    return Promise.resolve();
  }

  pauseBGM(): void {}
  resumeBGM(): void {}
  stopBgm(): void {}
  setMasterVolume(): void {}
  setSfxVolume(): void {}
  setBgmVolume(): void {}
  setAudioEnabled(): void {}
}

export const audioService = new AudioService();
export const MAX_ACTIVE_SOUNDS = MAX_SIMULTANEOUS_SOUNDS;
