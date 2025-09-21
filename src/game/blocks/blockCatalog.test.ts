import { describe, expect, it } from "vitest";

import {
  BlockCategory,
  BlockType,
  BlockTypeValue,
} from "../../types/editor.types";
import {
  BLOCK_COLORS,
  blockCategoryDescriptors,
  blockDefinitions,
  blockPaletteGroups,
  getBlockCategoryDescriptor,
  getBlockDefinition,
  getBlocksByCategory,
} from "./blockCatalog";

describe("blockCatalog", () => {
  it("returns matching block definitions by type", () => {
    const definition = getBlockDefinition(BlockType.SPECIAL);

    expect(definition.type).toBe(BlockType.SPECIAL);
    expect(definition.description).toContain("stage");
    expect(definition.visual.color).toMatch(/^#/);
  });

  it("falls back to normal block for unknown types", () => {
    const definition = getBlockDefinition("unknown" as BlockTypeValue);

    expect(definition.type).toBe(BlockType.NORMAL);
  });

  it("provides category descriptors with sorted order", () => {
    const orders = blockCategoryDescriptors.map((descriptor) => descriptor.order);
    expect([...orders].sort((a, b) => a - b)).toEqual(orders);
    expect(blockCategoryDescriptors[0]?.id).toBe(BlockCategory.CORE);
  });

  it("resolves category descriptors by id", () => {
    const descriptor = getBlockCategoryDescriptor(BlockCategory.POWER);
    expect(descriptor.label).toContain("Power-Up");
  });

  it("groups blocks by category with non-empty collections", () => {
    blockPaletteGroups.forEach((group) => {
      expect(group.category.label.length).toBeGreaterThan(0);
      expect(group.blocks.length).toBeGreaterThan(0);
      group.blocks.forEach((block) => {
        expect(block.category).toBe(group.category.id);
      });
    });
  });

  it("exposes blocks by category helper", () => {
    const defensiveBlocks = getBlocksByCategory(BlockCategory.DEFENSIVE);

    expect(defensiveBlocks.length).toBeGreaterThanOrEqual(1);
    expect(defensiveBlocks.every((block) => block.category === BlockCategory.DEFENSIVE)).toBe(
      true,
    );
  });

  it("maps block colors", () => {
    blockDefinitions.forEach((definition) => {
      expect(BLOCK_COLORS[definition.type]).toBe(definition.visual.color);
    });
  });
});
