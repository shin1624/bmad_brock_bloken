/**
 * Custom hook for Block System integration
 * Manages block state, particle effects, and score updates in React
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { BlockManager, LevelDefinition } from '../game/systems/BlockManager';
import { ParticleSystem } from '../game/systems/ParticleSystem';
import { ScoreManager } from '../game/systems/ScoreManager';
import { Block } from '../game/entities/Block';
import { EventBus } from '../game/core/EventBus';
import { BlockType, BlockState, Vector2D } from '../types/game.types';

export interface BlockSystemState {
  blocks: BlockState[];
  remainingBlocks: number;
  currentLevel: number;
  isLevelComplete: boolean;
  isLoading: boolean;
  gridLayout: {
    columns: number;
    rows: number;
    cellWidth: number;
    cellHeight: number;
    spacing: number;
    offsetX: number;
    offsetY: number;
  };
}

export interface BlockSystemHook {
  // State
  blockState: BlockSystemState;
  
  // Actions
  loadLevel: (levelDefinition: LevelDefinition) => void;
  loadDefaultLevel: () => void;
  clearAllBlocks: () => void;
  resetLevel: () => void;
  
  // Block interactions
  handleBlockHit: (blockId: string) => { destroyed: boolean; score: number; combo: number };
  getBlockAt: (row: number, column: number) => Block | undefined;
  
  // System references (for advanced usage)
  blockManager: BlockManager | null;
  particleSystem: ParticleSystem | null;
  scoreManager: ScoreManager | null;
}

export const useBlockSystem = (
  eventBus: EventBus,
  canvasRef: React.RefObject<HTMLCanvasElement>
): BlockSystemHook => {
  // State
  const [blockState, setBlockState] = useState<BlockSystemState>({
    blocks: [],
    remainingBlocks: 0,
    currentLevel: 1,
    isLevelComplete: false,
    isLoading: false,
    gridLayout: {
      columns: 10,
      rows: 8,
      cellWidth: 75,
      cellHeight: 25,
      spacing: 5,
      offsetX: 50,
      offsetY: 100
    }
  });

  // System references
  const blockManagerRef = useRef<BlockManager | null>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const scoreManagerRef = useRef<ScoreManager | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Initialize systems
  useEffect(() => {
    if (!eventBus) return;

    // Initialize Block Manager
    blockManagerRef.current = new BlockManager(eventBus);
    
    // Initialize Particle System
    particleSystemRef.current = new ParticleSystem(eventBus, {
      maxParticles: 500,
      preFillCount: 50,
      enableDebugMode: process.env.NODE_ENV === 'development'
    });

    // Initialize Score Manager
    scoreManagerRef.current = new ScoreManager(eventBus);

    return () => {
      // Cleanup systems
      if (blockManagerRef.current) {
        blockManagerRef.current.clearAllBlocks();
      }
      if (particleSystemRef.current) {
        particleSystemRef.current.destroy();
      }
      if (scoreManagerRef.current) {
        scoreManagerRef.current.destroy();
      }
    };
  }, [eventBus]);

  // Setup event listeners
  useEffect(() => {
    if (!eventBus) return;

    const handleBlockDestroyed = (data: {
      blockId: string;
      type: BlockType;
      position: Vector2D;
      score: number;
      combo: number;
    }) => {
      updateBlockState();
    };

    const handleLevelLoaded = (data: {
      levelName: string;
      blockCount: number;
    }) => {
      setBlockState(prev => ({
        ...prev,
        isLoading: false,
        isLevelComplete: false
      }));
      updateBlockState();
    };

    const handleLevelCleared = (data: {
      level: number;
      totalScore: number;
      finalCombo: number;
    }) => {
      setBlockState(prev => ({
        ...prev,
        isLevelComplete: true
      }));
    };

    // Subscribe to events
    eventBus.on('block:destroyed', handleBlockDestroyed);
    eventBus.on('level:loaded', handleLevelLoaded);
    eventBus.on('level:cleared', handleLevelCleared);

    return () => {
      eventBus.off('block:destroyed', handleBlockDestroyed);
      eventBus.off('level:loaded', handleLevelLoaded);
      eventBus.off('level:cleared', handleLevelCleared);
    };
  }, [eventBus]);

  // Animation loop for particle system
  useEffect(() => {
    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTimeRef.current) / 1000; // Convert to seconds
      lastTimeRef.current = currentTime;

      // Update systems
      if (blockManagerRef.current) {
        blockManagerRef.current.update(deltaTime);
      }
      if (particleSystemRef.current) {
        particleSystemRef.current.update(deltaTime);
      }
      if (scoreManagerRef.current) {
        scoreManagerRef.current.update(deltaTime);
      }

      // Render to canvas
      if (canvasRef.current && canvasRef.current.getContext('2d')) {
        const ctx = canvasRef.current.getContext('2d')!;
        
        // Clear previous frame
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        
        // Render blocks
        if (blockManagerRef.current) {
          blockManagerRef.current.render(ctx);
        }
        
        // Render particles
        if (particleSystemRef.current) {
          particleSystemRef.current.render(ctx);
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [canvasRef]);

  // Update block state helper
  const updateBlockState = useCallback(() => {
    if (!blockManagerRef.current) return;

    const blocks = blockManagerRef.current.getBlockStates();
    const remainingBlocks = blockManagerRef.current.getRemainingDestructibleBlocks();
    const gridLayout = blockManagerRef.current.getGridLayout();

    setBlockState(prev => ({
      ...prev,
      blocks,
      remainingBlocks,
      gridLayout,
      isLevelComplete: remainingBlocks === 0
    }));
  }, []);

  // Actions
  const loadLevel = useCallback((levelDefinition: LevelDefinition) => {
    if (!blockManagerRef.current) return;

    setBlockState(prev => ({ ...prev, isLoading: true }));
    blockManagerRef.current.loadLevel(levelDefinition);
    
    // Clear particles when loading new level
    if (particleSystemRef.current) {
      particleSystemRef.current.clear();
    }
  }, []);

  const loadDefaultLevel = useCallback(() => {
    if (!blockManagerRef.current) return;

    setBlockState(prev => ({ ...prev, isLoading: true }));
    blockManagerRef.current.loadDefaultLevel();
  }, []);

  const clearAllBlocks = useCallback(() => {
    if (!blockManagerRef.current) return;

    blockManagerRef.current.clearAllBlocks();
    updateBlockState();
  }, [updateBlockState]);

  const resetLevel = useCallback(() => {
    clearAllBlocks();
    loadDefaultLevel();
  }, [clearAllBlocks, loadDefaultLevel]);

  const handleBlockHit = useCallback((blockId: string) => {
    if (!blockManagerRef.current) {
      return { destroyed: false, score: 0, combo: 0 };
    }

    const result = blockManagerRef.current.handleBlockHit(blockId);
    updateBlockState();
    return result;
  }, [updateBlockState]);

  const getBlockAt = useCallback((row: number, column: number) => {
    if (!blockManagerRef.current) return undefined;
    return blockManagerRef.current.getBlockAt(row, column);
  }, []);

  return {
    blockState,
    loadLevel,
    loadDefaultLevel,
    clearAllBlocks,
    resetLevel,
    handleBlockHit,
    getBlockAt,
    blockManager: blockManagerRef.current,
    particleSystem: particleSystemRef.current,
    scoreManager: scoreManagerRef.current
  };
};