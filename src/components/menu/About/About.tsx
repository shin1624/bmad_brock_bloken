import React, { useEffect, useCallback } from 'react';
import { getAppVersion } from '../../../utils/version';
import './About.css';

interface AboutProps {
  isOpen: boolean;
  onClose: () => void;
}

export const About: React.FC<AboutProps> = ({ isOpen, onClose }) => {
  // Handle ESC key press
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Focus trap - focus the close button when modal opens
      const closeButton = document.querySelector('.about-close-button') as HTMLButtonElement;
      closeButton?.focus();
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="about-overlay" role="dialog" aria-modal="true" aria-labelledby="about-title">
      <div className="about-modal">
        <button 
          className="about-close-button"
          onClick={onClose}
          aria-label="Close about dialog"
        >
          ×
        </button>
        
        <div className="about-content">
          <h2 id="about-title" className="about-title">Block Breaker</h2>
          <p className="about-version">Version {getAppVersion()}</p>
          
          <section className="about-section">
            <h3>About</h3>
            <p>Experience the classic arcade game reimagined for the modern web!</p>
          </section>

          <section className="about-section">
            <h3>Development Team</h3>
            <ul className="about-credits">
              <li>Game Design & Development: BMAD Team</li>
              <li>Quality Assurance: Quinn (Test Architect)</li>
              <li>Product Management: Sarah (Product Owner)</li>
              <li>Development: James (Full Stack Developer)</li>
            </ul>
          </section>

          <section className="about-section">
            <h3>Technologies</h3>
            <ul className="about-tech">
              <li>React 18.3</li>
              <li>TypeScript 5.4</li>
              <li>Canvas API</li>
              <li>Vite</li>
              <li>Zustand</li>
            </ul>
          </section>

          <section className="about-section">
            <h3>License</h3>
            <p>MIT License</p>
            <p className="about-copyright">© 2025 BMAD Brock Bloken. All rights reserved.</p>
          </section>
        </div>

        <button 
          className="about-close-bottom"
          onClick={onClose}
          aria-label="Close"
        >
          Close
        </button>
      </div>
    </div>
  );
};