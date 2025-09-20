/**
 * Particle system types for visual effects
 */

// Particle lifecycle states
export enum ParticleState {
  Spawn = "spawn",
  Active = "active",
  Decay = "decay",
  Dead = "dead",
}

// Emitter patterns for particle emission
export enum EmitterPattern {
  Burst = "burst",       // Single burst of particles
  Continuous = "continuous", // Continuous stream of particles
  Trail = "trail",       // Trail following an entity
}
