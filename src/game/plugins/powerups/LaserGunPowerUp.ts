/**
 * LaserGunPowerUp Plugin
 * Story 4.3b - Phase 2 Advanced Power-ups
 *
 * Shoots laser projectiles from paddle edges
 * 2 shots per second for 20 seconds
 */
import { BasePowerUpPlugin } from "./BasePowerUpPlugin";
import { PowerUpPluginContext, EffectResult } from "../PowerUpPlugin";
import { PowerUpType, PowerUpEffect } from "../../entities/PowerUp";
import { ProjectileType } from "../../entities/Projectile";

/**
 * LaserGunPowerUp - Offensive projectile power-up
 *
 * AC2: Shoot projectiles from paddle edges at 2 shots/second for 20 seconds
 * AC3: ProjectileSystem manages laser projectiles with object pooling
 * Priority: Shield > Slow Motion > Magnet > Laser > Pierce
 */
export class LaserGunPowerUp extends BasePowerUpPlugin {
  private static readonly FIRE_RATE = 500; // 500ms = 2 shots per second
  private static readonly DURATION = 20000; // 20 seconds
  private static readonly PROJECTILE_SPEED = 500; // pixels per second
  private static readonly PROJECTILE_DAMAGE = 1; // instant block destruction
  private static readonly PROJECTILE_SIZE = { width: 4, height: 12 };
  private static readonly PROJECTILE_COLOR = "#FF0000"; // Red laser
  private static readonly PROJECTILE_GLOW = "#FF4444"; // Light red glow
  private static readonly AUDIO_VOLUME = 0.3; // "pew" sound volume

  private lastFireTime: number = 0;
  private isActive: boolean = false;

  constructor() {
    const effect: PowerUpEffect = {
      id: "laser_gun_effect",
      priority: 6, // Shield(10) > Slow Motion(8) > Magnet(7) > Laser(6) > Pierce(5)
      stackable: false,
      conflictsWith: [],
      apply: () => {},
      remove: () => {},
    };

    super(
      "LaserGunPowerUp",
      "1.0.0",
      PowerUpType.Laser,
      effect,
      "Shoots laser projectiles from paddle edges. 2 shots/second for 20 seconds.",
      [],
    );
  }

  protected onApplyEffect(context: PowerUpPluginContext): EffectResult {
    try {
      // Activate laser in game state
      if (context.gameState) {
        context.gameState.laserActive = true;
      }

      this.isActive = true;
      this.lastFireTime = Date.now();

      this.log(`Laser Gun activated: ${LaserGunPowerUp.DURATION}ms duration`);

      return {
        success: true,
        modified: true,
        data: {
          fireRate: LaserGunPowerUp.FIRE_RATE,
          duration: LaserGunPowerUp.DURATION,
          damage: LaserGunPowerUp.PROJECTILE_DAMAGE,
        },
      };
    } catch (error) {
      this.log(`Failed to apply Laser Gun effect: ${error}`, "error");
      return {
        success: false,
        modified: false,
        error: error as Error,
      };
    }
  }

  protected onRemoveEffect(context: PowerUpPluginContext): EffectResult {
    try {
      // Deactivate laser in game state
      if (context.gameState) {
        context.gameState.laserActive = false;
      }

      this.isActive = false;

      this.log("Laser Gun deactivated");

      return {
        success: true,
        modified: true,
        data: {
          laserActive: false,
        },
      };
    } catch (error) {
      this.log(`Failed to remove Laser Gun effect: ${error}`, "error");
      return {
        success: false,
        modified: false,
        error: error as Error,
      };
    }
  }

  /**
   * Update method called every frame
   * Fires lasers at specified rate
   */
  public onUpdate(context: PowerUpPluginContext, _deltaTime: number): void {
    if (!this.isActive) return;

    const now = Date.now();
    const timeSinceLastFire = now - this.lastFireTime;

    // Check if enough time has passed to fire again
    if (timeSinceLastFire >= LaserGunPowerUp.FIRE_RATE) {
      this.fireLaser(context);
      this.lastFireTime = now;
    }
  }

  /**
   * Fire laser projectiles from both paddle edges
   */
  private fireLaser(context: PowerUpPluginContext): void {
    const paddle = context.gameEntities?.paddle;
    const projectileSystem = context.projectileSystem;

    if (!paddle || !projectileSystem) {
      this.log(
        "Cannot fire laser: missing paddle or projectile system",
        "warn",
      );
      return;
    }

    // Fire from left edge
    const leftProjectile = projectileSystem.spawn({
      type: ProjectileType.LASER,
      position: {
        x: paddle.position.x - paddle.size.width / 2,
        y: paddle.position.y,
      },
      velocity: {
        x: 0,
        y: -LaserGunPowerUp.PROJECTILE_SPEED, // Upward
      },
      damage: LaserGunPowerUp.PROJECTILE_DAMAGE,
      size: LaserGunPowerUp.PROJECTILE_SIZE,
      color: LaserGunPowerUp.PROJECTILE_COLOR,
      glowColor: LaserGunPowerUp.PROJECTILE_GLOW,
    });

    // Fire from right edge
    const rightProjectile = projectileSystem.spawn({
      type: ProjectileType.LASER,
      position: {
        x: paddle.position.x + paddle.size.width / 2,
        y: paddle.position.y,
      },
      velocity: {
        x: 0,
        y: -LaserGunPowerUp.PROJECTILE_SPEED, // Upward
      },
      damage: LaserGunPowerUp.PROJECTILE_DAMAGE,
      size: LaserGunPowerUp.PROJECTILE_SIZE,
      color: LaserGunPowerUp.PROJECTILE_COLOR,
      glowColor: LaserGunPowerUp.PROJECTILE_GLOW,
    });

    // Play audio cue
    if (leftProjectile || rightProjectile) {
      this.playLaserSound(context);
    }

    // Emit laser fire event
    if (context.eventBus && (leftProjectile || rightProjectile)) {
      context.eventBus.emit("laser:fired", {
        position: paddle.position,
        projectileCount: (leftProjectile ? 1 : 0) + (rightProjectile ? 1 : 0),
      });
    }
  }

  /**
   * Play laser sound effect
   */
  private playLaserSound(context: PowerUpPluginContext): void {
    // Audio integration via AudioSystem
    if (context.audioSystem) {
      context.audioSystem.playSfx("laser_shot", LaserGunPowerUp.AUDIO_VOLUME);
    }
  }

  // Metadata methods
  protected getRarity(): string {
    return "epic";
  }

  protected getDuration(): number {
    return LaserGunPowerUp.DURATION;
  }

  protected getIcon(): string {
    return "🔫"; // Laser gun icon
  }

  protected getColor(): string {
    return "#EF4444"; // Red for offensive power-up
  }
}
