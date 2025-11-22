import React from 'react';
import { RecentPageviews } from '../../models/analytics';

export interface RecentPageviewsCardProps {
  data: RecentPageviews;
  loading?: boolean;
}

export function RecentPageviewsCard({ data, loading = false }: RecentPageviewsCardProps) {
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={styles.icon}>👁️</span>
        <div>
          <h3 style={styles.cardTitle}>Recent Pageviews</h3>
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
    minHeight: '3rem',
  },
  count: {
    fontSize: '2.5rem',
    fontWeight: 700,
    color: '#7c3aed',
    lineHeight: 1.2,
  },
  skeleton: {
    height: '3rem',
    backgroundColor: '#e0e0e0',
    borderRadius: '4px',
    animation: 'pulse 1.5s infinite',
  },
};

export default RecentPageviewsCard;
