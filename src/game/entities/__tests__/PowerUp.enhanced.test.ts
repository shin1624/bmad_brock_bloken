import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PowerUp, PowerUpType } from '../PowerUp';
import { GameEvents } from '../../core/GameEvents';
import type { Paddle } from '../Paddle';
import type { Ball } from '../Ball';

describe('PowerUp Entity', () => {
  let powerUp: PowerUp;
  let mockEventBus: GameEvents;
  let mockPaddle: Paddle;
  let mockBall: Ball;

  beforeEach(() => {
    mockEventBus = new GameEvents();
    mockPaddle = {
      x: 400,
      y: 550,
      width: 100,
      height: 20,
      getBounds: () => ({ x: 400, y: 550, width: 100, height: 20 })
    } as Paddle;
    
    mockBall = {
      x: 400,
      y: 300,
      radius: 5,
      velocity: { x: 2, y: -3 }
    } as Ball;
  });

  describe('Initialization', () => {
    it('should initialize with correct properties', () => {
      powerUp = new PowerUp(PowerUpType.EXPAND_PADDLE, 100, 100, mockEventBus);
      
      expect(powerUp.type).toBe(PowerUpType.EXPAND_PADDLE);
      expect(powerUp.x).toBe(100);
      expect(powerUp.y).toBe(100);
      expect(powerUp.isActive).toBe(false);
      expect(powerUp.isCollected).toBe(false);
    });

    it('should have correct dimensions', () => {
      powerUp = new PowerUp(PowerUpType.MULTI_BALL, 0, 0, mockEventBus);
      
      expect(powerUp.width).toBe(30);
      expect(powerUp.height).toBe(30);
    });

    it('should set fall speed', () => {
      powerUp = new PowerUp(PowerUpType.SLOW_BALL, 0, 0, mockEventBus);
      
      expect(powerUp.fallSpeed).toBeGreaterThan(0);
      expect(powerUp.fallSpeed).toBeLessThanOrEqual(3);
    });
  });

  describe('Movement', () => {
    it('should fall downward', () => {
      powerUp = new PowerUp(PowerUpType.EXPAND_PADDLE, 100, 100, mockEventBus);
      const initialY = powerUp.y;
      
      powerUp.update(16); // ~60fps
      
      expect(powerUp.y).toBeGreaterThan(initialY);
    });

    it('should maintain horizontal position', () => {
      powerUp = new PowerUp(PowerUpType.LASER, 100, 100, mockEventBus);
      const initialX = powerUp.x;
      
      powerUp.update(16);
      
      expect(powerUp.x).toBe(initialX);
    });

    it('should accelerate over time', () => {
      powerUp = new PowerUp(PowerUpType.STICKY_PADDLE, 100, 100, mockEventBus);
      powerUp.enableAcceleration(true);
      
      const speed1 = powerUp.fallSpeed;
      powerUp.update(1000); // 1 second
      const speed2 = powerUp.fallSpeed;
      
      expect(speed2).toBeGreaterThan(speed1);
    });

    it('should cap at max speed', () => {
      powerUp = new PowerUp(PowerUpType.SHIELD, 100, 100, mockEventBus);
      powerUp.enableAcceleration(true);
      
      for (let i = 0; i < 100; i++) {
        powerUp.update(100);
      }
      
      expect(powerUp.fallSpeed).toBeLessThanOrEqual(8); // Max speed
    });
  });

  describe('Collection', () => {
    it('should detect collision with paddle', () => {
      powerUp = new PowerUp(PowerUpType.EXPAND_PADDLE, 425, 540, mockEventBus);
      
      const collides = powerUp.checkCollision(mockPaddle);
      expect(collides).toBe(true);
    });

    it('should not detect collision when above paddle', () => {
      powerUp = new PowerUp(PowerUpType.MULTI_BALL, 425, 400, mockEventBus);
      
      const collides = powerUp.checkCollision(mockPaddle);
      expect(collides).toBe(false);
    });

    it('should mark as collected on collision', () => {
      powerUp = new PowerUp(PowerUpType.LASER, 425, 540, mockEventBus);
      
      powerUp.collect();
      
      expect(powerUp.isCollected).toBe(true);
      expect(powerUp.isActive).toBe(false);
    });

    it('should emit collection event', () => {
      const collectSpy = vi.fn();
      mockEventBus.on('powerup:collected', collectSpy);
      
      powerUp = new PowerUp(PowerUpType.SLOW_BALL, 0, 0, mockEventBus);
      powerUp.collect();
      
      expect(collectSpy).toHaveBeenCalledWith({
        type: 'powerup:collected',
        powerUpType: PowerUpType.SLOW_BALL,
        position: { x: 0, y: 0 }
      });
    });
  });

  describe('Power-Up Effects', () => {
    describe('Paddle Modifications', () => {
      it('should expand paddle width', () => {
        powerUp = new PowerUp(PowerUpType.EXPAND_PADDLE, 0, 0, mockEventBus);
        const effect = powerUp.applyEffect(mockPaddle, mockBall);
        
        expect(effect.paddleWidth).toBe(150); // 1.5x
        expect(effect.duration).toBe(10000); // 10 seconds
      });

      it('should shrink paddle width', () => {
        powerUp = new PowerUp(PowerUpType.SHRINK_PADDLE, 0, 0, mockEventBus);
        const effect = powerUp.applyEffect(mockPaddle, mockBall);
        
        expect(effect.paddleWidth).toBe(50); // 0.5x
        expect(effect.duration).toBe(10000);
      });

      it('should enable sticky paddle', () => {
        powerUp = new PowerUp(PowerUpType.STICKY_PADDLE, 0, 0, mockEventBus);
        const effect = powerUp.applyEffect(mockPaddle, mockBall);
        
        expect(effect.sticky).toBe(true);
        expect(effect.duration).toBe(15000);
      });

      it('should enable laser cannon', () => {
        powerUp = new PowerUp(PowerUpType.LASER, 0, 0, mockEventBus);
        const effect = powerUp.applyEffect(mockPaddle, mockBall);
        
        expect(effect.laser).toBe(true);
        expect(effect.laserAmmo).toBe(20);
        expect(effect.duration).toBe(12000);
      });
    });

    describe('Ball Modifications', () => {
      it('should slow ball speed', () => {
        powerUp = new PowerUp(PowerUpType.SLOW_BALL, 0, 0, mockEventBus);
        const effect = powerUp.applyEffect(mockPaddle, mockBall);
        
        expect(effect.ballSpeedMultiplier).toBe(0.5);
        expect(effect.duration).toBe(8000);
      });

      it('should increase ball speed', () => {
        powerUp = new PowerUp(PowerUpType.FAST_BALL, 0, 0, mockEventBus);
        const effect = powerUp.applyEffect(mockPaddle, mockBall);
        
        expect(effect.ballSpeedMultiplier).toBe(1.5);
        expect(effect.duration).toBe(8000);
      });

      it('should enable fire ball', () => {
        powerUp = new PowerUp(PowerUpType.FIRE_BALL, 0, 0, mockEventBus);
        const effect = powerUp.applyEffect(mockPaddle, mockBall);
        
        expect(effect.fireBall).toBe(true);
        expect(effect.penetrating).toBe(true);
        expect(effect.duration).toBe(7000);
      });

      it('should enable multi-ball', () => {
        powerUp = new PowerUp(PowerUpType.MULTI_BALL, 0, 0, mockEventBus);
        const effect = powerUp.applyEffect(mockPaddle, mockBall);
        
        expect(effect.multiBall).toBe(true);
        expect(effect.ballCount).toBe(3);
        expect(effect.immediate).toBe(true);
      });
    });

    describe('Game Modifications', () => {
      it('should add extra life', () => {
        powerUp = new PowerUp(PowerUpType.EXTRA_LIFE, 0, 0, mockEventBus);
        const effect = powerUp.applyEffect(mockPaddle, mockBall);
        
        expect(effect.extraLife).toBe(1);
        expect(effect.immediate).toBe(true);
      });

      it('should provide shield', () => {
        powerUp = new PowerUp(PowerUpType.SHIELD, 0, 0, mockEventBus);
        const effect = powerUp.applyEffect(mockPaddle, mockBall);
        
        expect(effect.shield).toBe(true);
        expect(effect.shieldHits).toBe(3);
        expect(effect.duration).toBe(20000);
      });

      it('should activate magnet', () => {
        powerUp = new PowerUp(PowerUpType.MAGNET, 0, 0, mockEventBus);
        const effect = powerUp.applyEffect(mockPaddle, mockBall);
        
        expect(effect.magnet).toBe(true);
        expect(effect.magnetStrength).toBeGreaterThan(0);
        expect(effect.duration).toBe(12000);
      });
    });
  });

  describe('Serialization', () => {
    it('should serialize to JSON', () => {
      powerUp = new PowerUp(PowerUpType.EXPAND_PADDLE, 100, 200, mockEventBus);
      powerUp.isActive = true;
      
      const json = powerUp.toJSON();
      
      expect(json).toEqual({
        id: powerUp.id,
        type: PowerUpType.EXPAND_PADDLE,
        x: 100,
        y: 200,
        isActive: true,
        isCollected: false,
        fallSpeed: powerUp.fallSpeed
      });
    });

    it('should deserialize from JSON', () => {
      const data = {
        id: 'test-id',
        type: PowerUpType.MULTI_BALL,
        x: 150,
        y: 250,
        isActive: true,
        isCollected: false,
        fallSpeed: 2.5
      };
      
      powerUp = PowerUp.fromJSON(data, mockEventBus);
      
      expect(powerUp.id).toBe('test-id');
      expect(powerUp.type).toBe(PowerUpType.MULTI_BALL);
      expect(powerUp.x).toBe(150);
      expect(powerUp.y).toBe(250);
      expect(powerUp.isActive).toBe(true);
      expect(powerUp.fallSpeed).toBe(2.5);
    });
  });

  describe('Lifecycle', () => {
    it('should activate when spawned', () => {
      powerUp = new PowerUp(PowerUpType.LASER, 100, 100, mockEventBus);
      
      powerUp.spawn();
      
      expect(powerUp.isActive).toBe(true);
      expect(powerUp.isCollected).toBe(false);
    });

    it('should deactivate when out of bounds', () => {
      powerUp = new PowerUp(PowerUpType.SHIELD, 100, 650, mockEventBus);
      powerUp.isActive = true;
      
      powerUp.update(16, { height: 600 });
      
      expect(powerUp.isActive).toBe(false);
    });

    it('should cleanup on destroy', () => {
      const removeSpy = vi.spyOn(mockEventBus, 'removeAllListeners');
      
      powerUp = new PowerUp(PowerUpType.EXTRA_LIFE, 0, 0, mockEventBus);
      powerUp.destroy();
      
      expect(powerUp.isActive).toBe(false);
      expect(powerUp.isCollected).toBe(false);
    });
  });

  describe('Visual Properties', () => {
    it('should have correct color for each type', () => {
      const colorMap = {
        [PowerUpType.EXPAND_PADDLE]: '#00FF00',
        [PowerUpType.SHRINK_PADDLE]: '#FF0000',
        [PowerUpType.MULTI_BALL]: '#0088FF',
        [PowerUpType.SLOW_BALL]: '#FFAA00',
        [PowerUpType.FAST_BALL]: '#FF00FF',
        [PowerUpType.EXTRA_LIFE]: '#FFD700',
        [PowerUpType.LASER]: '#FF0088',
        [PowerUpType.STICKY_PADDLE]: '#00FFAA',
        [PowerUpType.FIRE_BALL]: '#FF4400',
        [PowerUpType.SHIELD]: '#8800FF',
        [PowerUpType.MAGNET]: '#888888'
      };
      
      Object.entries(colorMap).forEach(([type, color]) => {
        const pu = new PowerUp(type as PowerUpType, 0, 0, mockEventBus);
        expect(pu.color).toBe(color);
      });
    });

    it('should have icons for each type', () => {
      Object.values(PowerUpType).forEach(type => {
        const pu = new PowerUp(type, 0, 0, mockEventBus);
        expect(pu.icon).toBeDefined();
        expect(pu.icon).not.toBe('');
      });
    });

    it('should support custom visual properties', () => {
      powerUp = new PowerUp(PowerUpType.LASER, 0, 0, mockEventBus);
      
      powerUp.setVisualProperties({
        color: '#CUSTOM',
        icon: '⚡',
        glowIntensity: 0.8
      });
      
      expect(powerUp.color).toBe('#CUSTOM');
      expect(powerUp.icon).toBe('⚡');
      expect(powerUp.glowIntensity).toBe(0.8);
    });
  });

  describe('Animation', () => {
    it('should animate floating motion', () => {
      powerUp = new PowerUp(PowerUpType.EXPAND_PADDLE, 100, 100, mockEventBus);
      const initialX = powerUp.x;
      
      powerUp.enableFloating(true);
      
      for (let i = 0; i < 60; i++) {
        powerUp.update(16);
      }
      
      // Should oscillate around initial position
      expect(Math.abs(powerUp.x - initialX)).toBeLessThan(10);
    });

    it('should rotate while falling', () => {
      powerUp = new PowerUp(PowerUpType.MULTI_BALL, 0, 0, mockEventBus);
      powerUp.enableRotation(true);
      
      const initialRotation = powerUp.rotation;
      powerUp.update(100);
      
      expect(powerUp.rotation).not.toBe(initialRotation);
    });

    it('should pulse when near collection', () => {
      powerUp = new PowerUp(PowerUpType.EXTRA_LIFE, 425, 520, mockEventBus);
      
      powerUp.update(16, { paddle: mockPaddle });
      
      expect(powerUp.isPulsing).toBe(true);
      expect(powerUp.pulseScale).toBeGreaterThan(1);
    });
  });

  describe('Performance', () => {
    it('should update efficiently', () => {
      const powerUps: PowerUp[] = [];
      
      for (let i = 0; i < 100; i++) {
        powerUps.push(new PowerUp(
          PowerUpType.EXPAND_PADDLE,
          Math.random() * 800,
          Math.random() * 600,
          mockEventBus
        ));
      }
      
      const startTime = performance.now();
      
      for (let frame = 0; frame < 60; frame++) {
        powerUps.forEach(p => p.update(16));
      }
      
      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(100); // 60 frames for 100 power-ups
    });

    it('should handle rapid collection', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        const pu = new PowerUp(PowerUpType.LASER, 0, 0, mockEventBus);
        pu.collect();
        pu.applyEffect(mockPaddle, mockBall);
      }
      
      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(50);
    });
  });
});