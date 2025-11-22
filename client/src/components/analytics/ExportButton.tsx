import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@jeffrey-keyser/personal-ui-kit';
import { ExportFormat, DataType } from '../../models/export';
import { useThemeColors } from '../../contexts/ThemeContext';
import styles from './ExportButton.module.css';

export interface ExportButtonProps {
  projectId: string;
  startDate?: string;
  endDate?: string;
  dataType: DataType;
  onExport: (format: ExportFormat) => void;
  disabled?: boolean;
  loading?: boolean;
}

/**
 * ExportButton Component
 * Provides a dropdown button to export data in CSV or JSON format
 */
export function ExportButton({
  projectId,
  startDate,
  endDate,
  dataType,
  onExport,
  disabled = false,
  loading = false,
}: ExportButtonProps) {
  const colors = useThemeColors();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleExport = (format: ExportFormat) => {
    onExport(format);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    if (!disabled && !loading) {
      setIsOpen(!isOpen);
    }
  };

  const getDataTypeLabel = () => {
    switch (dataType) {
      case 'analytics':
        return 'Analytics';
      case 'events':
        return 'Events';
      case 'campaigns':
        return 'Campaigns';
      default:
        return 'Data';
    }
  };

  const inlineStyles = {
    container: {
      position: 'relative' as const,
      display: 'inline-block',
    },
    button: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.5rem 1rem',
      border: `1px solid ${colors.primary.main}`,
      backgroundColor: disabled || loading ? '#e0e0e0' : colors.background.primary,
      color: disabled || loading ? '#999' : colors.primary.main,
      borderRadius: '4px',
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      fontSize: '0.875rem',
      fontWeight: 500,
      transition: 'all 0.2s',
    },
    buttonHover: {
      backgroundColor: colors.primary.light,
    },
    dropdown: {
      position: 'absolute' as const,
      top: '100%',
      right: 0,
      marginTop: '0.25rem',
      backgroundColor: colors.background.primary,
      border: `1px solid ${colors.border.primary}`,
      borderRadius: '4px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      minWidth: '150px',
      zIndex: 1000,
    },
    dropdownItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.75rem 1rem',
      border: 'none',
      backgroundColor: 'transparent',
      color: colors.text.primary,
      fontSize: '0.875rem',
      cursor: 'pointer',
      width: '100%',
      textAlign: 'left' as const,
      transition: 'background-color 0.2s',
    },
    dropdownItemHover: {
      backgroundColor: colors.background.secondary,
    },
    icon: {
      fontSize: '1rem',
    },
    arrow: {
      fontSize: '0.75rem',
      marginLeft: '0.25rem',
      transition: 'transform 0.2s',
      transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
    },
  };

  return (
    <div ref={dropdownRef} style={inlineStyles.container}>
      <button
        onClick={toggleDropdown}
        disabled={disabled || loading}
        style={inlineStyles.button}
        className={styles.exportButton}
      >
        <span style={inlineStyles.icon}>📥</span>
        <span>{loading ? 'Exporting...' : `Export ${getDataTypeLabel()}`}</span>
        <span style={inlineStyles.arrow}>▼</span>
      </button>

      {isOpen && (
        <div style={inlineStyles.dropdown} className={styles.dropdown}>
          <button
            onClick={() => handleExport('csv')}
            style={inlineStyles.dropdownItem}
            className={styles.dropdownItem}
          >
            <span style={inlineStyles.icon}>📄</span>
            <span>Export as CSV</span>
          </button>
          <button
            onClick={() => handleExport('json')}
            style={inlineStyles.dropdownItem}
            className={styles.dropdownItem}
          >
            <span style={inlineStyles.icon}>📋</span>
            <span>Export as JSON</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default ExportButton;
