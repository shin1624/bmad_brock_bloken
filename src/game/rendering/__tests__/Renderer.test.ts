import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Renderer } from '../Renderer';
import type { Entity, SpriteEntity, RectEntity, CircleEntity, TextEntity, Camera } from '../Renderer';

// Mock Canvas 2D Context
const mockContext = {
  canvas: {
    width: 800,
    height: 600,
  },
  resetTransform: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  scale: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  drawImage: vi.fn(),
  globalAlpha: 1,
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  font: '',
  textAlign: 'start' as CanvasTextAlign,
  textBaseline: 'alphabetic' as CanvasTextBaseline,
} as any;

// Mock Image constructor
global.Image = class {
  src = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor() {
    // Simulate immediate load for testing
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
} as any;

describe('Renderer', () => {
  let renderer: Renderer;
  const defaultCamera: Camera = { x: 0, y: 0, zoom: 1, rotation: 0 };

  beforeEach(() => {
    vi.clearAllMocks();
    renderer = new Renderer(mockContext, defaultCamera, {
      clearCanvas: true,
      enableCulling: true,
      cullMargin: 50,
    });
  });

  it('initializes with correct default settings', () => {
    expect(renderer).toBeDefined();
    const stats = renderer.getStats();
    expect(stats.totalEntities).toBe(0);
    expect(stats.camera).toEqual(defaultCamera);
  });

  it('adds and removes entities correctly', () => {
    const rectEntity: RectEntity = {
      type: 'rect',
      x: 100,
      y: 100,
      width: 50,
      height: 50,
      fillColor: 'red',
    };

    renderer.addEntity(rectEntity);
    expect(renderer.getStats().totalEntities).toBe(1);

    renderer.removeEntity(rectEntity);
    expect(renderer.getStats().totalEntities).toBe(0);
  });

  it('clears all entities', () => {
    const rect1: RectEntity = {
      type: 'rect',
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      fillColor: 'red',
    };

    const rect2: RectEntity = {
      type: 'rect',
      x: 100,
      y: 100,
      width: 50,
      height: 50,
      fillColor: 'blue',
    };

    renderer.addEntity(rect1);
    renderer.addEntity(rect2);
    expect(renderer.getStats().totalEntities).toBe(2);

    renderer.clearEntities();
    expect(renderer.getStats().totalEntities).toBe(0);
  });

  it('updates camera correctly', () => {
    const newCameraSettings = { x: 100, y: 200, zoom: 2 };
    renderer.updateCamera(newCameraSettings);

    const stats = renderer.getStats();
    expect(stats.camera.x).toBe(100);
    expect(stats.camera.y).toBe(200);
    expect(stats.camera.zoom).toBe(2);
    expect(stats.camera.rotation).toBe(0); // unchanged
  });

  it('renders rectangle entities correctly', () => {
    const rectEntity: RectEntity = {
      type: 'rect',
      x: 100,
      y: 100,
      width: 50,
      height: 50,
      fillColor: 'red',
      strokeColor: 'blue',
      strokeWidth: 2,
    };

    renderer.addEntity(rectEntity);
    renderer.render();

    expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
    expect(mockContext.fillStyle).toBe('red');
    expect(mockContext.fillRect).toHaveBeenCalledWith(0, 0, 50, 50);
    expect(mockContext.strokeStyle).toBe('blue');
    expect(mockContext.lineWidth).toBe(2);
    expect(mockContext.strokeRect).toHaveBeenCalledWith(0, 0, 50, 50);
  });

  it('renders circle entities correctly', () => {
    const circleEntity: CircleEntity = {
      type: 'circle',
      x: 100,
      y: 100,
      width: 60,
      height: 60,
      radius: 30,
      fillColor: 'green',
      strokeColor: 'black',
      strokeWidth: 1,
    };

    renderer.addEntity(circleEntity);
    renderer.render();

    expect(mockContext.beginPath).toHaveBeenCalled();
    expect(mockContext.arc).toHaveBeenCalledWith(30, 30, 30, 0, Math.PI * 2);
    expect(mockContext.fillStyle).toBe('green');
    expect(mockContext.fill).toHaveBeenCalled();
    expect(mockContext.strokeStyle).toBe('black');
    expect(mockContext.lineWidth).toBe(1);
    expect(mockContext.stroke).toHaveBeenCalled();
  });

  it('renders text entities correctly', () => {
    const textEntity: TextEntity = {
      type: 'text',
      x: 100,
      y: 100,
      width: 100,
      height: 20,
      text: 'Hello World',
      fontSize: 16,
      fontFamily: 'Arial',
      fillColor: 'black',
      strokeColor: 'white',
      strokeWidth: 1,
      textAlign: 'center',
      textBaseline: 'middle',
    };

    renderer.addEntity(textEntity);
    renderer.render();

    expect(mockContext.font).toBe('16px Arial');
    expect(mockContext.textAlign).toBe('center');
    expect(mockContext.textBaseline).toBe('middle');
    expect(mockContext.fillStyle).toBe('black');
    expect(mockContext.fillText).toHaveBeenCalledWith('Hello World', 0, 0);
    expect(mockContext.strokeStyle).toBe('white');
    expect(mockContext.lineWidth).toBe(1);
    expect(mockContext.strokeText).toHaveBeenCalledWith('Hello World', 0, 0);
  });

  it('renders sprite entities correctly', async () => {
    const spriteEntity: SpriteEntity = {
      type: 'sprite',
      x: 100,
      y: 100,
      width: 64,
      height: 64,
      imageSrc: 'test-image.png',
    };

    renderer.addEntity(spriteEntity);
    
    // Wait for image to load
    await new Promise(resolve => setTimeout(resolve, 10));
    
    renderer.render();

    expect(mockContext.drawImage).toHaveBeenCalledWith(
      expect.any(Image),
      0,
      0,
      64,
      64
    );
  });

  it('renders sprite with source rectangle correctly', async () => {
    const spriteEntity: SpriteEntity = {
      type: 'sprite',
      x: 100,
      y: 100,
      width: 32,
      height: 32,
      imageSrc: 'sprite-sheet.png',
      sourceX: 64,
      sourceY: 32,
      sourceWidth: 32,
      sourceHeight: 32,
    };

    renderer.addEntity(spriteEntity);
    
    await new Promise(resolve => setTimeout(resolve, 10));
    
    renderer.render();

    expect(mockContext.drawImage).toHaveBeenCalledWith(
      expect.any(Image),
      64, 32, 32, 32,  // source rectangle
      0, 0, 32, 32     // destination rectangle
    );
  });

  it('applies entity transformations correctly', () => {
    const transformedEntity: RectEntity = {
      type: 'rect',
      x: 100,
      y: 100,
      width: 50,
      height: 50,
      fillColor: 'red',
      rotation: Math.PI / 4,
      scaleX: 2,
      scaleY: 1.5,
      alpha: 0.8,
    };

    renderer.addEntity(transformedEntity);
    renderer.render();

    expect(mockContext.translate).toHaveBeenCalledWith(100, 100);
    expect(mockContext.rotate).toHaveBeenCalledWith(Math.PI / 4);
    expect(mockContext.scale).toHaveBeenCalledWith(2, 1.5);
    expect(mockContext.globalAlpha).toBe(0.8);
  });

  it('applies camera transformations correctly', () => {
    const cameraSettings = { x: 50, y: 25, zoom: 2, rotation: Math.PI / 6 };
    renderer.updateCamera(cameraSettings);

    const rectEntity: RectEntity = {
      type: 'rect',
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      fillColor: 'red',
    };

    renderer.addEntity(rectEntity);
    renderer.render();

    expect(mockContext.resetTransform).toHaveBeenCalled();
    expect(mockContext.scale).toHaveBeenCalledWith(2, 2);
    expect(mockContext.translate).toHaveBeenCalledWith(-50, -25);
  });

  it('sorts entities by zIndex before rendering', () => {
    const entity1: RectEntity = {
      type: 'rect',
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      fillColor: 'red',
      zIndex: 2,
    };

    const entity2: RectEntity = {
      type: 'rect',
      x: 10,
      y: 10,
      width: 50,
      height: 50,
      fillColor: 'blue',
      zIndex: 1,
    };

    const entity3: RectEntity = {
      type: 'rect',
      x: 20,
      y: 20,
      width: 50,
      height: 50,
      fillColor: 'green',
      zIndex: 3,
    };

    renderer.addEntity(entity1);
    renderer.addEntity(entity2);
    renderer.addEntity(entity3);

    const fillStyleCalls: string[] = [];
    mockContext.fillStyle = '';

    // Override fillStyle setter to capture order
    Object.defineProperty(mockContext, 'fillStyle', {
      set: (value: string) => {
        fillStyleCalls.push(value);
      },
      get: () => fillStyleCalls[fillStyleCalls.length - 1] || '',
    });

    renderer.render();

    // Should render in zIndex order: blue (1), red (2), green (3)
    expect(fillStyleCalls).toEqual(['blue', 'red', 'green']);
  });

  it('performs frustum culling correctly', () => {
    // Entity outside camera view
    const outsideEntity: RectEntity = {
      type: 'rect',
      x: 1000,
      y: 1000,
      width: 50,
      height: 50,
      fillColor: 'red',
    };

    // Entity inside camera view
    const insideEntity: RectEntity = {
      type: 'rect',
      x: 100,
      y: 100,
      width: 50,
      height: 50,
      fillColor: 'blue',
    };

    renderer.addEntity(outsideEntity);
    renderer.addEntity(insideEntity);

    const stats = renderer.getStats();
    expect(stats.totalEntities).toBe(2);
    expect(stats.visibleEntities).toBe(1); // Only insideEntity should be visible
    expect(stats.culledEntities).toBe(1); // outsideEntity should be culled
  });

  it('handles invisible entities correctly', () => {
    const invisibleEntity: RectEntity = {
      type: 'rect',
      x: 100,
      y: 100,
      width: 50,
      height: 50,
      fillColor: 'red',
      visible: false,
    };

    const visibleEntity: RectEntity = {
      type: 'rect',
      x: 200,
      y: 200,
      width: 50,
      height: 50,
      fillColor: 'blue',
      visible: true,
    };

    renderer.addEntity(invisibleEntity);
    renderer.addEntity(visibleEntity);

    const stats = renderer.getStats();
    expect(stats.totalEntities).toBe(2);
    expect(stats.visibleEntities).toBe(1); // Only visibleEntity should be rendered
  });

  it('saves and restores context for each entity', () => {
    const entity1: RectEntity = {
      type: 'rect',
      x: 100,
      y: 100,
      width: 50,
      height: 50,
      fillColor: 'red',
    };

    const entity2: RectEntity = {
      type: 'rect',
      x: 200,
      y: 200,
      width: 50,
      height: 50,
      fillColor: 'blue',
    };

    renderer.addEntity(entity1);
    renderer.addEntity(entity2);
    renderer.render();

    // Should save/restore context for each entity
    expect(mockContext.save).toHaveBeenCalledTimes(2);
    expect(mockContext.restore).toHaveBeenCalledTimes(2);
  });

  it('handles rendering errors gracefully', () => {
    const faultyEntity: RectEntity = {
      type: 'rect',
      x: 100,
      y: 100,
      width: 50,
      height: 50,
      fillColor: 'red',
    };

    // Make fillRect throw an error
    mockContext.fillRect.mockImplementation(() => {
      throw new Error('Rendering error');
    });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderer.addEntity(faultyEntity);
    
    expect(() => renderer.render()).not.toThrow();
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(mockContext.restore).toHaveBeenCalled(); // Should still restore context

    consoleErrorSpy.mockRestore();
  });

  it('clears canvas with background color when specified', () => {
    const rendererWithBg = new Renderer(mockContext, defaultCamera, {
      clearCanvas: true,
      backgroundColor: 'lightblue',
    });

    rendererWithBg.render();

    expect(mockContext.fillStyle).toBe('lightblue');
    expect(mockContext.fillRect).toHaveBeenCalledWith(0, 0, 800, 600);
  });

  it('skips canvas clearing when disabled', () => {
    const rendererNoClear = new Renderer(mockContext, defaultCamera, {
      clearCanvas: false,
    });

    rendererNoClear.render();

    expect(mockContext.clearRect).not.toHaveBeenCalled();
  });

  it('disposes resources correctly', () => {
    const rectEntity: RectEntity = {
      type: 'rect',
      x: 100,
      y: 100,
      width: 50,
      height: 50,
      fillColor: 'red',
    };

    renderer.addEntity(rectEntity);
    expect(renderer.getStats().totalEntities).toBe(1);

    renderer.dispose();

    const stats = renderer.getStats();
    expect(stats.totalEntities).toBe(0);
    expect(stats.imagesInCache).toBe(0);
  });

  it('provides accurate statistics', () => {
    const entity1: RectEntity = {
      type: 'rect',
      x: 100,
      y: 100,
      width: 50,
      height: 50,
      fillColor: 'red',
    };

    const entity2: RectEntity = {
      type: 'rect',
      x: 2000, // Outside view
      y: 2000,
      width: 50,
      height: 50,
      fillColor: 'blue',
    };

    renderer.addEntity(entity1);
    renderer.addEntity(entity2);

    const stats = renderer.getStats();
    
    expect(stats.totalEntities).toBe(2);
    expect(stats.visibleEntities).toBe(1);
    expect(stats.culledEntities).toBe(1);
    expect(stats.camera).toEqual(defaultCamera);
  });
});