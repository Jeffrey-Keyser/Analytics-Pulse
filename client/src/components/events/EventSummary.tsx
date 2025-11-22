import React from 'react';
import { EventCount } from '../../models/events';

export interface EventSummaryProps {
  eventCounts: EventCount[];
  loading?: boolean;
}

export function EventSummary({ eventCounts, loading }: EventSummaryProps) {
  if (loading) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>Event Summary</h3>
        <div style={styles.loadingState}>Loading event counts...</div>
      </div>
    );
  }

  if (eventCounts.length === 0) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>Event Summary</h3>
        <div style={styles.emptyState}>No events found</div>
      </div>
    );
  }

  const totalEvents = eventCounts.reduce((sum, ec) => sum + ec.count, 0);

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Event Summary</h3>
      <div style={styles.totalRow}>
        <span style={styles.totalLabel}>Total Events:</span>
        <span style={styles.totalValue}>{totalEvents.toLocaleString()}</span>
      </div>
      <div style={styles.grid}>
        {eventCounts.map((eventCount) => (
          <div key={eventCount.event_name} style={styles.card}>
            <div style={styles.eventName}>{eventCount.event_name}</div>
            <div style={styles.eventCount}>{eventCount.count.toLocaleString()}</div>
            <div style={styles.eventPercentage}>
              {((eventCount.count / totalEvents) * 100).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: '2rem',
    padding: '1.5rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
  },
  title: {
    margin: '0 0 1rem 0',
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#333',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem',
    marginBottom: '1rem',
    backgroundColor: '#007bff',
    color: 'white',
    borderRadius: '6px',
    fontWeight: 600,
  },
  totalLabel: {
    fontSize: '1rem',
  },
  totalValue: {
    fontSize: '1.25rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '1rem',
  },
  card: {
    padding: '1rem',
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  eventName: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#333',
    wordBreak: 'break-word',
  },
  eventCount: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#007bff',
  },
  eventPercentage: {
    fontSize: '0.75rem',
    color: '#6c757d',
  },
  loadingState: {
    padding: '2rem',
    textAlign: 'center',
    color: '#6c757d',
  },
  emptyState: {
    padding: '2rem',
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
  },
};

export default EventSummary;
