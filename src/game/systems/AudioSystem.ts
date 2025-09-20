import { eventBus, GameEventType } from "../core/EventBus";
import { audioService, AudioService, MAX_ACTIVE_SOUNDS } from "../../services/AudioService";
import type { AudioSettings } from "../../types/game.types";
import { useUIStore } from "../../stores/uiStore";

const SOUND_CATALOG = {
  sfx: {
    paddle: {
      key: "sfx:paddle-hit",
      url: new URL("../../assets/sounds/sfx/paddle-hit.wav", import.meta.url).href,
    },
    wall: {
      key: "sfx:wall-hit",
      url: new URL("../../assets/sounds/sfx/wall-hit.wav", import.meta.url).href,
    },
    blockHit: {
      key: "sfx:block-hit",
      url: new URL("../../assets/sounds/sfx/block-hit.wav", import.meta.url).href,
    },
    blockDestroy1: {
      key: "sfx:block-destroy-1",
      url: new URL("../../assets/sounds/sfx/block-destroy-1.wav", import.meta.url).href,
    },
    blockDestroy2: {
      key: "sfx:block-destroy-2",
      url: new URL("../../assets/sounds/sfx/block-destroy-2.wav", import.meta.url).href,
    },
    powerUp: {
      key: "sfx:powerup",
      url: new URL("../../assets/sounds/sfx/powerup.wav", import.meta.url).href,
    },
  },
  bgm: {
    main: {
      key: "bgm:main",
      url: new URL("../../assets/sounds/bgm/main-loop.wav", import.meta.url).href,
    },
  },
} as const;

const BLOCK_DESTROY_VARIANTS = [
  SOUND_CATALOG.sfx.blockDestroy1.key,
  SOUND_CATALOG.sfx.blockDestroy2.key,
];

export interface AudioSystemOptions {
  service?: AudioService;
}

export class AudioSystem {
  private initialized = false;
  private readonly service: AudioService;
  private unsubscribeStore: (() => void) | null = null;
  private unregisterHandlers: Array<() => void> = [];

  constructor(options: AudioSystemOptions = {}) {
    this.service = options.service ?? audioService;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.service.initialize();

    await Promise.all([
      this.service.loadSound(SOUND_CATALOG.sfx.paddle.key, SOUND_CATALOG.sfx.paddle.url),
      this.service.loadSound(SOUND_CATALOG.sfx.wall.key, SOUND_CATALOG.sfx.wall.url),
      this.service.loadSound(SOUND_CATALOG.sfx.blockHit.key, SOUND_CATALOG.sfx.blockHit.url),
      this.service.loadSound(SOUND_CATALOG.sfx.blockDestroy1.key, SOUND_CATALOG.sfx.blockDestroy1.url),
      this.service.loadSound(SOUND_CATALOG.sfx.blockDestroy2.key, SOUND_CATALOG.sfx.blockDestroy2.url),
      this.service.loadSound(SOUND_CATALOG.sfx.powerUp.key, SOUND_CATALOG.sfx.powerUp.url),
      this.service.loadSound(SOUND_CATALOG.bgm.main.key, SOUND_CATALOG.bgm.main.url),
    ]);

    this.subscribeToStore();
    this.registerEventHandlers();

    this.initialized = true;
  }

  private subscribeToStore(): void {
    if (this.unsubscribeStore) return;
    this.unsubscribeStore = useUIStore.subscribe(
      (state) => state.settings,
      (settings) => this.applySettings(settings as AudioSettings),
      { fireImmediately: true },
    );
  }

  private applySettings(settings: AudioSettings): void {
    this.service.setAudioEnabled(settings.audioEnabled);
    this.service.setMasterVolume(settings.masterVolume);
    this.service.setSfxVolume(settings.sfxVolume);
    this.service.setBgmVolume(settings.bgmVolume);
    this.service.setSoundEnabled(settings.soundEnabled);
    this.service.setMusicEnabled(settings.musicEnabled);
  }

  private registerEventHandlers(): void {
    const paddleCollisionSub = eventBus.on(
      GameEventType.BALL_PADDLE_COLLISION,
      ({ paddlePosition }) => {
        const pan = typeof paddlePosition === "number" ? paddlePosition * 2 - 1 : 0;
        void this.service.playSound(SOUND_CATALOG.sfx.paddle.key, {
          pan,
          volume: 0.9,
        });
      },
    );
    this.unregisterHandlers.push(paddleCollisionSub.unsubscribe);

    const wallCollisionSub = eventBus.on(
      GameEventType.BALL_WALL_COLLISION,
      ({ wall }) => {
        const pan = wall === "left" ? -0.8 : wall === "right" ? 0.8 : 0;
        void this.service.playSound(SOUND_CATALOG.sfx.wall.key, {
          pan,
          volume: 0.75,
        });
      },
    );
    this.unregisterHandlers.push(wallCollisionSub.unsubscribe);

    const blockCollisionSub = eventBus.on(GameEventType.BALL_BLOCK_COLLISION, () => {
      void this.service.playSound(SOUND_CATALOG.sfx.blockHit.key, {
        volume: 0.6,
      });
    });
    this.unregisterHandlers.push(blockCollisionSub.unsubscribe);

    const blockDestroyedSub = eventBus.on(
      GameEventType.BLOCK_DESTROYED,
      ({ position }) => {
        const key = BLOCK_DESTROY_VARIANTS[Math.floor(Math.random() * BLOCK_DESTROY_VARIANTS.length)];
        const pan = position ? position.x / 400 - 0.5 : 0;
        void this.service.playSound(key, {
          pan,
          volume: 0.85,
        });
      },
    );
    this.unregisterHandlers.push(blockDestroyedSub.unsubscribe);

    const powerUpSub = eventBus.on(GameEventType.POWERUP_COLLECTED, () => {
      void this.service.playSound(SOUND_CATALOG.sfx.powerUp.key, {
        volume: 0.8,
      });
    });
    this.unregisterHandlers.push(powerUpSub.unsubscribe);

    const gameStartSub = eventBus.on(GameEventType.GAME_START, () => {
      void this.service.playBGM(SOUND_CATALOG.bgm.main.key, { fadeIn: 1.2 });
    });
    this.unregisterHandlers.push(gameStartSub.unsubscribe);

    const gamePauseSub = eventBus.on(GameEventType.GAME_PAUSE, () => {
      this.service.pauseBGM();
    });
    this.unregisterHandlers.push(gamePauseSub.unsubscribe);

    const gameResumeSub = eventBus.on(GameEventType.GAME_RESUME, () => {
      void this.service.resumeBGM();
    });
    this.unregisterHandlers.push(gameResumeSub.unsubscribe);

    const gameOverSub = eventBus.on(GameEventType.GAME_OVER, () => {
      this.service.stopBgm();
    });
    this.unregisterHandlers.push(gameOverSub.unsubscribe);
  }

  getMonitor() {
    return this.service.getMonitor();
  }

  destroy(): void {
    this.unregisterHandlers.forEach((unregister) => {
      try {
        unregister();
      } catch {
        /* noop */
      }
    });
    this.unregisterHandlers = [];

    if (this.unsubscribeStore) {
      this.unsubscribeStore();
      this.unsubscribeStore = null;
    }

    this.service.stopBgm();
    this.initialized = false;
  }

  getActiveSoundCount(): number {
    return this.service.getActiveSfxCount();
  }

  getMaxSimultaneousSounds(): number {
    return MAX_ACTIVE_SOUNDS;
  }
}

export const audioSystem = new AudioSystem();
