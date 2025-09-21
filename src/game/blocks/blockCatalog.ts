import {
  BlockCategory,
  BlockCategoryDescriptor,
  BlockCategoryValue,
  BlockDefinition,
  BlockPaletteGroup,
  BlockType,
  BlockTypeValue,
} from "../../types/editor.types";

const CATEGORY_METADATA: BlockCategoryDescriptor[] = [
  {
    id: BlockCategory.CORE,
    label: "Core Blocks",
    description: "Baseline bricks used for most layouts",
    order: 0,
  },
  {
    id: BlockCategory.DEFENSIVE,
    label: "Defensive Blocks",
    description: "Resilient blocks that gate player progress",
    order: 1,
  },
  {
    id: BlockCategory.SPECIAL,
    label: "Special Blocks",
    description: "Blocks that trigger stage effects",
    order: 2,
  },
  {
    id: BlockCategory.POWER,
    label: "Power-Up Blocks",
    description: "Blocks that drop bonuses when destroyed",
    order: 3,
  },
];

const CATEGORY_BY_ID: Record<BlockCategoryValue, BlockCategoryDescriptor> =
  CATEGORY_METADATA.reduce(
    (acc, descriptor) => ({ ...acc, [descriptor.id]: descriptor }),
    {} as Record<BlockCategoryValue, BlockCategoryDescriptor>,
  );

const BLOCK_DEFINITION_LIST: BlockDefinition[] = [
  {
    type: BlockType.NORMAL,
    name: "Normal Block",
    category: BlockCategory.CORE,
    description: "Standard block with single-hit durability",
    durability: 1,
    points: 100,
    effects: ["Breaks after one hit", "Baseline score reward"],
    visual: {
      color: "#38bdf8",
      accentColor: "#0ea5e9",
      borderColor: "#0f172a",
      glowColor: "rgba(56, 189, 248, 0.45)",
      pattern: "solid",
    },
  },
  {
    type: BlockType.HARD,
    name: "Hard Block",
    category: BlockCategory.DEFENSIVE,
    description: "Reinforced block requiring multiple hits",
    durability: 2,
    points: 200,
    effects: ["Takes two hits to break", "Grants bonus score"],
    visual: {
      color: "#f97316",
      accentColor: "#fb923c",
      borderColor: "#7c2d12",
      glowColor: "rgba(251, 146, 60, 0.45)",
      pattern: "diagonal",
    },
  },
  {
    type: BlockType.INDESTRUCTIBLE,
    name: "Indestructible Block",
    category: BlockCategory.DEFENSIVE,
    description: "Permanent barrier block used for boundaries",
    durability: Number.POSITIVE_INFINITY,
    points: 0,
    effects: ["Cannot be destroyed", "Deflects ball trajectory"],
    visual: {
      color: "#64748b",
      accentColor: "#94a3b8",
      borderColor: "#1e293b",
      glowColor: "rgba(100, 116, 139, 0.35)",
      pattern: "solid",
    },
  },
  {
    type: BlockType.SPECIAL,
    name: "Special Block",
    category: BlockCategory.SPECIAL,
    description: "Triggers stage modifiers when destroyed",
    durability: 1,
    points: 150,
    effects: ["Activates scripted events", "Can chain reactions"],
    visual: {
      color: "#a855f7",
      accentColor: "#c084fc",
      borderColor: "#4c1d95",
      glowColor: "rgba(168, 85, 247, 0.45)",
      pattern: "radial",
    },
  },
  {
    type: BlockType.POWER,
    name: "Power-Up Block",
    category: BlockCategory.POWER,
    description: "Drops a random power-up pickup",
    durability: 1,
    points: 250,
    effects: ["Spawns bonus item", "Alters paddle or ball stats"],
    visual: {
      color: "#facc15",
      accentColor: "#fde047",
      borderColor: "#92400e",
      glowColor: "rgba(250, 204, 21, 0.5)",
      pattern: "radial",
    },
  },
];

const BLOCK_DEFINITIONS_BY_TYPE: Record<BlockTypeValue, BlockDefinition> =
  BLOCK_DEFINITION_LIST.reduce(
    (acc, definition) => ({ ...acc, [definition.type]: definition }),
    {} as Record<BlockTypeValue, BlockDefinition>,
  );

const DEFAULT_BLOCK_DEFINITION = BLOCK_DEFINITIONS_BY_TYPE[BlockType.NORMAL];

export const blockDefinitions: ReadonlyArray<BlockDefinition> = Object.freeze(
  [...BLOCK_DEFINITION_LIST],
);

export const blockCategoryDescriptors: ReadonlyArray<BlockCategoryDescriptor> = Object.freeze(
  [...CATEGORY_METADATA].sort((a, b) => a.order - b.order),
);

export const blockPaletteGroups: ReadonlyArray<BlockPaletteGroup> = Object.freeze(
  blockCategoryDescriptors
    .map((category) => ({
      category,
      blocks: blockDefinitions.filter((definition) => definition.category === category.id),
    }))
    .filter((group) => group.blocks.length > 0),
);

export const getBlockCategoryDescriptor = (
  category: BlockCategoryValue,
): BlockCategoryDescriptor => CATEGORY_BY_ID[category];

export const getBlockDefinition = (type: BlockTypeValue): BlockDefinition => {
  return BLOCK_DEFINITIONS_BY_TYPE[type] ?? DEFAULT_BLOCK_DEFINITION;
};

export const getBlocksByCategory = (
  category: BlockCategoryValue,
): ReadonlyArray<BlockDefinition> => {
  const group = blockPaletteGroups.find((blockGroup) => blockGroup.category.id === category);
  return group ? group.blocks : [];
};

export const BLOCK_COLORS: Record<BlockTypeValue, string> = Object.freeze(
  blockDefinitions.reduce(
    (acc, definition) => ({ ...acc, [definition.type]: definition.visual.color }),
    {} as Record<BlockTypeValue, string>,
  ),
);
