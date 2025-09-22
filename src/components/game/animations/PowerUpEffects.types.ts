/**
 * PowerUp Visual Effects Types
 * Type definitions for power-up visual effects
 */
import { PowerUpType } from "../../../game/entities/PowerUp";

// Effect types for different power-up events
export enum EffectType {
  Activation = "activation",
  Collection = "collection",
  Expiration = "expiration",
  Impact = "impact",
}

// Effect configuration interface
export interface PowerUpEffect {
  id: string;
  type: EffectType;
  powerUpType: PowerUpType;
  position: { x: number; y: number };
  duration: number;
  variant?: string;
  strength?: number;
}
