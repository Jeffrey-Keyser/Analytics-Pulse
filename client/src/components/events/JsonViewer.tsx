import React, { useState } from 'react';

export interface JsonViewerProps {
  data: Record<string, any> | null;
}

export function JsonViewer({ data }: JsonViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!data || Object.keys(data).length === 0) {
    return <span style={styles.emptyState}>No custom data</span>;
  }

  const toggleExpanded = () => setIsExpanded(!isExpanded);

  return (
    <div style={styles.container}>
      <button onClick={toggleExpanded} style={styles.toggleButton}>
        <span style={styles.icon}>{isExpanded ? '▼' : '▶'}</span>
        {isExpanded ? 'Hide' : 'Show'} JSON
      </button>
      {isExpanded && (
        <pre style={styles.jsonContent}>{JSON.stringify(data, null, 2)}</pre>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginTop: '0.5rem',
  },
  toggleButton: {
    padding: '0.25rem 0.5rem',
    border: '1px solid #007bff',
    backgroundColor: 'white',
    color: '#007bff',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    transition: 'all 0.2s',
  },
  icon: {
    fontSize: '0.6rem',
  },
  jsonContent: {
    marginTop: '0.5rem',
    padding: '0.75rem',
    backgroundColor: '#f5f5f5',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontFamily: 'monospace',
    overflow: 'auto',
    maxHeight: '300px',
  },
  emptyState: {
    color: '#999',
    fontStyle: 'italic',
    fontSize: '0.875rem',
  },
};

export default JsonViewer;
