import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioSystem } from '../AudioSystem';
import { GameEventType, eventBus } from '../../core/EventBus';
import type { AudioService } from '../../../services/AudioService';

const mockSettings = {
  audioEnabled: true,
  soundEnabled: true,
  musicEnabled: true,
  masterVolume: 0.7,
  sfxVolume: 0.7,
  bgmVolume: 0.6,
};

let settingsListener: ((settings: typeof mockSettings) => void) | null = null;

vi.mock('../../../stores/uiStore', () => {
  const mockUseUIStore: unknown = vi.fn(() => ({ settings: mockSettings }));
  mockUseUIStore.subscribe = (_selector: unknown, listener: unknown) => {
    settingsListener = listener;
    listener(mockSettings);
    return () => {
      settingsListener = null;
    };
  };
  mockUseUIStore.getState = () => ({ settings: mockSettings });
  return { useUIStore: mockUseUIStore };
});

const createMockAudioService = () => ({
  initialize: vi.fn().mockResolvedValue(undefined),
  loadSound: vi.fn().mockResolvedValue({} as AudioBuffer),
  playSound: vi.fn().mockResolvedValue(undefined),
  playBGM: vi.fn().mockResolvedValue(undefined),
  pauseBGM: vi.fn(),
  resumeBGM: vi.fn().mockResolvedValue(undefined),
  stopBgm: vi.fn(),
  setAudioEnabled: vi.fn(),
  setSoundEnabled: vi.fn(),
  setMusicEnabled: vi.fn(),
  setMasterVolume: vi.fn(),
  setSfxVolume: vi.fn(),
  setBgmVolume: vi.fn(),
  getMonitor: vi.fn().mockReturnValue({}),
  getActiveSfxCount: vi.fn().mockReturnValue(0),
  getEstimatedMemoryUsage: vi.fn().mockReturnValue(0),
  getLatency: vi.fn().mockReturnValue(0),
}) as unknown as AudioService;

const expectLoadCalls = (mockService: AudioService) => {
  const keys = [
    'sfx:paddle-hit',
    'sfx:wall-hit',
    'sfx:block-hit',
    'sfx:block-destroy-1',
    'sfx:block-destroy-2',
    'sfx:powerup',
    'bgm:main',
  ];
  keys.forEach((key) => {
    expect(mockService.loadSound).toHaveBeenCalledWith(key, expect.any(String));
  });
};

describe('AudioSystem', () => {
  let mockService: AudioService;
  let system: AudioSystem;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = createMockAudioService();
    system = new AudioSystem({ service: mockService });
    eventBus.removeAllListeners();
  });

  afterEach(() => {
    system.destroy();
    eventBus.removeAllListeners();
  });

  it('initializes audio service and preloads assets', async () => {
    await system.initialize();

    expect(mockService.initialize).toHaveBeenCalled();
    expectLoadCalls(mockService);
    expect(mockService.setAudioEnabled).toHaveBeenCalledWith(true);
    expect(mockService.setMasterVolume).toHaveBeenCalledWith(mockSettings.masterVolume);
    expect(mockService.setSfxVolume).toHaveBeenCalledWith(mockSettings.sfxVolume);
    expect(mockService.setBgmVolume).toHaveBeenCalledWith(mockSettings.bgmVolume);
    expect(mockService.setSoundEnabled).toHaveBeenCalledWith(mockSettings.soundEnabled);
    expect(mockService.setMusicEnabled).toHaveBeenCalledWith(mockSettings.musicEnabled);
  });

  it('reacts to settings changes from store subscription', async () => {
    await system.initialize();

    const newSettings = {
      ...mockSettings,
      audioEnabled: false,
      soundEnabled: false,
      musicEnabled: false,
      masterVolume: 0.5,
      sfxVolume: 0.4,
      bgmVolume: 0.3,
    };

    settingsListener?.(newSettings);

    expect(mockService.setAudioEnabled).toHaveBeenLastCalledWith(false);
    expect(mockService.setMasterVolume).toHaveBeenLastCalledWith(0.5);
    expect(mockService.setSfxVolume).toHaveBeenLastCalledWith(0.4);
    expect(mockService.setBgmVolume).toHaveBeenLastCalledWith(0.3);
    expect(mockService.setSoundEnabled).toHaveBeenLastCalledWith(false);
    expect(mockService.setMusicEnabled).toHaveBeenLastCalledWith(false);
  });

  it('plays appropriate sounds for game events', async () => {
    await system.initialize();
    mockService.playSound = vi.fn().mockResolvedValue(undefined);

    eventBus.emit(GameEventType.BALL_PADDLE_COLLISION, { paddlePosition: 0.25 });
    eventBus.emit(GameEventType.BALL_WALL_COLLISION, { wall: 'right' });
    eventBus.emit(GameEventType.BALL_BLOCK_COLLISION, { ballId: 'ball', blockId: 'block' });
    eventBus.emit(GameEventType.BLOCK_DESTROYED, { position: { x: 200, y: 100 } });
    eventBus.emit(GameEventType.POWERUP_COLLECTED, { type: 'speed', id: 'p1' });

    expect(mockService.playSound).toHaveBeenCalledWith('sfx:paddle-hit', expect.objectContaining({ pan: expect.any(Number) }));
    expect(mockService.playSound).toHaveBeenCalledWith('sfx:wall-hit', expect.objectContaining({ pan: 0.8 }));
    expect(mockService.playSound).toHaveBeenCalledWith('sfx:block-hit', expect.objectContaining({ volume: 0.6 }));
    expect(mockService.playSound).toHaveBeenCalledWith(expect.stringMatching(/sfx:block-destroy/), expect.any(Object));
    expect(mockService.playSound).toHaveBeenCalledWith('sfx:powerup', expect.any(Object));
  });

  it('controls BGM on game lifecycle events', async () => {
    await system.initialize();

    eventBus.emit(GameEventType.GAME_START, undefined);
    expect(mockService.playBGM).toHaveBeenCalledWith('bgm:main', { fadeIn: 1.2 });

    eventBus.emit(GameEventType.GAME_PAUSE, undefined);
    expect(mockService.pauseBGM).toHaveBeenCalled();

    eventBus.emit(GameEventType.GAME_RESUME, undefined);
    expect(mockService.resumeBGM).toHaveBeenCalled();

    eventBus.emit(GameEventType.GAME_OVER, { score: 0, level: 1 });
    expect(mockService.stopBgm).toHaveBeenCalled();
  });

  it('cleans up subscriptions on destroy', async () => {
    await system.initialize();
    system.destroy();

    mockService.playSound = vi.fn();
    eventBus.emit(GameEventType.BALL_PADDLE_COLLISION, { paddlePosition: 0.5 });
    expect(mockService.playSound).not.toHaveBeenCalled();
  });
});
