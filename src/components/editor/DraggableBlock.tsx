import React from 'react';
import { useDrag } from 'react-dnd';
import { BlockType, DragItem } from '../../types/editor.types';
import styles from './DraggableBlock.module.css';

interface DraggableBlockProps {
  blockType: BlockType;
  fromPalette?: boolean;
  fromGrid?: { x: number; y: number };
  children: React.ReactNode;
  disabled?: boolean;
}

/**
 * Draggable block component that can be dragged from palette or grid
 */
export const DraggableBlock: React.FC<DraggableBlockProps> = ({
  blockType,
  fromPalette = false,
  fromGrid,
  children,
  disabled = false,
}) => {
  const [{ isDragging }, drag, preview] = useDrag<DragItem, unknown, { isDragging: boolean }>(() => ({
    type: 'block',
    item: {
      type: 'block',
      blockType,
      fromPalette,
      fromGrid,
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
    canDrag: !disabled,
  }), [blockType, fromPalette, fromGrid, disabled]);

  return (
    <div
      ref={drag}
      className={styles.draggableBlock}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'move',
      }}
    >
      {children}
    </div>
  );
};
