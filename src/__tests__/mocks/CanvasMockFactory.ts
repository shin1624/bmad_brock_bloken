/**
 * Canvas Mock Factory
 * Critical infrastructure for unit testing Canvas-based game components
 * Addresses Risk: Canvas API availability in test environment (9/9 severity)
 */

import { vi } from 'vitest';

export interface MockCanvasContext {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  globalAlpha: number;
  globalCompositeOperation: string;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  
  // Drawing methods
  fillRect: ReturnType<typeof vi.fn>;
  strokeRect: ReturnType<typeof vi.fn>;
  clearRect: ReturnType<typeof vi.fn>;
  
  // Path methods
  beginPath: ReturnType<typeof vi.fn>;
  closePath: ReturnType<typeof vi.fn>;
  moveTo: ReturnType<typeof vi.fn>;
  lineTo: ReturnType<typeof vi.fn>;
  arc: ReturnType<typeof vi.fn>;
  arcTo: ReturnType<typeof vi.fn>;
  bezierCurveTo: ReturnType<typeof vi.fn>;
  quadraticCurveTo: ReturnType<typeof vi.fn>;
  rect: ReturnType<typeof vi.fn>;
  
  // Drawing path
  fill: ReturnType<typeof vi.fn>;
  stroke: ReturnType<typeof vi.fn>;
  clip: ReturnType<typeof vi.fn>;
  
  // Text
  fillText: ReturnType<typeof vi.fn>;
  strokeText: ReturnType<typeof vi.fn>;
  measureText: ReturnType<typeof vi.fn>;
  
  // Transformations
  save: ReturnType<typeof vi.fn>;
  restore: ReturnType<typeof vi.fn>;
  translate: ReturnType<typeof vi.fn>;
  rotate: ReturnType<typeof vi.fn>;
  scale: ReturnType<typeof vi.fn>;
  transform: ReturnType<typeof vi.fn>;
  setTransform: ReturnType<typeof vi.fn>;
  resetTransform: ReturnType<typeof vi.fn>;
  
  // Image drawing
  drawImage: ReturnType<typeof vi.fn>;
  createImageData: ReturnType<typeof vi.fn>;
  getImageData: ReturnType<typeof vi.fn>;
  putImageData: ReturnType<typeof vi.fn>;
  
  // Gradients and patterns
  createLinearGradient: ReturnType<typeof vi.fn>;
  createRadialGradient: ReturnType<typeof vi.fn>;
  createPattern: ReturnType<typeof vi.fn>;
  
  // Line styles
  setLineDash: ReturnType<typeof vi.fn>;
  getLineDash: ReturnType<typeof vi.fn>;
  lineDashOffset: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  miterLimit: number;
}

export interface MockCanvas {
  width: number;
  height: number;
  getContext: ReturnType<typeof vi.fn>;
  toDataURL: ReturnType<typeof vi.fn>;
  toBlob: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  getBoundingClientRect: ReturnType<typeof vi.fn>;
  style: Partial<CSSStyleDeclaration>;
}

export class CanvasMockFactory {
  private static defaultWidth = 800;
  private static defaultHeight = 600;
  
  /**
   * Creates a fully mocked 2D canvas context with all methods stubbed
   */
  static createContext2D(overrides?: Partial<MockCanvasContext>): MockCanvasContext {
    const context: MockCanvasContext = {
      // Properties
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      shadowColor: 'rgba(0, 0, 0, 0)',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      font: '10px sans-serif',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      lineDashOffset: 0,
      lineCap: 'butt',
      lineJoin: 'miter',
      miterLimit: 10,
      
      // Drawing rectangles
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      clearRect: vi.fn(),
      
      // Drawing paths
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      arcTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      rect: vi.fn(),
      
      // Drawing path
      fill: vi.fn(),
      stroke: vi.fn(),
      clip: vi.fn(),
      
      // Drawing text
      fillText: vi.fn(),
      strokeText: vi.fn(),
      measureText: vi.fn(() => ({
        width: 100,
        actualBoundingBoxAscent: 10,
        actualBoundingBoxDescent: 3,
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: 100,
        fontBoundingBoxAscent: 12,
        fontBoundingBoxDescent: 4
      })),
      
      // Transformations
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      transform: vi.fn(),
      setTransform: vi.fn(),
      resetTransform: vi.fn(),
      
      // Image drawing
      drawImage: vi.fn(),
      createImageData: vi.fn((width: number, height: number) => ({
        width,
        height,
        data: new Uint8ClampedArray(width * height * 4),
        colorSpace: 'srgb' as PredefinedColorSpace
      })),
      getImageData: vi.fn((sx: number, sy: number, sw: number, sh: number) => ({
        width: sw,
        height: sh,
        data: new Uint8ClampedArray(sw * sh * 4),
        colorSpace: 'srgb' as PredefinedColorSpace
      })),
      putImageData: vi.fn(),
      
      // Gradients and patterns
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn()
      })),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn()
      })),
      createPattern: vi.fn(() => null),
      
      // Line styles
      setLineDash: vi.fn(),
      getLineDash: vi.fn(() => []),
      
      // Apply any overrides
      ...overrides
    };
    
    return context;
  }
  
  /**
   * Creates a fully mocked canvas element
   */
  static createCanvas(
    width = CanvasMockFactory.defaultWidth,
    height = CanvasMockFactory.defaultHeight,
    contextOverrides?: Partial<MockCanvasContext>
  ): MockCanvas {
    const context = CanvasMockFactory.createContext2D(contextOverrides);
    
    const canvas: MockCanvas = {
      width,
      height,
      style: {},
      
      getContext: vi.fn((contextId: string) => {
        if (contextId === '2d') {
          return context;
        }
        return null;
      }),
      
      toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
      
      toBlob: vi.fn((callback: BlobCallback) => {
        callback(new Blob(['mock'], { type: 'image/png' }));
      }),
      
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      
      getBoundingClientRect: vi.fn(() => ({
        x: 0,
        y: 0,
        width,
        height,
        top: 0,
        right: width,
        bottom: height,
        left: 0
      }))
    };
    
    return canvas;
  }
  
  /**
   * Creates a mock for OffscreenCanvas
   */
  static createOffscreenCanvas(
    width = CanvasMockFactory.defaultWidth,
    height = CanvasMockFactory.defaultHeight
  ): any {
    const context = CanvasMockFactory.createContext2D();
    
    return {
      width,
      height,
      getContext: vi.fn(() => context),
      convertToBlob: vi.fn(() => Promise.resolve(new Blob(['mock'], { type: 'image/png' }))),
      transferToImageBitmap: vi.fn()
    };
  }
  
  /**
   * Installs canvas mocks globally for the test environment
   */
  static install(): void {
    // Mock HTMLCanvasElement
    global.HTMLCanvasElement = class {
      width = CanvasMockFactory.defaultWidth;
      height = CanvasMockFactory.defaultHeight;
      style: any = {};
      
      getContext = vi.fn(() => CanvasMockFactory.createContext2D());
      toDataURL = vi.fn(() => 'data:image/png;base64,mock');
      toBlob = vi.fn((cb: BlobCallback) => cb(new Blob(['mock'], { type: 'image/png' })));
      addEventListener = vi.fn();
      removeEventListener = vi.fn();
      getBoundingClientRect = vi.fn(() => ({
        x: 0,
        y: 0,
        width: this.width,
        height: this.height,
        top: 0,
        right: this.width,
        bottom: this.height,
        left: 0
      }));
    } as any;
    
    // Mock OffscreenCanvas if not available
    if (typeof OffscreenCanvas === 'undefined') {
      (global as any).OffscreenCanvas = class {
        width: number;
        height: number;
        
        constructor(width: number, height: number) {
          this.width = width;
          this.height = height;
        }
        
        getContext = vi.fn(() => CanvasMockFactory.createContext2D());
        convertToBlob = vi.fn(() => Promise.resolve(new Blob(['mock'], { type: 'image/png' })));
        transferToImageBitmap = vi.fn();
      };
    }
    
    // Mock createImageBitmap if not available
    if (typeof createImageBitmap === 'undefined') {
      (global as any).createImageBitmap = vi.fn(() => Promise.resolve({
        width: CanvasMockFactory.defaultWidth,
        height: CanvasMockFactory.defaultHeight,
        close: vi.fn()
      }));
    }
    
    // Mock Image constructor
    (global as any).Image = class {
      width = 0;
      height = 0;
      src = '';
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      
      constructor() {
        setTimeout(() => {
          this.width = 100;
          this.height = 100;
          if (this.onload) this.onload();
        }, 0);
      }
    };
  }
  
  /**
   * Uninstalls canvas mocks from the global scope
   */
  static uninstall(): void {
    delete (global as any).HTMLCanvasElement;
    delete (global as any).OffscreenCanvas;
    delete (global as any).createImageBitmap;
    delete (global as any).Image;
  }
  
  /**
   * Creates a spy wrapper for tracking canvas operations
   */
  static createCanvasSpy(canvas: MockCanvas): {
    canvas: MockCanvas;
    getDrawCalls: () => Array<{ method: string; args: any[] }>;
    reset: () => void;
  } {
    const drawCalls: Array<{ method: string; args: any[] }> = [];
    const context = canvas.getContext('2d') as MockCanvasContext;
    
    // Wrap all drawing methods to track calls
    const methods = [
      'fillRect', 'strokeRect', 'clearRect',
      'beginPath', 'closePath', 'moveTo', 'lineTo', 'arc',
      'fill', 'stroke', 'fillText', 'strokeText', 'drawImage'
    ];
    
    methods.forEach(method => {
      const original = (context as any)[method];
      (context as any)[method] = vi.fn((...args: any[]) => {
        drawCalls.push({ method, args });
        return original(...args);
      });
    });
    
    return {
      canvas,
      getDrawCalls: () => [...drawCalls],
      reset: () => {
        drawCalls.length = 0;
        methods.forEach(method => {
          ((context as any)[method] as any).mockClear();
        });
      }
    };
  }
  
  /**
   * Helper to assert canvas drawing operations
   */
  static createCanvasAssertions(context: MockCanvasContext) {
    return {
      expectRect: (x: number, y: number, width: number, height: number, filled = true) => {
        const method = filled ? context.fillRect : context.strokeRect;
        expect(method).toHaveBeenCalledWith(x, y, width, height);
      },
      
      expectCircle: (x: number, y: number, radius: number, filled = true) => {
        expect(context.beginPath).toHaveBeenCalled();
        expect(context.arc).toHaveBeenCalledWith(x, y, radius, 0, Math.PI * 2);
        const method = filled ? context.fill : context.stroke;
        expect(method).toHaveBeenCalled();
      },
      
      expectText: (text: string, x: number, y: number, filled = true) => {
        const method = filled ? context.fillText : context.strokeText;
        expect(method).toHaveBeenCalledWith(text, x, y);
      },
      
      expectClear: (x = 0, y = 0, width?: number, height?: number) => {
        if (width !== undefined && height !== undefined) {
          expect(context.clearRect).toHaveBeenCalledWith(x, y, width, height);
        } else {
          expect(context.clearRect).toHaveBeenCalled();
        }
      },
      
      expectStyle: (property: keyof MockCanvasContext, value: any) => {
        expect(context[property]).toBe(value);
      },
      
      expectTransform: (type: 'translate' | 'rotate' | 'scale', ...args: number[]) => {
        expect((context as any)[type]).toHaveBeenCalledWith(...args);
      },
      
      expectSaveRestore: () => {
        expect(context.save).toHaveBeenCalled();
        expect(context.restore).toHaveBeenCalled();
        expect(context.restore).toHaveBeenCalledTimes(context.save.mock.calls.length);
      }
    };
  }
}

// Export for convenience
export const installCanvasMocks = () => CanvasMockFactory.install();
export const uninstallCanvasMocks = () => CanvasMockFactory.uninstall();
export const createMockCanvas = CanvasMockFactory.createCanvas;
export const createMockContext2D = CanvasMockFactory.createContext2D;
export const createCanvasSpy = CanvasMockFactory.createCanvasSpy;
export const createCanvasAssertions = CanvasMockFactory.createCanvasAssertions;