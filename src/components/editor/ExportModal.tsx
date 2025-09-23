import React, { useState } from 'react';
import { Level } from '../../types/editor.types';
import { LevelService } from '../../services/LevelService';
import { generateLevelCode, isLevelCodeShareable } from '../../utils/levelExportImport';
import styles from './ExportModal.module.css';

interface ExportModalProps {
  level: Level;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ level, onClose }) => {
  const [exportType, setExportType] = useState<'json' | 'code'>('code');
  const [exportData, setExportData] = useState('');
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (exportType === 'json') {
      setExportData(LevelService.exportToJSON(level));
    } else {
      const code = generateLevelCode(level);
      if (!isLevelCodeShareable(code)) {
        console.warn('Level code may be too large for URL sharing');
      }
      setExportData(code);
    }
  }, [exportType, level]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportData);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([exportData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportType === 'json' 
      ? `${level.name.replace(/\s+/g, '-')}.json`
      : `${level.name.replace(/\s+/g, '-')}.level`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Export Level</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          <div className={styles.exportTypeSelector}>
            <button
              className={`${styles.typeButton} ${exportType === 'code' ? styles.active : ''}`}
              onClick={() => setExportType('code')}
            >
              Level Code
            </button>
            <button
              className={`${styles.typeButton} ${exportType === 'json' ? styles.active : ''}`}
              onClick={() => setExportType('json')}
            >
              JSON File
            </button>
          </div>

          <div className={styles.exportInfo}>
            {exportType === 'code' ? (
              <p>Share this code with others to let them play your level!</p>
            ) : (
              <p>Save this JSON file to back up or edit your level data.</p>
            )}
          </div>

          <textarea
            className={styles.exportData}
            value={exportData}
            readOnly
            rows={10}
          />

          <div className={styles.actions}>
            <button className={styles.copyButton} onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
            <button className={styles.downloadButton} onClick={handleDownload}>
              Download File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};