import { useCallback, useEffect, useState } from 'react';
import { 
  HighScore, 
  HighScoreStats, 
  HighScoreFilter, 
  HighScoreSort,
  HIGH_SCORES_STORAGE_KEY,
  HIGH_SCORES_STATS_KEY,
  MAX_HIGH_SCORES
} from '../types/highScores.types';

interface UseHighScoresReturn {
  highScores: HighScore[];
  filteredScores: HighScore[];
  stats: HighScoreStats;
  isLoading: boolean;
  error: string | null;
  
  // CRUD operations
  addHighScore: (score: Omit<HighScore, 'id' | 'timestamp'>) => Promise<void>;
  deleteHighScore: (id: string) => Promise<void>;
  clearAllScores: () => Promise<void>;
  
  // Filtering and sorting
  setFilter: (filter: HighScoreFilter) => void;
  setSort: (sort: HighScoreSort) => void;
  resetFilters: () => void;
  
  // Pagination
  currentPage: number;
  totalPages: number;
  pageSize: number;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  
  // Data management
  loadHighScores: () => Promise<void>;
  exportScores: () => string;
  importScores: (data: string) => Promise<void>;
}

const DEFAULT_STATS: HighScoreStats = {
  totalGames: 0,
  bestScore: 0,
  averageScore: 0,
  favoriteLevel: 1,
  totalPlayTime: 0
};

const DEFAULT_SORT: HighScoreSort = {
  field: 'score',
  direction: 'desc'
};

export const useHighScores = (): UseHighScoresReturn => {
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [filteredScores, setFilteredScores] = useState<HighScore[]>([]);
  const [stats, setStats] = useState<HighScoreStats>(DEFAULT_STATS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter and sort state
  const [currentFilter, setCurrentFilter] = useState<HighScoreFilter>({});
  const [currentSort, setCurrentSort] = useState<HighScoreSort>(DEFAULT_SORT);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Calculate total pages
  const totalPages = Math.ceil(filteredScores.length / pageSize);

  // Apply filters and sorting
  const applyFiltersAndSort = useCallback((scores: HighScore[]) => {
    let filtered = [...scores];

    // Apply filters
    if (currentFilter.level !== undefined) {
      filtered = filtered.filter(score => score.level === currentFilter.level);
    }

    if (currentFilter.difficulty) {
      filtered = filtered.filter(score => score.difficulty === currentFilter.difficulty);
    }

    if (currentFilter.dateRange) {
      const { start, end } = currentFilter.dateRange;
      filtered = filtered.filter(score => {
        const scoreDate = new Date(score.timestamp);
        return scoreDate >= start && scoreDate <= end;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[currentSort.field];
      const bValue = b[currentSort.field];
      
      let comparison = 0;
      if (aValue < bValue) {
        comparison = -1;
      } else if (aValue > bValue) {
        comparison = 1;
      }
      
      return currentSort.direction === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [currentFilter, currentSort]);

  // Update filtered scores when scores or filters change
  useEffect(() => {
    const filtered = applyFiltersAndSort(highScores);
    setFilteredScores(filtered);
    
    // Reset to first page if current page is out of bounds
    const maxPages = Math.ceil(filtered.length / pageSize);
    if (currentPage > maxPages && maxPages > 0) {
      setCurrentPage(1);
    }
  }, [highScores, applyFiltersAndSort, currentPage, pageSize]);

  // Calculate statistics
  const calculateStats = useCallback((scores: HighScore[]): HighScoreStats => {
    if (scores.length === 0) {
      return DEFAULT_STATS;
    }

    const totalGames = scores.length;
    const bestScore = Math.max(...scores.map(s => s.score));
    const averageScore = scores.reduce((sum, s) => sum + s.score, 0) / totalGames;
    const totalPlayTime = scores.reduce((sum, s) => sum + s.duration, 0);
    
    // Find most frequently played level
    const levelCounts = scores.reduce((acc, s) => {
      acc[s.level] = (acc[s.level] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    const favoriteLevel = parseInt(
      Object.keys(levelCounts).reduce((a, b) => 
        levelCounts[parseInt(a)] > levelCounts[parseInt(b)] ? a : b
      )
    );

    return {
      totalGames,
      bestScore,
      averageScore: Math.round(averageScore),
      favoriteLevel,
      totalPlayTime
    };
  }, []);

  // Load high scores from localStorage
  const loadHighScores = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const scoresData = localStorage.getItem(HIGH_SCORES_STORAGE_KEY);
      const statsData = localStorage.getItem(HIGH_SCORES_STATS_KEY);

      let scores: HighScore[] = [];
      if (scoresData) {
        scores = JSON.parse(scoresData);
        // Convert timestamp strings back to Date objects
        scores = scores.map(score => ({
          ...score,
          timestamp: new Date(score.timestamp)
        }));
      }

      let loadedStats = DEFAULT_STATS;
      if (statsData) {
        loadedStats = JSON.parse(statsData);
      } else {
        // Calculate stats from scores if stats don't exist
        loadedStats = calculateStats(scores);
      }

      setHighScores(scores);
      setStats(loadedStats);
      
      // Simulate async loading
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load high scores';
      setError(errorMessage);
      console.error('Failed to load high scores:', err);
    } finally {
      setIsLoading(false);
    }
  }, [calculateStats]);

  // Save high scores to localStorage
  const saveHighScores = useCallback(async (scores: HighScore[], newStats: HighScoreStats) => {
    try {
      localStorage.setItem(HIGH_SCORES_STORAGE_KEY, JSON.stringify(scores));
      localStorage.setItem(HIGH_SCORES_STATS_KEY, JSON.stringify(newStats));
    } catch (err) {
      console.error('Failed to save high scores:', err);
      throw new Error('Failed to save high scores');
    }
  }, []);

  // Add new high score
  const addHighScore = useCallback(async (scoreData: Omit<HighScore, 'id' | 'timestamp'>) => {
    const newScore: HighScore = {
      ...scoreData,
      id: crypto.randomUUID(),
      timestamp: new Date()
    };

    const updatedScores = [...highScores, newScore]
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_HIGH_SCORES); // Keep only top scores

    const updatedStats = calculateStats(updatedScores);

    setHighScores(updatedScores);
    setStats(updatedStats);

    await saveHighScores(updatedScores, updatedStats);
  }, [highScores, calculateStats, saveHighScores]);

  // Delete high score
  const deleteHighScore = useCallback(async (id: string) => {
    const updatedScores = highScores.filter(score => score.id !== id);
    const updatedStats = calculateStats(updatedScores);

    setHighScores(updatedScores);
    setStats(updatedStats);

    await saveHighScores(updatedScores, updatedStats);
  }, [highScores, calculateStats, saveHighScores]);

  // Clear all scores
  const clearAllScores = useCallback(async () => {
    setHighScores([]);
    setStats(DEFAULT_STATS);
    setCurrentPage(1);

    await saveHighScores([], DEFAULT_STATS);
  }, [saveHighScores]);

  // Filter operations
  const setFilter = useCallback((filter: HighScoreFilter) => {
    setCurrentFilter(filter);
    setCurrentPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setCurrentFilter({});
    setCurrentPage(1);
  }, []);

  // Sort operations
  const setSort = useCallback((sort: HighScoreSort) => {
    setCurrentSort(sort);
    setCurrentPage(1);
  }, []);

  // Export/Import operations
  const exportScores = useCallback(() => {
    const exportData = {
      highScores,
      stats,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    return JSON.stringify(exportData, null, 2);
  }, [highScores, stats]);

  const importScores = useCallback(async (data: string) => {
    try {
      const importData = JSON.parse(data);
      
      if (!importData.highScores || !Array.isArray(importData.highScores)) {
        throw new Error('Invalid import data format');
      }

      // Validate and convert imported scores
      const validScores: HighScore[] = importData.highScores.map((score: any) => ({
        ...score,
        timestamp: new Date(score.timestamp),
        id: score.id || crypto.randomUUID()
      }));

      // Merge with existing scores and remove duplicates
      const mergedScores = [...highScores, ...validScores]
        .filter((score, index, arr) => 
          arr.findIndex(s => s.id === score.id) === index
        )
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_HIGH_SCORES);

      const updatedStats = calculateStats(mergedScores);

      setHighScores(mergedScores);
      setStats(updatedStats);

      await saveHighScores(mergedScores, updatedStats);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import scores';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [highScores, calculateStats, saveHighScores]);

  // Load scores on mount
  useEffect(() => {
    loadHighScores();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    highScores,
    filteredScores,
    stats,
    isLoading,
    error,
    addHighScore,
    deleteHighScore,
    clearAllScores,
    setFilter,
    setSort,
    resetFilters,
    currentPage,
    totalPages,
    pageSize,
    setCurrentPage,
    setPageSize,
    loadHighScores,
    exportScores,
    importScores
  };
};