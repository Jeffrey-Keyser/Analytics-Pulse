import React from 'react';

export interface LastUpdatedIndicatorProps {
  timestamp: string;
  isPaused?: boolean;
}

export function LastUpdatedIndicator({ timestamp, isPaused = false }: LastUpdatedIndicatorProps) {
  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getRelativeTime = (isoString: string): string => {
    const now = new Date().getTime();
    const then = new Date(isoString).getTime();
    const diffSeconds = Math.floor((now - then) / 1000);

    if (diffSeconds < 5) return 'just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes === 1) return '1 min ago';
    return `${diffMinutes} mins ago`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <span style={styles.label}>Last updated:</span>
        <span style={styles.time}>{formatTime(timestamp)}</span>
        <span style={styles.relative}>({getRelativeTime(timestamp)})</span>
      </div>
      {isPaused && (
        <div style={styles.pausedIndicator}>
          <span style={styles.pausedIcon}>⏸️</span>
          <span style={styles.pausedText}>Paused</span>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1rem',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '0.875rem',
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  label: {
    color: '#6b7280',
    fontWeight: 500,
  },
  time: {
    color: '#111827',
    fontWeight: 600,
    fontFamily: 'monospace',
  },
  relative: {
    color: '#9ca3af',
  },
  pausedIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.25rem 0.75rem',
    backgroundColor: '#fef3c7',
    borderRadius: '12px',
  },
  pausedIcon: {
    fontSize: '0.75rem',
  },
  pausedText: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#92400e',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
};

export default LastUpdatedIndicator;
