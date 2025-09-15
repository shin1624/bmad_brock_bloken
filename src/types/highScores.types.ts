export interface HighScore {
  id: string;
  playerName: string;
  score: number;
  level: number;
  difficulty: 'easy' | 'normal' | 'hard';
  timestamp: Date;
  duration: number; // seconds
  blocksDestroyed: number;
  perfectRounds: number;
}

export interface HighScoreStats {
  totalGames: number;
  bestScore: number;
  averageScore: number;
  favoriteLevel: number;
  totalPlayTime: number; // seconds
}

export interface HighScoreFilter {
  level?: number;
  difficulty?: HighScore['difficulty'];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface HighScoreSort {
  field: keyof HighScore;
  direction: 'asc' | 'desc';
}

export const HIGH_SCORES_STORAGE_KEY = 'game-high-scores';
export const HIGH_SCORES_STATS_KEY = 'game-high-scores-stats';
export const MAX_HIGH_SCORES = 100;