import React from 'react';

export interface MenuNavigationProps {
  children: React.ReactNode;
  className?: string;
}

export const MenuNavigation: React.FC<MenuNavigationProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div 
      className={`menu-navigation ${className}`}
      role="group"
      aria-label="Game navigation options"
    >
      {children}
    </div>
  );
};