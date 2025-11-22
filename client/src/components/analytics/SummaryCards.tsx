import React from 'react';
import { OverviewStats } from '../../models/analytics';
import { useThemeColors } from '../../contexts/ThemeContext';

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
  const colors = useThemeColors();

  const styles = {
    card: {
      backgroundColor: colors.background.secondary,
      border: `1px solid ${colors.border.primary}`,
      borderRadius: '8px',
      padding: '1.5rem',
      boxShadow: colors.shadows.sm,
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
      color: colors.text.secondary,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
    },
    cardValue: {
      fontSize: '1.875rem',
      fontWeight: 700,
      color: colors.text.primary,
      lineHeight: 1.2,
    },
    skeleton: {
      height: '2rem',
      backgroundColor: colors.border.primary,
      borderRadius: '4px',
      animation: 'pulse 1.5s infinite',
    },
  };

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
    <div style={containerStyle}>
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

const containerStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '1rem',
  marginBottom: '2rem',
};

export default SummaryCards;
