import React from 'react';
import { useDrop } from 'react-dnd';
import { DragItem, GridPosition } from '../../types/editor.types';
import styles from './DroppableCell.module.css';

interface DroppableCellProps {
  position: GridPosition;
  onDrop: (item: DragItem, position: GridPosition) => void;
  canDrop?: (item: DragItem, position: GridPosition) => boolean;
  children: React.ReactNode;
}

/**
 * Droppable grid cell that accepts dragged blocks
 */
export const DroppableCell: React.FC<DroppableCellProps> = ({
  position,
  onDrop,
  canDrop = () => true,
  children,
}) => {
  const [{ isOver, canDropHere }, drop] = useDrop<DragItem, void, { isOver: boolean; canDropHere: boolean }>(() => ({
    accept: 'block',
    drop: (item) => {
      onDrop(item, position);
    },
    canDrop: (item) => canDrop(item, position),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDropHere: !!monitor.canDrop(),
    }),
  }), [position, onDrop, canDrop]);

  return (
    <div
      ref={drop}
      className={styles.droppableCell}
      style={{
        backgroundColor: isOver && canDropHere ? 'rgba(76, 175, 80, 0.2)' :
                        isOver && !canDropHere ? 'rgba(244, 67, 54, 0.2)' :
                        'transparent',
      }}
    >
      {children}
    </div>
  );
};
