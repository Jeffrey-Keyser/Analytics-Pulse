import React from 'react';
import { ActiveVisitors } from '../../models/analytics';

export interface ActiveVisitorsCardProps {
  data: ActiveVisitors;
  loading?: boolean;
}

export function ActiveVisitorsCard({ data, loading = false }: ActiveVisitorsCardProps) {
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={styles.icon}>👥</span>
        <div>
          <h3 style={styles.cardTitle}>Active Visitors</h3>
          <p style={styles.timeWindow}>{data.time_window}</p>
        </div>
      </div>
      <div style={styles.cardValue}>
        {loading ? (
          <div style={styles.skeleton}></div>
        ) : (
          <span style={styles.count}>{formatNumber(data.count)}</span>
        )}
      </div>
      <div style={styles.pulse}>
        <span style={styles.pulseIcon}>●</span>
        <span style={styles.pulseText}>Live</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '1.5rem',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    transition: 'box-shadow 0.2s',
    position: 'relative',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  icon: {
    fontSize: '1.75rem',
  },
  cardTitle: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: 600,
    color: '#333',
  },
  timeWindow: {
    margin: '0.25rem 0 0 0',
    fontSize: '0.75rem',
    color: '#888',
  },
  cardValue: {
    marginBottom: '0.5rem',
  },
  count: {
    fontSize: '2.5rem',
    fontWeight: 700,
    color: '#2563eb',
    lineHeight: 1.2,
  },
  skeleton: {
    height: '3rem',
    backgroundColor: '#e0e0e0',
    borderRadius: '4px',
    animation: 'pulse 1.5s infinite',
  },
  pulse: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  pulseIcon: {
    fontSize: '0.75rem',
    color: '#10b981',
    animation: 'pulse 2s infinite',
  },
  pulseText: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#10b981',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
};

export default ActiveVisitorsCard;
