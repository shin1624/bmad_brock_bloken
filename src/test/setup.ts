import "@testing-library/jest-dom";
import { vi } from "vitest";
import { installCanvasMocks } from "../__tests__/mocks/CanvasMockFactory";

// Install Canvas mocks globally
installCanvasMocks();

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(callback: ResizeObserverCallback) {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = vi.fn((callback) => {
  const id = setTimeout(callback, 16);
  return id as any;
});

global.cancelAnimationFrame = vi.fn((id) => {
  clearTimeout(id);
});

// Mock performance.now for testing
if (!global.performance) {
  global.performance = {
    now: vi.fn(() => Date.now()),
  } as any;
}

// Mock Web Audio API for audio tests
global.AudioContext = vi.fn(() => ({
  createOscillator: vi.fn(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    type: 'sine',
    frequency: { value: 440 }
  })),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    gain: { value: 1 }
  })),
  destination: {},
  currentTime: 0,
  resume: vi.fn(),
  suspend: vi.fn(),
  close: vi.fn()
})) as any;

global.Audio = vi.fn(() => ({
  play: vi.fn(() => Promise.resolve()),
  pause: vi.fn(),
  load: vi.fn(),
  volume: 1,
  currentTime: 0,
  duration: 0,
  src: '',
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
})) as any;

// Setup cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
});