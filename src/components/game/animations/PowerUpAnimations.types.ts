/**
 * PowerUp Animations Types
 * Type definitions for power-up animations
 */
import { PowerUpType } from "../HUD/PowerUpStatus";

// Animation types
export enum PowerUpAnimationType {
  Spawn = "spawn",
  Pickup = "pickup",
  Activate = "activate",
  Expire = "expire",
}

// Animation event interface
export interface PowerUpAnimationEvent {
  id: string;
  type: PowerUpAnimationType;
  powerUpType: PowerUpType;
  position: { x: number; y: number };
  color: string;
  icon: string;
  duration?: number;
}
