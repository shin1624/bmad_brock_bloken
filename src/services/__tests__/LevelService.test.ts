import { beforeEach, describe, expect, it } from "vitest";

import { LevelService } from "../LevelService";

const SAMPLE_BLOCKS = [
  {
    type: "normal",
    x: 0,
    y: 0,
  },
  {
    type: "hard",
    x: 1,
    y: 0,
    durability: 2,
  },
];

describe("LevelService", () => {
  beforeEach(() => {
    LevelService.clearAll();
    localStorage.clear();
  });

  it("saves and lists levels", () => {
    const saved = LevelService.saveLevel({
      name: "Test Level",
      rows: 10,
      cols: 12,
      cellSize: 32,
      blocks: SAMPLE_BLOCKS,
    });

    const summaries = LevelService.listLevels();

    expect(saved.name).toBe("Test Level");
    expect(summaries).toHaveLength(1);
    expect(summaries[0].id).toBe(saved.id);
  });

  it("updates existing level when id is provided", () => {
    const first = LevelService.saveLevel({
      name: "Original",
      rows: 10,
      cols: 10,
      cellSize: 32,
      blocks: SAMPLE_BLOCKS,
    });

    const updated = LevelService.saveLevel({
      id: first.id,
      name: "Updated",
      rows: 12,
      cols: 12,
      cellSize: 28,
      blocks: SAMPLE_BLOCKS,
    });

    expect(updated.id).toBe(first.id);
    expect(updated.name).toBe("Updated");
    expect(updated.rows).toBe(12);

    const summaries = LevelService.listLevels();
    expect(summaries).toHaveLength(1);
    expect(summaries[0].name).toBe("Updated");
  });

  it("loads and deletes a level", () => {
    const saved = LevelService.saveLevel({
      name: "To Delete",
      rows: 8,
      cols: 8,
      cellSize: 24,
      blocks: SAMPLE_BLOCKS,
    });

    const loaded = LevelService.loadLevel(saved.id);
    expect(loaded?.name).toBe("To Delete");

    LevelService.deleteLevel(saved.id);
    const afterDelete = LevelService.loadLevel(saved.id);

    expect(afterDelete).toBeUndefined();
    expect(LevelService.listLevels()).toHaveLength(0);
  });
});
