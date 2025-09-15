import { vi } from "vitest";

// Common mock factories for menu components
export const createMockMenuState = (overrides = {}) => ({
  currentMenu: "main",
  navigationHistory: [],
  isAnimating: false,
  ...overrides,
});

export const createMockMainMenu = (overrides = {}) => ({
  menuState: createMockMenuState(),
  isLoading: false,
  startGame: vi.fn(),
  openSettings: vi.fn(),
  openHighScores: vi.fn(),
  openLevelSelect: vi.fn(),
  goBack: vi.fn(),
  ...overrides,
});

export const createMockSettings = (overrides = {}) => ({
  settings: {
    soundEnabled: true,
    musicEnabled: true,
    volume: 0.7,
    theme: "light",
    difficulty: "normal",
    controls: "keyboard",
    inputSensitivity: { keyboard: 1.0, mouse: 1.0, touch: 1.0 },
  },
  updateSettings: vi.fn(),
  resetSettings: vi.fn(),
  saveSettings: vi.fn(),
  loadSettings: vi.fn(),
  isLoading: false,
  hasUnsavedChanges: false,
  ...overrides,
});

// Test data factories
export const createMockHighScore = (id: number = 1) => ({
  id: `score-${id}`,
  playerName: `Player ${id}`,
  score: 1000 * id,
  level: id,
  timestamp: new Date(),
  duration: 300 + id * 10,
});

export const createMockLevelData = (id: number = 1) => ({
  id,
  name: `Level ${id}`,
  difficulty: "normal" as const,
  unlocked: true,
  bestScore: 1000 * id,
  thumbnail: `/levels/level-${id}.png`,
  blockLayout: [],
});

// Common test setup utilities
export const setupMenuTests = () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });
};

export const mockLocalStorage = () => {
  const storage: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => storage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      storage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete storage[key];
    }),
    clear: vi.fn(() => {
      Object.keys(storage).forEach((key) => delete storage[key]);
    }),
  };
};
