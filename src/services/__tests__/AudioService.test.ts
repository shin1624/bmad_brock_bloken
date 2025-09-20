import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioService } from '../AudioService';

type MockBufferSource = {
  buffer: AudioBuffer | null;
  loop: boolean;
  playbackRate: { value: number };
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  onended: (() => void) | null;
};

class GainNodeMock {
  gain = { value: 1, linearRampToValueAtTime: vi.fn() };
  connect = vi.fn();
  disconnect = vi.fn();
}

class StereoPannerNodeMock {
  pan = { value: 0 };
  connect = vi.fn();
  disconnect = vi.fn();
}

class AudioContextMock {
  public state: AudioContextState = 'running';
  public baseLatency = 0.05;
  public currentTime = 0;
  public destination = {} as AudioDestinationNode;
  private bufferSources: MockBufferSource[] = [];

  resume = vi.fn(async () => {
    this.state = 'running';
  });

  close = vi.fn(async () => {
    this.state = 'closed';
  });

  createGain = vi.fn(() => new GainNodeMock() as unknown as GainNode);

  createStereoPanner = vi.fn(() => new StereoPannerNodeMock() as unknown as StereoPannerNode);

  createBufferSource = vi.fn(() => {
    const source: MockBufferSource = {
      buffer: null,
      loop: false,
      playbackRate: { value: 1 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
      onended: null,
    };
    this.bufferSources.push(source);
    return source as unknown as AudioBufferSourceNode;
  });

  decodeAudioData = vi.fn(async () => ({
    length: 100,
    numberOfChannels: 2,
  }) as unknown as AudioBuffer);

  getCreatedSources(): MockBufferSource[] {
    return this.bufferSources;
  }
}

describe('AudioService', () => {
  let originalAudioContext: typeof AudioContext | undefined;
  let service: AudioService;
  let mockContext: AudioContextMock;

  beforeEach(() => {
    originalAudioContext = (globalThis as any).AudioContext;
    mockContext = new AudioContextMock();
    (globalThis as any).AudioContext = vi.fn(() => mockContext);

    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      } as Response),
    ) as unknown as typeof fetch;

    service = new AudioService();
  });

  afterEach(() => {
    if (originalAudioContext) {
      (globalThis as any).AudioContext = originalAudioContext;
    } else {
      delete (globalThis as any).AudioContext;
    }
    vi.restoreAllMocks();
  });

  it('initializes audio graph and applies volume defaults', async () => {
    await service.initialize();

    expect(mockContext.createGain).toHaveBeenCalledTimes(3);
    expect(mockContext.createStereoPanner).toHaveBeenCalled();

    service.setMasterVolume(0.5);
    service.setSfxVolume(0.4);
    service.setBgmVolume(0.3);
    service.setAudioEnabled(true);
    service.setSoundEnabled(true);
    service.setMusicEnabled(true);

    const gains = mockContext.createGain.mock.results.map((result) => (result.value as GainNodeMock).gain.value);
    gains.forEach((value) => expect(value).toBeGreaterThanOrEqual(0));
  });

  it('loads and caches audio buffers', async () => {
    await service.initialize();

    await service.loadSound('test:sound', '/test.wav');
    await service.loadSound('test:sound', '/test.wav');

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(mockContext.decodeAudioData).toHaveBeenCalled();
  });

  it('respects audio flags when playing sound effects', async () => {
    await service.initialize();
    await service.loadSound('sfx:test', '/test.wav');

    await service.playSound('sfx:test');
    expect(mockContext.createBufferSource).toHaveBeenCalledTimes(1);

    service.setAudioEnabled(false);
    await service.playSound('sfx:test');
    expect(mockContext.createBufferSource).toHaveBeenCalledTimes(1);
  });

  it('controls BGM playback based on enable flags', async () => {
    await service.initialize();
    await service.loadSound('bgm:test', '/bgm.wav');

    await service.playBGM('bgm:test');
    expect(mockContext.createBufferSource).toHaveBeenCalledTimes(1);

    service.setMusicEnabled(false);
    await service.playBGM('bgm:test');
    expect(mockContext.createBufferSource).toHaveBeenCalledTimes(1);
  });

  it('releases audio resources on dispose', async () => {
    await service.initialize();
    await service.loadSound('sfx:test', '/test.wav');
    await service.playSound('sfx:test');

    service.dispose();

    expect(mockContext.close).toHaveBeenCalled();
    expect((service as any).audioBuffers.size).toBe(0);
  });
});
