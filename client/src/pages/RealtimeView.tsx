import React, { useState } from 'react';
import { Container } from '@jeffrey-keyser/personal-ui-kit';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetRealtimeAnalyticsQuery } from '../reducers/analytics.api';
import { ActiveVisitorsCard } from '../components/realtime/ActiveVisitorsCard';
import { RecentPageviewsCard } from '../components/realtime/RecentPageviewsCard';
import { CurrentPagesTable } from '../components/realtime/CurrentPagesTable';
import { LastUpdatedIndicator } from '../components/realtime/LastUpdatedIndicator';

/**
 * Real-time Analytics View
 * Route: /projects/:id/realtime
 * Shows live analytics data with auto-refresh every 10 seconds
 */
export function RealtimeView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isPaused, setIsPaused] = useState(false);

  // Poll every 10 seconds when not paused (matching cache-control header)
  const pollingInterval = isPaused ? 0 : 10000;

  const { data, isLoading, isFetching, error } = useGetRealtimeAnalyticsQuery(
    { projectId: id!, pollingInterval },
    {
      pollingInterval,
      skip: !id,
    }
  );

  const handleTogglePause = () => {
    setIsPaused(!isPaused);
  };

  if (error) {
    return (
      <Container size="xl">
        <div style={styles.errorContainer}>
          <h1 style={styles.title}>Real-time Analytics</h1>
          <div style={styles.errorMessage}>
            <p>Failed to load real-time analytics data.</p>
            <button onClick={() => navigate(`/projects/${id}`)} style={styles.button}>
              Back to Project
            </button>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Real-time Analytics</h1>
            <p style={styles.subtitle}>Live visitor activity and pageview tracking</p>
          </div>
          <div style={styles.controls}>
            <button
              onClick={handleTogglePause}
              style={{
                ...styles.button,
                ...(isPaused ? styles.resumeButton : styles.pauseButton),
              }}
            >
              {isPaused ? '▶️ Resume' : '⏸️ Pause'}
            </button>
            <button onClick={() => navigate(`/projects/${id}`)} style={styles.button}>
              ← Back to Project
            </button>
          </div>
        </div>

        {data && (
          <div style={styles.lastUpdatedContainer}>
            <LastUpdatedIndicator timestamp={data.data.timestamp} isPaused={isPaused} />
            {isFetching && !isLoading && (
              <span style={styles.fetchingIndicator}>Refreshing...</span>
            )}
          </div>
        )}

        <div style={styles.cardsContainer}>
          {isLoading ? (
            <>
              <div style={styles.skeleton}></div>
              <div style={styles.skeleton}></div>
            </>
          ) : data ? (
            <>
              <ActiveVisitorsCard
                data={data.data.active_visitors}
                loading={isLoading}
              />
              <RecentPageviewsCard
                data={data.data.recent_pageviews}
                loading={isLoading}
              />
            </>
          ) : null}
        </div>

        <div style={styles.tableContainer}>
          {isLoading ? (
            <div style={styles.tableSkeleton}></div>
          ) : data ? (
            <CurrentPagesTable
              pages={data.data.current_pages}
              loading={isLoading}
            />
          ) : null}
        </div>
      </div>
    </Container>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '2rem 0',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  title: {
    margin: 0,
    fontSize: '2rem',
    fontWeight: 700,
    color: '#111827',
  },
  subtitle: {
    margin: '0.5rem 0 0 0',
    fontSize: '1rem',
    color: '#6b7280',
  },
  controls: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
  },
  button: {
    padding: '0.625rem 1.25rem',
    fontSize: '0.9375rem',
    fontWeight: 500,
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: 'white',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  pauseButton: {
    borderColor: '#f59e0b',
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  resumeButton: {
    borderColor: '#10b981',
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  lastUpdatedContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  fetchingIndicator: {
    fontSize: '0.875rem',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  cardsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem',
    marginBottom: '1.5rem',
  },
  tableContainer: {
    marginBottom: '2rem',
  },
  skeleton: {
    height: '150px',
    backgroundColor: '#e0e0e0',
    borderRadius: '8px',
    animation: 'pulse 1.5s infinite',
  },
  tableSkeleton: {
    height: '300px',
    backgroundColor: '#e0e0e0',
    borderRadius: '8px',
    animation: 'pulse 1.5s infinite',
  },
  errorContainer: {
    padding: '2rem 0',
  },
  errorMessage: {
    padding: '2rem',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    textAlign: 'center',
    color: '#991b1b',
  },
};

export default RealtimeView;
