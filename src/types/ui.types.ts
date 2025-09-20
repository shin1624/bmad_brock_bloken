/**
 * UI and Theme types for Block Breaker Game
 */

// Theme Color Configuration
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  backgroundSecondary: string;
  paddle: string;
  ball: string;
  blockNormal: string;
  blockHard: string;
  blockIndestructible: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  particleDefault: string;
  particleDestroy: string;
  particlePowerUp: string;
}

// Complete Theme Configuration
export interface ThemeConfig {
  id: string;
  name: string;
  displayName: string;
  description: string;
  colors: ThemeColors;
}
