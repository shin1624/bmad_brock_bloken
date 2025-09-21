import type { PropsWithChildren } from "react";
import { useDrag } from "react-dnd";

import type { BlockTypeValue, DragItem } from "../../types/editor.types";
import styles from "./DraggableBlock.module.css";

type GridOrigin = { x: number; y: number };

interface DraggableBlockProps {
  blockType: BlockTypeValue;
  fromPalette?: boolean;
  fromGrid?: GridOrigin;
  disabled?: boolean;
}

const buildDragItem = (
  blockType: BlockTypeValue,
  fromPalette: boolean,
  fromGrid: GridOrigin | undefined,
): DragItem => ({
  type: "block",
  blockType,
  fromPalette,
  fromGrid,
});

/**
 * Generic draggable wrapper used across palette and grid cells.
 */
export const DraggableBlock = ({
  blockType,
  fromPalette = false,
  fromGrid,
  disabled = false,
  children,
}: PropsWithChildren<DraggableBlockProps>): JSX.Element => {
  const [{ isDragging }, dragRef] = useDrag<DragItem, unknown, { isDragging: boolean }>(
    () => ({
      type: "block",
      item: buildDragItem(blockType, fromPalette, fromGrid),
      collect: (monitor) => ({
        isDragging: Boolean(monitor.isDragging()),
      }),
      canDrag: !disabled,
    }),
    [blockType, fromPalette, fromGrid, disabled],
  );

  return (
    <div
      ref={dragRef}
      className={styles.draggableBlock}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "move",
      }}
      data-dragging={isDragging ? "true" : undefined}
    >
      {children}
    </div>
  );
};
