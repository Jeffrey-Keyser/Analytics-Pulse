import React from 'react';
import { OverviewStats } from '../../models/analytics';

export interface SummaryCardsProps {
  stats: OverviewStats;
  loading?: boolean;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: string;
  loading?: boolean;
}

function MetricCard({ title, value, icon, loading }: MetricCardProps) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        {icon && <span style={styles.icon}>{icon}</span>}
        <h3 style={styles.cardTitle}>{title}</h3>
      </div>
      <div style={styles.cardValue}>
        {loading ? (
          <div style={styles.skeleton}></div>
        ) : (
          <span>{value}</span>
        )}
      </div>
    </div>
  );
}

export function SummaryCards({ stats, loading = false }: SummaryCardsProps) {
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatPercentage = (num: number): string => {
    return `${num.toFixed(1)}%`;
  };

  return (
    <div style={styles.container}>
      <MetricCard
        title="Total Pageviews"
        value={formatNumber(stats.pageviews)}
        icon="👁️"
        loading={loading}
      />
      <MetricCard
        title="Unique Visitors"
        value={formatNumber(stats.unique_visitors)}
        icon="👥"
        loading={loading}
      />
      <MetricCard
        title="Total Sessions"
        value={formatNumber(stats.sessions)}
        icon="🔄"
        loading={loading}
      />
      <MetricCard
        title="Bounce Rate"
        value={formatPercentage(stats.bounce_rate)}
        icon="📊"
        loading={loading}
      />
      <MetricCard
        title="Avg. Session Duration"
        value={formatDuration(stats.avg_session_duration_seconds)}
        icon="⏱️"
        loading={loading}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
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
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.75rem',
  },
  icon: {
    fontSize: '1.25rem',
  },
  cardTitle: {
    margin: 0,
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  cardValue: {
    fontSize: '1.875rem',
    fontWeight: 700,
    color: '#333',
    lineHeight: 1.2,
  },
  skeleton: {
    height: '2rem',
    backgroundColor: '#e0e0e0',
    borderRadius: '4px',
    animation: 'pulse 1.5s infinite',
  },
};

export default SummaryCards;
