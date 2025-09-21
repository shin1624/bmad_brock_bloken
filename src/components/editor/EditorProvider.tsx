import React, { ReactNode } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { useEffect, useState } from 'react';

interface EditorProviderProps {
  children: ReactNode;
}

/**
 * Detects if the device supports touch
 */
const isTouchDevice = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  const navigatorAny = window.navigator as Navigator & {
    msMaxTouchPoints?: number;
  };

  return (navigatorAny.maxTouchPoints ?? 0) > 0 || (navigatorAny.msMaxTouchPoints ?? 0) > 0;
};

/**
 * DnD Provider wrapper that automatically selects the correct backend
 * based on device capabilities (touch vs mouse)
 */
export const EditorProvider: React.FC<EditorProviderProps> = ({ children }) => {
  const [backend, setBackend] = useState(() =>
    isTouchDevice() ? TouchBackend : HTML5Backend
  );

  useEffect(() => {
    // Re-check on mount in case SSR gave wrong result
    const isTouch = isTouchDevice();
    setBackend(isTouch ? TouchBackend : HTML5Backend);
  }, []);

  // Options for touch backend to improve responsiveness
  const backendOptions = backend === TouchBackend ? {
    enableMouseEvents: true, // Allow mouse events on touch devices
    enableHoverOutsideTarget: true,
    delayTouchStart: 100, // Reduce delay for better responsiveness
    touchSlop: 5, // Pixels of movement allowed before drag starts
  } : {};

  return (
    <DndProvider backend={backend} options={backendOptions}>
      {children}
    </DndProvider>
  );
};
