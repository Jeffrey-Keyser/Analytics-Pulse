import React, { useState } from 'react';
import { Container, Button, LoadingSpinner } from '@jeffrey-keyser/personal-ui-kit';
import { useParams, useNavigate } from 'react-router-dom';
import { format, subDays } from 'date-fns';
import { useGetProjectAnalyticsQuery } from '../reducers/analytics.api';
import {
  DateRangePicker,
  SummaryCards,
  PageviewsChart,
  TopPagesChart,
  DeviceBreakdown,
  GeoDistribution,
} from '../components/analytics';

/**
 * Project Detail Page
 * Route: /projects/:id
 * Shows analytics charts and data for a specific project
 */
export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Date range state
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day');

  // Fetch analytics data
  const { data, isLoading, isError, error } = useGetProjectAnalyticsQuery(
    {
      projectId: id!,
      start_date: startDate,
      end_date: endDate,
      granularity,
      limit: 10,
    },
    {
      skip: !id,
    }
  );

  const handleDateRangeChange = (newStartDate: string, newEndDate: string) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  if (!id) {
    return (
      <Container size="xl">
        <div style={{ padding: '2rem 0' }}>
          <h1>Error: No project ID provided</h1>
          <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
        </div>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <div style={{ padding: '2rem 0' }}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Project Analytics</h1>
            <p style={styles.subtitle}>Project ID: {id}</p>
          </div>
          <div style={styles.headerActions}>
            <Button variant="secondary" onClick={() => navigate('/')}>
              Back to Dashboard
            </Button>
            <Button onClick={() => navigate(`/projects/${id}/realtime`)}>
              Real-time View
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={styles.tabs}>
          <button style={{ ...styles.tab, ...styles.tabActive }}>Overview</button>
          <button style={styles.tab} onClick={() => navigate(`/projects/${id}/events`)}>
            Custom Events
          </button>
          <button style={styles.tab} onClick={() => navigate(`/projects/${id}/settings`)}>
            Settings
          </button>
          <button style={styles.tab} onClick={() => navigate(`/projects/${id}/api-keys`)}>
            API Keys
          </button>
        </div>

        {/* Date Range Picker */}
        <DateRangePicker
          onDateRangeChange={handleDateRangeChange}
          initialStartDate={startDate}
          initialEndDate={endDate}
        />

        {/* Granularity Selector */}
        <div style={styles.granularityContainer}>
          <label style={styles.granularityLabel}>Time granularity:</label>
          <select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value as 'day' | 'week' | 'month')}
            style={styles.granularitySelect}
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div style={styles.loadingContainer}>
            <LoadingSpinner />
            <p>Loading analytics data...</p>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div style={styles.errorContainer}>
            <h3>Error Loading Analytics</h3>
            <p>{(error as any)?.message || 'Failed to load analytics data'}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        )}

        {/* Analytics Data */}
        {!isLoading && !isError && data?.success && data.data && (
          <>
            {/* Summary Cards */}
            <SummaryCards stats={data.data.summary} />

            {/* Pageviews Chart */}
            <PageviewsChart data={data.data.time_series} />

            {/* Two Column Layout */}
            <div style={styles.twoColumnGrid}>
              {/* Top Pages */}
              <TopPagesChart data={data.data.top_pages} />

              {/* Device Breakdown */}
              <DeviceBreakdown data={data.data.breakdowns.devices} />
            </div>

            {/* Geographic Distribution */}
            <GeoDistribution data={data.data.breakdowns.countries} />

            {/* Additional Breakdowns */}
            <div style={styles.twoColumnGrid}>
              {/* Browser Breakdown */}
              <div style={styles.breakdownCard}>
                <h3 style={styles.breakdownTitle}>Browser Breakdown</h3>
                <div style={styles.breakdownList}>
                  {data.data.breakdowns.browsers.map((browser, index) => (
                    <div key={index} style={styles.breakdownItem}>
                      <span>{browser.browser}</span>
                      <span>
                        {browser.count.toLocaleString()} ({browser.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* OS Breakdown */}
              <div style={styles.breakdownCard}>
                <h3 style={styles.breakdownTitle}>Operating System Breakdown</h3>
                <div style={styles.breakdownList}>
                  {data.data.breakdowns.operating_systems.map((os, index) => (
                    <div key={index} style={styles.breakdownItem}>
                      <span>{os.os}</span>
                      <span>
                        {os.count.toLocaleString()} ({os.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Referrers */}
            <div style={styles.breakdownCard}>
              <h3 style={styles.breakdownTitle}>Top Referrers</h3>
              <div style={styles.breakdownList}>
                {data.data.top_referrers.map((referrer, index) => (
                  <div key={index} style={styles.breakdownItem}>
                    <span>{referrer.referrer || '(direct)'}</span>
                    <span>
                      {referrer.sessions.toLocaleString()} sessions, {referrer.unique_visitors.toLocaleString()} visitors
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Container>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  title: {
    margin: 0,
    fontSize: '2rem',
    fontWeight: 700,
    color: '#333',
  },
  subtitle: {
    margin: '0.5rem 0 0 0',
    fontSize: '0.875rem',
    color: '#666',
  },
  headerActions: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  tabs: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '2rem',
    borderBottom: '2px solid #e0e0e0',
    flexWrap: 'wrap',
  },
  tab: {
    padding: '0.75rem 1.5rem',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#666',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    marginBottom: '-2px',
    transition: 'all 0.2s',
  },
  tabActive: {
    color: '#007bff',
    borderBottomColor: '#007bff',
  },
  granularityContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '2rem',
  },
  granularityLabel: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#333',
  },
  granularitySelect: {
    padding: '0.5rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 0',
    gap: '1rem',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 0',
    gap: '1rem',
    backgroundColor: '#fee',
    borderRadius: '8px',
    border: '1px solid #fcc',
  },
  twoColumnGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
  breakdownCard: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '2rem',
  },
  breakdownTitle: {
    margin: 0,
    marginBottom: '1rem',
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#333',
  },
  breakdownList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  breakdownItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.5rem 0',
    borderBottom: '1px solid #e0e0e0',
    fontSize: '0.875rem',
  },
};

export default ProjectDetail;
