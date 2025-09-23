import React, { useState, useRef } from 'react';
import { Level } from '../../types/editor.types';
import { LevelService } from '../../services/LevelService';
import { decodeLevelCode } from '../../utils/levelExportImport';
import { validateLevel } from '../../utils/levelValidation';
import styles from './ImportModal.module.css';

interface ImportModalProps {
  onImport: (level: Level) => void;
  onClose: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ onImport, onClose }) => {
  const [importType, setImportType] = useState<'code' | 'file'>('code');
  const [importData, setImportData] = useState('');
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async () => {
    setError('');
    setIsValidating(true);

    try {
      let level: Level;

      if (importType === 'code') {
        if (!importData.trim()) {
          throw new Error('Please enter a level code');
        }
        level = decodeLevelCode(importData.trim());
      } else {
        if (!importData) {
          throw new Error('Please select a file');
        }
        level = LevelService.importFromJSON(importData);
      }

      // Validate the level
      const validationResult = validateLevel(level);
      if (!validationResult.success) {
        const errors = validationResult.errors.map(e => `${e.field}: ${e.message}`).join('\n');
        throw new Error(`Validation failed:\n${errors}`);
      }

      onImport(validationResult.data);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setIsValidating(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setImportData(text);
      setError('');
    } catch (error) {
      setError('Failed to read file');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setError('Please drop a JSON file');
      return;
    }

    try {
      const text = await file.text();
      setImportData(text);
      setImportType('file');
      setError('');
    } catch (error) {
      setError('Failed to read file');
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Import Level</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          <div className={styles.importTypeSelector}>
            <button
              className={`${styles.typeButton} ${importType === 'code' ? styles.active : ''}`}
              onClick={() => setImportType('code')}
            >
              Level Code
            </button>
            <button
              className={`${styles.typeButton} ${importType === 'file' ? styles.active : ''}`}
              onClick={() => setImportType('file')}
            >
              JSON File
            </button>
          </div>

          {importType === 'code' ? (
            <>
              <div className={styles.importInfo}>
                <p>Paste a level code shared by another player</p>
              </div>
              <textarea
                className={styles.importInput}
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder="Paste level code here..."
                rows={10}
              />
            </>
          ) : (
            <>
              <div className={styles.importInfo}>
                <p>Upload a JSON file or drag and drop it here</p>
              </div>
              <div
                className={styles.dropZone}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <div className={styles.dropZoneContent}>
                  <p>Click to browse or drag and drop a JSON file</p>
                  {importData && <p className={styles.fileName}>File loaded</p>}
                </div>
              </div>
            </>
          )}

          {error && (
            <div className={styles.error}>
              <p>{error}</p>
            </div>
          )}

          <div className={styles.actions}>
            <button 
              className={styles.cancelButton} 
              onClick={onClose}
              disabled={isValidating}
            >
              Cancel
            </button>
            <button 
              className={styles.importButton} 
              onClick={handleImport}
              disabled={isValidating || (!importData && importType === 'code')}
            >
              {isValidating ? 'Validating...' : 'Import Level'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};