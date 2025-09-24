/**
 * Enhanced Block entity tests for 90% coverage
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Block } from '../Block';
import type { BlockConfiguration } from '@/types/game.types';

describe('Block Entity - Enhanced Tests', () => {
  let block: Block;
  let config: BlockConfiguration;
  
  beforeEach(() => {
    config = {
      position: { x: 100, y: 50 },
      width: 60,
      height: 20,
      health: 1,
      points: 10,
      type: 'normal',
      color: '#FF0000',
      powerUp: null
    };
    block = new Block(config);
  });
  
  describe('Block Types', () => {
    it('should create normal block', () => {
      expect(block.type).toBe('normal');
      expect(block.health).toBe(1);
      expect(block.destructible).toBe(true);
    });
    
    it('should create hard block', () => {
      const hardBlock = new Block({ ...config, type: 'hard', health: 3 });
      expect(hardBlock.type).toBe('hard');
      expect(hardBlock.health).toBe(3);
      expect(hardBlock.maxHealth).toBe(3);
    });
    
    it('should create indestructible block', () => {
      const indestructible = new Block({ ...config, type: 'indestructible' });
      expect(indestructible.destructible).toBe(false);
      expect(indestructible.health).toBe(Infinity);
    });
    
    it('should create explosive block', () => {
      const explosive = new Block({ ...config, type: 'explosive' });
      expect(explosive.type).toBe('explosive');
      expect(explosive.isExplosive()).toBe(true);
    });
    
    it('should create bonus block with power-up', () => {
      const bonus = new Block({ ...config, type: 'bonus', powerUp: 'multiball' });
      expect(bonus.hasPowerUp()).toBe(true);
      expect(bonus.getPowerUp()).toBe('multiball');
    });
  });
  
  describe('Damage System', () => {
    it('should take damage correctly', () => {
      block.health = 3;
      block.takeDamage(1);
      expect(block.health).toBe(2);
      expect(block.isDestroyed()).toBe(false);
    });
    
    it('should be destroyed when health reaches zero', () => {
      block.takeDamage(1);
      expect(block.health).toBe(0);
      expect(block.isDestroyed()).toBe(true);
      expect(block.active).toBe(false);
    });
    
    it('should not take damage if indestructible', () => {
      block.destructible = false;
      block.health = Infinity;
      block.takeDamage(100);
      expect(block.health).toBe(Infinity);
      expect(block.isDestroyed()).toBe(false);
    });
    
    it('should calculate health percentage', () => {
      block.health = 2;
      block.maxHealth = 4;
      expect(block.getHealthPercentage()).toBe(50);
    });
    
    it('should trigger destruction effects', () => {
      const effects = block.destroy();
      expect(effects).toMatchObject({
        points: block.points,
        particles: expect.any(Array),
        powerUp: block.powerUp
      });
    });
  });
  
  describe('Visual State', () => {
    it('should update color based on health', () => {
      block.health = 3;
      block.maxHealth = 3;
      block.updateVisualState();
      expect(block.color).toBe('#FF0000'); // Full health
      
      block.health = 2;
      block.updateVisualState();
      expect(block.color).toBe('#FF8800'); // Medium health
      
      block.health = 1;
      block.updateVisualState();
      expect(block.color).toBe('#FFFF00'); // Low health
    });
    
    it('should show crack effects', () => {
      block.health = 2;
      block.maxHealth = 3;
      const cracks = block.getCrackPattern();
      expect(cracks).toHaveLength(1);
      
      block.health = 1;
      const moreCracks = block.getCrackPattern();
      expect(moreCracks.length).toBeGreaterThan(cracks.length);
    });
    
    it('should flash when hit', () => {
      vi.useFakeTimers();
      
      block.startHitFlash();
      expect(block.isFlashing).toBe(true);
      
      vi.advanceTimersByTime(200);
      block.updateFlash(200);
      expect(block.isFlashing).toBe(false);
      
      vi.useRealTimers();
    });
    
    it('should pulse for special blocks', () => {
      block.type = 'bonus';
      const pulse = block.getPulseAnimation();
      expect(pulse).toBeDefined();
      expect(pulse.frequency).toBeGreaterThan(0);
    });
  });
  
  describe('Collision Properties', () => {
    it('should calculate collision bounds', () => {
      const bounds = block.getCollisionBounds();
      expect(bounds).toEqual({
        left: 70,
        right: 130,
        top: 40,
        bottom: 60
      });
    });
    
    it('should detect point collision', () => {
      expect(block.containsPoint(100, 50)).toBe(true);
      expect(block.containsPoint(200, 50)).toBe(false);
    });
    
    it('should calculate collision normal', () => {
      const ballPos = { x: 100, y: 30 }; // Above block
      const normal = block.getCollisionNormal(ballPos);
      expect(normal).toEqual({ x: 0, y: -1 }); // Top normal
    });
    
    it('should handle corner collision normals', () => {
      const ballPos = { x: 65, y: 35 }; // Top-left corner
      const normal = block.getCollisionNormal(ballPos);
      expect(Math.abs(normal.x)).toBeGreaterThan(0);
      expect(Math.abs(normal.y)).toBeGreaterThan(0);
    });
  });
  
  describe('Explosive Blocks', () => {
    beforeEach(() => {
      block.type = 'explosive';
    });
    
    it('should calculate explosion radius', () => {
      const radius = block.getExplosionRadius();
      expect(radius).toBeGreaterThan(0);
    });
    
    it('should find blocks in explosion range', () => {
      const nearbyBlocks = [
        new Block({ ...config, position: { x: 120, y: 50 } }),
        new Block({ ...config, position: { x: 300, y: 50 } })
      ];
      
      const affected = block.getBlocksInExplosionRange(nearbyBlocks);
      expect(affected).toHaveLength(1);
      expect(affected[0].position.x).toBe(120);
    });
    
    it('should trigger chain reaction', () => {
      const explosive2 = new Block({ ...config, type: 'explosive', position: { x: 120, y: 50 } });
      const chain = block.triggerExplosion([explosive2]);
      
      expect(chain).toContain(explosive2);
    });
    
    it('should create explosion particles', () => {
      const particles = block.createExplosionParticles();
      expect(particles.length).toBeGreaterThan(10);
      expect(particles[0]).toMatchObject({
        position: expect.any(Object),
        velocity: expect.any(Object),
        color: expect.any(String)
      });
    });
  });
  
  describe('Special Block Behaviors', () => {
    it('should handle moving blocks', () => {
      block.type = 'moving';
      block.movementPattern = 'horizontal';
      block.movementSpeed = 50;
      
      const initialX = block.position.x;
      block.updateMovement(0.1);
      expect(block.position.x).not.toBe(initialX);
    });
    
    it('should handle regenerating blocks', () => {
      vi.useFakeTimers();
      
      block.type = 'regenerating';
      block.health = 1;
      block.maxHealth = 3;
      
      block.startRegeneration();
      vi.advanceTimersByTime(1000);
      block.updateRegeneration(1000);
      
      expect(block.health).toBe(2);
      
      vi.useRealTimers();
    });
    
    it('should handle invisible blocks', () => {
      block.type = 'invisible';
      expect(block.opacity).toBe(0);
      
      block.reveal();
      expect(block.opacity).toBeGreaterThan(0);
    });
    
    it('should handle color-changing blocks', () => {
      block.type = 'color-changing';
      const initialColor = block.color;
      
      block.cycleColor();
      expect(block.color).not.toBe(initialColor);
    });
  });
  
  describe('Points and Scoring', () => {
    it('should calculate base points', () => {
      expect(block.getPoints()).toBe(10);
    });
    
    it('should apply multiplier for special blocks', () => {
      block.type = 'hard';
      block.pointMultiplier = 2;
      expect(block.getPoints()).toBe(20);
    });
    
    it('should award combo points', () => {
      const comboPoints = block.getComboPoints(5);
      expect(comboPoints).toBe(50); // 10 * 5
    });
    
    it('should track destruction streak', () => {
      block.incrementStreak();
      block.incrementStreak();
      expect(block.getStreakBonus()).toBeGreaterThan(0);
    });
  });
  
  describe('Serialization', () => {
    it('should serialize to JSON', () => {
      const json = block.toJSON();
      expect(json).toMatchObject({
        id: block.id,
        type: block.type,
        position: block.position,
        health: block.health,
        powerUp: block.powerUp
      });
    });
    
    it('should deserialize from JSON', () => {
      const data = {
        id: 'block-123',
        type: 'hard',
        position: { x: 200, y: 100 },
        health: 2,
        powerUp: 'multiball'
      };
      
      block.fromJSON(data);
      
      expect(block.id).toBe('block-123');
      expect(block.type).toBe('hard');
      expect(block.position).toEqual(data.position);
      expect(block.health).toBe(2);
    });
    
    it('should maintain state consistency after serialization', () => {
      block.health = 2;
      block.takeDamage(1);
      
      const json = block.toJSON();
      const newBlock = new Block(config);
      newBlock.fromJSON(json);
      
      expect(newBlock.health).toBe(1);
      expect(newBlock.isDestroyed()).toBe(false);
    });
  });
  
  describe('Performance Optimizations', () => {
    it('should cache collision bounds', () => {
      const bounds1 = block.getCollisionBounds();
      const bounds2 = block.getCollisionBounds();
      expect(bounds1).toBe(bounds2); // Same reference
    });
    
    it('should skip updates when inactive', () => {
      block.active = false;
      const spy = vi.spyOn(block, 'updateVisualState');
      
      block.update(0.016);
      expect(spy).not.toHaveBeenCalled();
    });
    
    it('should use spatial hashing', () => {
      const hash = block.getSpatialHash();
      expect(hash).toMatch(/^\d+,\d+$/);
      
      const block2 = new Block({ ...config, position: { x: 100, y: 50 } });
      expect(block2.getSpatialHash()).toBe(hash); // Same grid cell
    });
  });
  
  describe('Render Data', () => {
    it('should prepare render data', () => {
      const renderData = block.getRenderData();
      
      expect(renderData).toMatchObject({
        x: block.position.x,
        y: block.position.y,
        width: block.width,
        height: block.height,
        color: block.color,
        opacity: block.opacity,
        effects: expect.any(Array)
      });
    });
    
    it('should include damage effects in render data', () => {
      block.health = 1;
      block.maxHealth = 3;
      
      const renderData = block.getRenderData();
      expect(renderData.effects).toContainEqual(
        expect.objectContaining({ type: 'cracks' })
      );
    });
    
    it('should include glow effect for special blocks', () => {
      block.type = 'bonus';
      block.powerUp = 'multiball';
      
      const renderData = block.getRenderData();
      expect(renderData.effects).toContainEqual(
        expect.objectContaining({ type: 'glow' })
      );
    });
  });
});