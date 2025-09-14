import { Rectangle } from "../../types/game.types";

export class SpatialGrid {
  private width: number;
  private height: number;
  private cellSize: number;
  private cols: number;
  private rows: number;
  private grid: Set<string>[][];
  private objects: Map<string, Rectangle> = new Map();
  
  constructor(width: number, height: number, cellSize: number) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.cols = Math.ceil(width / cellSize);
    this.rows = Math.ceil(height / cellSize);
    
    // Initialize 2D grid with empty sets
    this.grid = Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => new Set<string>())
    );
  }

  getCellCount(): number {
    return this.cols * this.rows;
  }

  private getCellCoords(x: number, y: number): { col: number; row: number } {
    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);
    return {
      col: Math.max(0, Math.min(col, this.cols - 1)),
      row: Math.max(0, Math.min(row, this.rows - 1))
    };
  }

  private getCellsForRect(rect: Rectangle): { minCol: number; maxCol: number; minRow: number; maxRow: number } {
    const topLeft = this.getCellCoords(rect.x, rect.y);
    const bottomRight = this.getCellCoords(rect.x + rect.width - 1, rect.y + rect.height - 1);
    
    return {
      minCol: topLeft.col,
      maxCol: bottomRight.col,
      minRow: topLeft.row,
      maxRow: bottomRight.row
    };
  }

  insert(id: string, rect: Rectangle): void {
    // Remove from previous cells if already exists
    this.remove(id);
    
    // Store object
    this.objects.set(id, { ...rect });
    
    // Add to grid cells
    const cells = this.getCellsForRect(rect);
    for (let row = cells.minRow; row <= cells.maxRow; row++) {
      for (let col = cells.minCol; col <= cells.maxCol; col++) {
        this.grid[row][col].add(id);
      }
    }
  }

  remove(id: string): boolean {
    const rect = this.objects.get(id);
    if (!rect) return false;
    
    // Remove from grid cells
    const cells = this.getCellsForRect(rect);
    for (let row = cells.minRow; row <= cells.maxRow; row++) {
      for (let col = cells.minCol; col <= cells.maxCol; col++) {
        this.grid[row][col].delete(id);
      }
    }
    
    // Remove from objects map
    this.objects.delete(id);
    return true;
  }

  query(region: Rectangle): string[] {
    const candidates = new Set<string>();
    const cells = this.getCellsForRect(region);
    
    // Collect all candidates from relevant grid cells
    for (let row = cells.minRow; row <= cells.maxRow; row++) {
      for (let col = cells.minCol; col <= cells.maxCol; col++) {
        for (const id of this.grid[row][col]) {
          candidates.add(id);
        }
      }
    }
    
    // Filter candidates with precise AABB collision check
    const results: string[] = [];
    for (const id of candidates) {
      const obj = this.objects.get(id);
      if (obj && this.intersects(obj, region)) {
        results.push(id);
      }
    }
    
    return results;
  }

  private intersects(rect1: Rectangle, rect2: Rectangle): boolean {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  }

  clear(): void {
    this.objects.clear();
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        this.grid[row][col].clear();
      }
    }
  }

  getStats(): { totalObjects: number; cellsUsed: number; averageObjectsPerCell: number } {
    let cellsUsed = 0;
    let totalCellEntries = 0;
    
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.grid[row][col].size > 0) {
          cellsUsed++;
          totalCellEntries += this.grid[row][col].size;
        }
      }
    }
    
    return {
      totalObjects: this.objects.size,
      cellsUsed,
      averageObjectsPerCell: cellsUsed > 0 ? totalCellEntries / cellsUsed : 0
    };
  }
}
