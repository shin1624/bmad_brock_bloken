/**
 * Neon Theme Configuration
 * Bright neon colors with glowing effects for a retro-futuristic aesthetic
 */
import type { ThemeConfig } from "../types/ui.types";

export const neonTheme: ThemeConfig = {
  id: "neon",
  name: "neon",
  displayName: "Neon",
  description:
    "Bright neon colors with glowing effects for a retro-futuristic experience",
  colors: {
    // Primary colors - Electric green and magenta
    primary: "#00ff00", // Electric green
    secondary: "#ff00ff", // Electric magenta
    accent: "#00ffff", // Electric cyan

    // Background - Dark with subtle glow
    background: "#0a0a0a", // Near black
    backgroundSecondary: "#1a1a1a", // Dark gray

    // Game entities - Bright neon colors
    paddle: "#00ff00", // Electric green
    ball: "#ffffff", // Pure white

    // Block colors - Various neon hues
    blockNormal: "#ff0080", // Hot pink
    blockHard: "#ffff00", // Electric yellow
    blockIndestructible: "#ff8000", // Electric orange

    // UI text and borders
    text: "#ffffff", // Pure white
    textSecondary: "#cccccc", // Light gray
    border: "#00ff00", // Electric green

    // Status colors
    success: "#00ff00", // Electric green
    warning: "#ffff00", // Electric yellow
    error: "#ff0040", // Electric red

    // Particle effects
    particleDefault: "#ffffff", // White sparks
    particleDestroy: "#ff0080", // Hot pink explosion
    particlePowerUp: "#00ffff", // Cyan glow
  },
};
