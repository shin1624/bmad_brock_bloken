export interface LevelData {
  id: number;
  name: string;
  difficulty: "easy" | "normal" | "hard" | "expert";
  unlocked: boolean;
  bestScore?: number;
  thumbnail?: string;
  blockLayout: BlockConfiguration[];
  rows: number;
  cols: number;
  requiredScore?: number; // Score needed to unlock next level
}

export interface BlockConfiguration {
  row: number;
  col: number;
  type: "normal" | "hard" | "unbreakable" | "power";
  hits?: number;
  powerUpType?: string;
}

export interface LevelProgress {
  currentLevel: number;
  completedLevels: number[];
  levelScores: Record<number, number>;
  totalStars: number;
}

export type LevelStatus = "locked" | "available" | "completed" | "perfect";
