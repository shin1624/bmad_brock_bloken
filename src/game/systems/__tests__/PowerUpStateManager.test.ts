import { PowerUpStateManager, GameState } from '../PowerUpStateManager';
import { PowerUpConflictResolver } from '../PowerUpConflictResolver';
import { PowerUp, PowerUpType } from '../../entities/PowerUp';

describe('PowerUpStateManager', () => {
  let stateManager: PowerUpStateManager;
  let mockConflictResolver: jest.Mocked<PowerUpConflictResolver>;

  beforeEach(() => {
    mockConflictResolver = {
      resolveConflict: jest.fn(),
      validatePowerUpConfiguration: jest.fn(),
      addConflictRule: jest.fn(),
      removeConflictRule: jest.fn(),
      getConflictRule: jest.fn()
    } as any;

    stateManager = new PowerUpStateManager(mockConflictResolver);
  });

  describe('Power-Up Management', () => {
    test('should add power-up during gameplay', () => {
      stateManager.handleStateTransition(GameState.MENU, GameState.PLAYING);
      
      const powerUp = new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 });
      mockConflictResolver.resolveConflict.mockReturnValue({
        action: 'applied',
        removedPowerUps: []
      });

      const resolution = stateManager.addPowerUp(powerUp);

      expect(resolution.action).toBe('applied');
      expect(stateManager.getActivePowerUps()).toHaveLength(1);
      expect(mockConflictResolver.resolveConflict).toHaveBeenCalledWith(powerUp, []);
    });

    test('should reject power-up when not in playing state', () => {
      stateManager.handleStateTransition(GameState.MENU, GameState.PAUSED);
      
      const powerUp = new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 });
      const resolution = stateManager.addPowerUp(powerUp);

      expect(resolution.action).toBe('rejected');
      expect(resolution.message).toContain('during gameplay');
      expect(stateManager.getActivePowerUps()).toHaveLength(0);
    });

    test('should handle conflict resolution', () => {
      stateManager.handleStateTransition(GameState.MENU, GameState.PLAYING);
      
      const existingPowerUp = new PowerUp(PowerUpType.PaddleSize, { x: 0, y: 0 }, 'large');
      existingPowerUp.id = 'existing';
      stateManager.addPowerUp(existingPowerUp);

      const newPowerUp = new PowerUp(PowerUpType.PaddleSize, { x: 10, y: 10 }, 'small');
      mockConflictResolver.resolveConflict.mockReturnValue({
        action: 'overridden',
        removedPowerUps: [existingPowerUp]
      });

      const resolution = stateManager.addPowerUp(newPowerUp);

      expect(resolution.action).toBe('overridden');
      expect(stateManager.getActivePowerUps()).toHaveLength(1);
      expect(stateManager.getPowerUp('existing')).toBeUndefined();
    });
  });

  describe('Power-Up Queries', () => {
    beforeEach(() => {
      stateManager.handleStateTransition(GameState.MENU, GameState.PLAYING);
      mockConflictResolver.resolveConflict.mockReturnValue({
        action: 'applied',
        removedPowerUps: []
      });
    });

    test('should retrieve power-ups by type', () => {
      const multiBall1 = new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 });
      const multiBall2 = new PowerUp(PowerUpType.MultiBall, { x: 10, y: 10 });
      const paddleSize = new PowerUp(PowerUpType.PaddleSize, { x: 20, y: 20 });

      stateManager.addPowerUp(multiBall1);
      stateManager.addPowerUp(multiBall2);
      stateManager.addPowerUp(paddleSize);

      const multiBalls = stateManager.getPowerUpsByType(PowerUpType.MultiBall);
      expect(multiBalls).toHaveLength(2);

      const paddleSizes = stateManager.getPowerUpsByType(PowerUpType.PaddleSize);
      expect(paddleSizes).toHaveLength(1);
    });

    test('should check power-up type existence', () => {
      const powerUp = new PowerUp(PowerUpType.Shield, { x: 0, y: 0 });
      stateManager.addPowerUp(powerUp);

      expect(stateManager.hasPowerUpType(PowerUpType.Shield)).toBe(true);
      expect(stateManager.hasPowerUpType(PowerUpType.MultiBall)).toBe(false);
    });

    test('should get correct stack count', () => {
      const multiBall1 = new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 });
      const multiBall2 = new PowerUp(PowerUpType.MultiBall, { x: 10, y: 10 });

      stateManager.addPowerUp(multiBall1);
      stateManager.addPowerUp(multiBall2);

      expect(stateManager.getStackCount(PowerUpType.MultiBall)).toBe(2);
      expect(stateManager.getStackCount(PowerUpType.Shield)).toBe(0);
    });
  });

  describe('Power-Up Updates', () => {
    beforeEach(() => {
      stateManager.handleStateTransition(GameState.MENU, GameState.PLAYING);
      mockConflictResolver.resolveConflict.mockReturnValue({
        action: 'applied',
        removedPowerUps: []
      });
    });

    test('should update power-up remaining time', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 });
      powerUp.duration = 5000;
      powerUp.remainingTime = 5000;

      stateManager.addPowerUp(powerUp);

      const expired = stateManager.updatePowerUps(1000);

      expect(expired).toHaveLength(0);
      expect(powerUp.remainingTime).toBe(4000);
    });

    test('should remove expired power-ups', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 });
      powerUp.duration = 1000;
      powerUp.remainingTime = 500;

      stateManager.addPowerUp(powerUp);

      const expired = stateManager.updatePowerUps(1000);

      expect(expired).toHaveLength(1);
      expect(expired[0]).toBe(powerUp);
      expect(stateManager.getActivePowerUps()).toHaveLength(0);
    });

    test('should not update when paused', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 });
      powerUp.duration = 5000;
      powerUp.remainingTime = 5000;

      stateManager.addPowerUp(powerUp);
      stateManager.handleStateTransition(GameState.PLAYING, GameState.PAUSED);

      const expired = stateManager.updatePowerUps(1000);

      expect(expired).toHaveLength(0);
      expect(powerUp.remainingTime).toBe(5000); // Unchanged
    });
  });

  describe('State Transitions', () => {
    beforeEach(() => {
      stateManager.handleStateTransition(GameState.MENU, GameState.PLAYING);
      mockConflictResolver.resolveConflict.mockReturnValue({
        action: 'applied',
        removedPowerUps: []
      });
    });

    test('should pause power-ups when transitioning to paused state', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 });
      powerUp.duration = 5000;
      powerUp.remainingTime = 3000;

      stateManager.addPowerUp(powerUp);
      expect(stateManager.getActivePowerUps()).toHaveLength(1);

      stateManager.handleStateTransition(GameState.PLAYING, GameState.PAUSED);

      expect(stateManager.getActivePowerUps()).toHaveLength(0);
    });

    test('should restore power-ups when transitioning from paused to playing', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 });
      powerUp.duration = 5000;
      powerUp.remainingTime = 3000;
      powerUp.id = 'test-power-up';

      stateManager.addPowerUp(powerUp);
      stateManager.handleStateTransition(GameState.PLAYING, GameState.PAUSED);
      stateManager.handleStateTransition(GameState.PAUSED, GameState.PLAYING);

      const activePowerUps = stateManager.getActivePowerUps();
      expect(activePowerUps).toHaveLength(1);
      expect(activePowerUps[0].id).toBe('test-power-up');
      expect(activePowerUps[0].remainingTime).toBe(3000);
    });

    test('should clear power-ups when transitioning to game over', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 });
      stateManager.addPowerUp(powerUp);

      stateManager.handleStateTransition(GameState.PLAYING, GameState.GAME_OVER);

      expect(stateManager.getActivePowerUps()).toHaveLength(0);
    });

    test('should transfer only specific power-ups on level complete', () => {
      const multiBall = new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 });
      const scoreMultiplier = new PowerUp(PowerUpType.ScoreMultiplier, { x: 10, y: 10 });
      const extraLife = new PowerUp(PowerUpType.ExtraLife, { x: 20, y: 20 });

      stateManager.addPowerUp(multiBall);
      stateManager.addPowerUp(scoreMultiplier);
      stateManager.addPowerUp(extraLife);

      stateManager.handleStateTransition(GameState.PLAYING, GameState.LEVEL_COMPLETE);

      const activePowerUps = stateManager.getActivePowerUps();
      expect(activePowerUps).toHaveLength(2);
      
      const types = activePowerUps.map(p => p.type);
      expect(types).toContain(PowerUpType.ScoreMultiplier);
      expect(types).toContain(PowerUpType.ExtraLife);
      expect(types).not.toContain(PowerUpType.MultiBall);
    });

    test('should clear power-ups when transitioning to menu', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 });
      stateManager.addPowerUp(powerUp);

      stateManager.handleStateTransition(GameState.PLAYING, GameState.MENU);

      expect(stateManager.getActivePowerUps()).toHaveLength(0);
    });
  });

  describe('Validation', () => {
    test('should validate configuration correctly', () => {
      mockConflictResolver.validatePowerUpConfiguration.mockReturnValue({
        isValid: true,
        conflicts: []
      });

      const validation = stateManager.validateConfiguration();

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should detect invalid power-up configuration', () => {
      mockConflictResolver.validatePowerUpConfiguration.mockReturnValue({
        isValid: false,
        conflicts: [{
          type: PowerUpType.MultiBall,
          count: 5,
          maxAllowed: 3
        }]
      });

      const validation = stateManager.validateConfiguration();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0]).toContain('MultiBall');
    });

    test('should detect state inconsistency - paused without paused power-ups', () => {
      stateManager.handleStateTransition(GameState.MENU, GameState.PAUSED);

      const validation = stateManager.validateConfiguration();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Game is paused but no power-ups are in paused state');
    });
  });

  describe('Emergency Recovery', () => {
    beforeEach(() => {
      stateManager.handleStateTransition(GameState.MENU, GameState.PLAYING);
      mockConflictResolver.resolveConflict.mockReturnValue({
        action: 'applied',
        removedPowerUps: []
      });
    });

    test('should perform emergency reset', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 });
      stateManager.addPowerUp(powerUp);

      stateManager.emergencyReset();

      expect(stateManager.getActivePowerUps()).toHaveLength(0);
      expect(stateManager.getCurrentState()).toBe(GameState.MENU);
    });

    test('should emergency deactivate specific power-up', () => {
      const powerUp1 = new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 });
      powerUp1.id = 'power-up-1';
      const powerUp2 = new PowerUp(PowerUpType.Shield, { x: 10, y: 10 });
      powerUp2.id = 'power-up-2';

      stateManager.addPowerUp(powerUp1);
      stateManager.addPowerUp(powerUp2);

      const removed = stateManager.emergencyDeactivatePowerUp('power-up-1');

      expect(removed).toBe(true);
      expect(stateManager.getActivePowerUps()).toHaveLength(1);
      expect(stateManager.getPowerUp('power-up-1')).toBeUndefined();
      expect(stateManager.getPowerUp('power-up-2')).toBeDefined();
    });

    test('should emergency deactivate all power-ups of a type', () => {
      const multiBall1 = new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 });
      const multiBall2 = new PowerUp(PowerUpType.MultiBall, { x: 10, y: 10 });
      const shield = new PowerUp(PowerUpType.Shield, { x: 20, y: 20 });

      stateManager.addPowerUp(multiBall1);
      stateManager.addPowerUp(multiBall2);
      stateManager.addPowerUp(shield);

      const removedCount = stateManager.emergencyDeactivateType(PowerUpType.MultiBall);

      expect(removedCount).toBe(2);
      expect(stateManager.getActivePowerUps()).toHaveLength(1);
      expect(stateManager.getActivePowerUps()[0].type).toBe(PowerUpType.Shield);
    });
  });
});