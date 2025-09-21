import { useMemo, useState } from "react";
import type { CSSProperties } from "react";

import {
  blockPaletteGroups,
  getBlockCategoryDescriptor,
  getBlockDefinition,
} from "../../../game/blocks/blockCatalog";
import { useEditorStore } from "../../../stores/editorStore";
import {
  BlockDefinition,
  BlockTypeValue,
  EditorTool,
} from "../../../types/editor.types";
import { DraggableBlock } from "../DraggableBlock";
import styles from "./BlockPalette.module.css";

const formatDurability = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "∞";
  }

  return `${value}`;
};

const buildPreviewStyle = (definition: BlockDefinition): CSSProperties => {
  const { visual } = definition;
  const baseStyle: CSSProperties = {
    borderColor: visual.borderColor,
    boxShadow: visual.glowColor
      ? `0 0 24px 6px ${visual.glowColor}`
      : `0 0 0 1px ${visual.accentColor}`,
  };

  if (visual.pattern === "diagonal") {
    return {
      ...baseStyle,
      background: `repeating-linear-gradient(135deg, ${visual.color}, ${visual.color} 12px, ${visual.accentColor} 12px, ${visual.accentColor} 24px)`,
    };
  }

  if (visual.pattern === "radial") {
    return {
      ...baseStyle,
      background: `radial-gradient(circle at center, ${visual.accentColor} 0%, ${visual.color} 60%)`,
    };
  }

  return {
    ...baseStyle,
    background: visual.color,
  };
};

const BlockPreview = ({ definition }: { definition: BlockDefinition }): JSX.Element => {
  const durability = formatDurability(definition.durability);
  const style = useMemo(() => buildPreviewStyle(definition), [definition]);
  const categoryDescriptor = useMemo(
    () => getBlockCategoryDescriptor(definition.category),
    [definition.category],
  );

  return (
    <aside className={styles.previewPanel} aria-live="polite" data-testid="block-preview">
      <h3 className={styles.previewTitle}>{definition.name}</h3>
      <p className={styles.previewDescription}>{definition.description}</p>

      <div
        className={styles.previewBlock}
        style={style}
        aria-label={`${definition.name} preview`}
        data-testid="block-preview-visual"
      >
        <span className={styles.previewLabel}>{categoryDescriptor.label}</span>
      </div>

      <dl className={styles.previewMeta}>
        <div>
          <dt>Durability</dt>
          <dd>{durability}</dd>
        </div>
        <div>
          <dt>Points</dt>
          <dd>{definition.points}</dd>
        </div>
        <div className={styles.previewEffects}>
          <dt>Effects</dt>
          <dd>
            <ul>
              {definition.effects.map((effect) => (
                <li key={effect}>{effect}</li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>
    </aside>
  );
};

const BlockPalette = (): JSX.Element => {
  const [hoveredType, setHoveredType] = useState<BlockTypeValue | null>(null);
  const selectedBlockType = useEditorStore((state) => state.selectedBlockType);
  const setSelectedBlockType = useEditorStore((state) => state.setSelectedBlockType);
  const setSelectedTool = useEditorStore((state) => state.setSelectedTool);

  const previewDefinition = useMemo(
    () => getBlockDefinition(hoveredType ?? selectedBlockType),
    [hoveredType, selectedBlockType],
  );

  return (
    <section className={styles.palette} aria-label="ブロックパレット">
      <header className={styles.header}>
        <h2 className={styles.title}>Block Palette</h2>
        <p className={styles.subtitle}>Choose a block type to paint onto the grid</p>
      </header>

      <div className={styles.content}>
        <div className={styles.groups}>
          {blockPaletteGroups.map((group) => (
            <section
              key={group.category.id}
              className={styles.group}
              aria-labelledby={`block-group-${group.category.id}`}
            >
              <div className={styles.groupHeader}>
                <h3 id={`block-group-${group.category.id}`} className={styles.groupTitle}>
                  {group.category.label}
                </h3>
                <p className={styles.groupDescription}>{group.category.description}</p>
              </div>
              <ul className={styles.list} data-testid={`block-group-${group.category.id}`}>
                {group.blocks.map((block) => {
                  const isActive = block.type === selectedBlockType;
                  const isHovered = block.type === hoveredType;
                  const tooltipId = `block-tooltip-${block.type}`;

                  const handleSelect = () => {
                    setSelectedBlockType(block.type);
                    setSelectedTool(EditorTool.PLACE);
                  };

                  return (
                    <li key={block.type}>
                      <DraggableBlock blockType={block.type} fromPalette>
                        <button
                          type="button"
                          className={isActive ? styles.activeOption : styles.option}
                          data-block-type={block.type}
                          aria-pressed={isActive}
                          aria-describedby={tooltipId}
                          onClick={handleSelect}
                          onMouseEnter={() => setHoveredType(block.type)}
                          onMouseLeave={() => setHoveredType(null)}
                          onFocus={() => setHoveredType(block.type)}
                          onBlur={() => setHoveredType(null)}
                        >
                          <span
                            className={styles.swatch}
                            style={{
                              background: block.visual.color,
                              borderColor: block.visual.borderColor,
                              boxShadow: block.visual.glowColor
                                ? `0 0 0 1px ${block.visual.accentColor}, 0 0 10px ${block.visual.glowColor}`
                                : `0 0 0 1px ${block.visual.accentColor}`,
                            }}
                            aria-hidden="true"
                          />
                          <span className={styles.optionBody}>
                            <span className={styles.optionLabel}>{block.name}</span>
                            <span className={styles.optionDescription}>{block.description}</span>
                            <span className={styles.optionMeta}>
                              {formatDurability(block.durability)} hit
                              {Number.isFinite(block.durability) && block.durability > 1 ? "s" : ""} ·
                              {` ${block.points} pts`}
                            </span>
                          </span>
                          <span
                            id={tooltipId}
                            role="tooltip"
                            className={isHovered ? styles.tooltipVisible : styles.tooltip}
                            data-testid={`block-tooltip-${block.type}`}
                            data-visible={isHovered}
                          >
                            Durability: {formatDurability(block.durability)} / Points: {block.points}
                          </span>
                        </button>
                      </DraggableBlock>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <BlockPreview definition={previewDefinition} />
      </div>
    </section>
  );
};

export default BlockPalette;
