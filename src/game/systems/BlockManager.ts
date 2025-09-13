/**
 * Block Manager System
 * Handles block creation, placement, state management, and grid layout
 */
import { Block } from '../entities/Block';
import { BlockType, GridLayout, Vector2D, BlockState } from '../../types/game.types';
import { EventBus } from '../core/EventBus';

export interface LevelDefinition {
  name: string;
  blocks: {
    row: number;
    column: number;
    type: BlockType;
  }[];
}

export class BlockManager {
  private blocks: Map<string, Block>;
  private grid: GridLayout;
  private eventBus: EventBus;
  private currentLevel: number;
  private combo: number;
  private comboTimer: number;
  private readonly comboResetTime: number = 1; // 1 second (in seconds)

  constructor(eventBus: EventBus) {
    this.blocks = new Map();
    this.eventBus = eventBus;
    this.currentLevel = 1;
    this.combo = 0;
    this.comboTimer = 0;
    
    // Default grid layout (10 columns x 8 rows)
    this.grid = {
      columns: 10,
      rows: 8,
      cellWidth: 75,
      cellHeight: 25,
      spacing: 5,
      offsetX: 50,  // Start 50px from left edge
      offsetY: 100  // Start 100px from top
    };

    // Listen for game events
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for block interactions
   */
  private setupEventListeners(): void {
    this.eventBus.on('ball:blockCollision', (data: { blockId: string; ballId: string }) => {
      this.handleBlockHit(data.blockId);
    });
  }

  /**
   * Calculate position for a block at grid coordinates
   */
  private calculateBlockPosition(row: number, column: number): Vector2D {
    const x = this.grid.offsetX + column * (this.grid.cellWidth + this.grid.spacing);
    const y = this.grid.offsetY + row * (this.grid.cellHeight + this.grid.spacing);
    
    return { x, y };
  }

  /**
   * Create a block at specified grid position
   */
  public createBlock(type: BlockType, row: number, column: number): Block {
    // Validate grid bounds
    if (row < 0 || row >= this.grid.rows || column < 0 || column >= this.grid.columns) {
      throw new Error(`Invalid grid position: row ${row}, column ${column}`);
    }

    const position = this.calculateBlockPosition(row, column);
    const block = new Block(type, row, column, position);
    
    this.blocks.set(block.id, block);
    
    this.eventBus.emit('block:created', {
      blockId: block.id,
      type: type,
      position: position,
      gridRow: row,
      gridColumn: column
    });

    return block;
  }

  /**
   * Load a level from definition
   */
  public loadLevel(levelDefinition: LevelDefinition): void {
    // Clear existing blocks
    this.clearAllBlocks();
    
    // Create blocks according to level definition
    levelDefinition.blocks.forEach(blockDef => {
      this.createBlock(blockDef.type, blockDef.row, blockDef.column);
    });
    
    this.eventBus.emit('level:loaded', {
      levelName: levelDefinition.name,
      blockCount: levelDefinition.blocks.length
    });
  }

  /**
   * Generate a default test level
   */
  public loadDefaultLevel(): void {
    const defaultLevel: LevelDefinition = {
      name: 'Default Test Level',
      blocks: []
    };

    // Create a pattern with all block types
    for (let row = 0; row < 6; row++) {
      for (let column = 0; column < 10; column++) {
        let blockType: BlockType;
        
        if (row === 0) {
          blockType = BlockType.Indestructible; // Top row indestructible
        } else if (row <= 2) {
          blockType = BlockType.Hard; // Next 2 rows hard blocks
        } else {
          blockType = BlockType.Normal; // Bottom rows normal blocks
        }
        
        defaultLevel.blocks.push({ row, column, type: blockType });
      }
    }

    this.loadLevel(defaultLevel);
  }

  /**
   * Handle block hit from ball collision
   */
  public handleBlockHit(blockId: string): { destroyed: boolean; score: number; combo: number } {
    const block = this.blocks.get(blockId);
    if (!block || block.isDestroyed) {
      return { destroyed: false, score: 0, combo: this.combo };
    }

    const hitResult = block.hit();
    
    if (hitResult.destroyed) {
      // Update combo system
      this.combo++;
      this.comboTimer = 0; // Reset combo timer
      
      // Calculate bonus score from combo
      const comboBonus = this.combo > 1 ? Math.floor(hitResult.score * 0.1 * (this.combo - 1)) : 0;
      const totalScore = hitResult.score + comboBonus;

      // Emit block destroyed event
      this.eventBus.emit('block:destroyed', {
        blockId: block.id,
        type: block.type,
        position: block.position,
        score: totalScore,
        combo: this.combo,
        gridRow: block.gridRow,
        gridColumn: block.gridColumn
      });

      // Check if level is cleared
      if (this.getRemainingDestructibleBlocks() === 0) {
        this.eventBus.emit('level:cleared', {
          level: this.currentLevel,
          totalScore: totalScore,
          finalCombo: this.combo
        });
      }

      return { destroyed: true, score: totalScore, combo: this.combo };
    } else {
      // Block hit but not destroyed
      this.eventBus.emit('block:hit', {
        blockId: block.id,
        type: block.type,
        position: block.position, // Add position for particle effects
        currentHitPoints: block.currentHitPoints,
        maxHitPoints: block.maxHitPoints
      });

      return { destroyed: false, score: 0, combo: this.combo };
    }
  }

  /**
   * Update block manager state
   */
  public update(deltaTime: number): void {
    // Update combo timer
    if (this.combo > 0) {
      this.comboTimer += deltaTime;
      if (this.comboTimer >= this.comboResetTime) {
        this.combo = 0;
        this.comboTimer = 0;
        this.eventBus.emit('combo:reset', {});
      }
    }

    // Update all blocks
    this.blocks.forEach(block => {
      if (block.active) {
        block.update(deltaTime);
      }
    });
  }

  /**
   * Render all blocks
   */
  public render(ctx: CanvasRenderingContext2D): void {
    this.blocks.forEach(block => {
      if (block.active && !block.isDestroyed) {
        block.render(ctx);
      }
    });

    // Debug: Render grid lines (optional)
    if (process.env.NODE_ENV === 'development') {
      this.renderDebugGrid(ctx);
    }
  }

  /**
   * Render debug grid lines
   */
  private renderDebugGrid(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    // Vertical lines
    for (let col = 0; col <= this.grid.columns; col++) {
      const x = this.grid.offsetX + col * (this.grid.cellWidth + this.grid.spacing) - this.grid.spacing / 2;
      ctx.beginPath();
      ctx.moveTo(x, this.grid.offsetY - this.grid.spacing / 2);
      ctx.lineTo(x, this.grid.offsetY + this.grid.rows * (this.grid.cellHeight + this.grid.spacing));
      ctx.stroke();
    }

    // Horizontal lines
    for (let row = 0; row <= this.grid.rows; row++) {
      const y = this.grid.offsetY + row * (this.grid.cellHeight + this.grid.spacing) - this.grid.spacing / 2;
      ctx.beginPath();
      ctx.moveTo(this.grid.offsetX - this.grid.spacing / 2, y);
      ctx.lineTo(this.grid.offsetX + this.grid.columns * (this.grid.cellWidth + this.grid.spacing), y);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Get all active blocks
   */
  public getBlocks(): Block[] {
    return Array.from(this.blocks.values()).filter(block => block.active);
  }

  /**
   * Get block by ID
   */
  public getBlock(blockId: string): Block | undefined {
    return this.blocks.get(blockId);
  }

  /**
   * Get blocks at specific grid position
   */
  public getBlockAt(row: number, column: number): Block | undefined {
    return Array.from(this.blocks.values()).find(
      block => block.gridRow === row && block.gridColumn === column && block.active
    );
  }

  /**
   * Get number of remaining destructible blocks
   */
  public getRemainingDestructibleBlocks(): number {
    return Array.from(this.blocks.values()).filter(
      block => block.active && !block.isDestroyed && block.type !== BlockType.Indestructible
    ).length;
  }

  /**
   * Get current combo count
   */
  public getCombo(): number {
    return this.combo;
  }

  /**
   * Get block states for game state management
   */
  public getBlockStates(): BlockState[] {
    return Array.from(this.blocks.values())
      .filter(block => block.active)
      .map(block => ({
        id: block.id,
        position: { ...block.position },
        velocity: { dx: 0, dy: 0 },
        active: block.active,
        type: block.type,
        currentHitPoints: block.currentHitPoints,
        maxHitPoints: block.maxHitPoints,
        isDestroyed: block.isDestroyed,
        scoreValue: block.scoreValue,
        gridRow: block.gridRow,
        gridColumn: block.gridColumn
      }));
  }

  /**
   * Clear all blocks
   */
  public clearAllBlocks(): void {
    this.blocks.forEach(block => {
      this.eventBus.emit('block:removed', { blockId: block.id });
    });
    this.blocks.clear();
    this.combo = 0;
    this.comboTimer = 0;
  }

  /**
   * Get grid layout information
   */
  public getGridLayout(): GridLayout {
    return { ...this.grid };
  }

  /**
   * Update grid layout
   */
  public setGridLayout(newGrid: Partial<GridLayout>): void {
    this.grid = { ...this.grid, ...newGrid };
  }
}