import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useGetCampaignStatsQuery, useGetTopCampaignsQuery } from '../../reducers/campaigns.api';
import { CampaignsTable, TopCampaignsChart } from '../../components/campaigns';
import './CampaignsContainer.css';

export const CampaignsContainer: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const [dateRange, setDateRange] = useState<{
    start_date?: string;
    end_date?: string;
  }>({});
  const [metric, setMetric] = useState<'visits' | 'sessions' | 'pageviews'>('visits');

  // Fetch campaign statistics
  const {
    data: campaignStats,
    isLoading: isLoadingStats,
    error: statsError,
  } = useGetCampaignStatsQuery(
    {
      projectId: projectId!,
      limit: 50,
      ...dateRange,
    },
    { skip: !projectId }
  );

  // Fetch top campaigns
  const {
    data: topCampaigns,
    isLoading: isLoadingTop,
  } = useGetTopCampaignsQuery(
    {
      projectId: projectId!,
      metric,
      limit: 10,
      ...dateRange,
    },
    { skip: !projectId }
  );

  const handleDateRangeChange = (start?: string, end?: string) => {
    setDateRange({
      start_date: start,
      end_date: end,
    });
  };

  const handleMetricChange = (newMetric: 'visits' | 'sessions' | 'pageviews') => {
    setMetric(newMetric);
  };

  if (statsError) {
    return (
      <div className="campaigns-error">
        <h3>Error loading campaign data</h3>
        <p>Please try refreshing the page or contact support if the issue persists.</p>
      </div>
    );
  }

  return (
    <div className="campaigns-container">
      <div className="campaigns-header">
        <h1>Campaign Analytics</h1>
        <p className="campaigns-description">
          Track the performance of your marketing campaigns using UTM parameters.
          View metrics like visits, sessions, bounce rate, and more.
        </p>
      </div>

      <div className="campaigns-filters">
        <div className="filter-group">
          <label>Date Range</label>
          <div className="date-range-buttons">
            <button
              onClick={() => handleDateRangeChange()}
              className={!dateRange.start_date ? 'active' : ''}
            >
              All Time
            </button>
            <button
              onClick={() => {
                const today = new Date();
                const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                handleDateRangeChange(
                  last30Days.toISOString(),
                  today.toISOString()
                );
              }}
              className={dateRange.start_date ? 'active' : ''}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => {
                const today = new Date();
                const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                handleDateRangeChange(
                  last7Days.toISOString(),
                  today.toISOString()
                );
              }}
            >
              Last 7 Days
            </button>
          </div>
        </div>

        <div className="filter-group">
          <label>Top Campaigns Metric</label>
          <select value={metric} onChange={(e) => handleMetricChange(e.target.value as any)}>
            <option value="visits">Visits</option>
            <option value="sessions">Sessions</option>
            <option value="pageviews">Pageviews</option>
          </select>
        </div>
      </div>

      <div className="campaigns-grid">
        <div className="campaigns-main">
          <div className="section-header">
            <h2>All Campaigns</h2>
            <span className="section-count">
              {campaignStats?.campaigns.length || 0} campaigns
            </span>
          </div>
          <CampaignsTable
            campaigns={campaignStats?.campaigns || []}
            loading={isLoadingStats}
          />
        </div>

        <div className="campaigns-sidebar">
          <TopCampaignsChart
            campaigns={topCampaigns?.campaigns || []}
            loading={isLoadingTop}
            metric={metric === 'sessions' ? 'sessions' : 'visits'}
          />
        </div>
      </div>

      <div className="campaigns-help">
        <h3>About Campaign Tracking</h3>
        <p>
          Campaign tracking uses UTM parameters in your URLs to track the effectiveness
          of your marketing efforts. Add these parameters to your links:
        </p>
        <ul>
          <li><code>utm_source</code> - Identify the source (e.g., google, facebook, newsletter)</li>
          <li><code>utm_medium</code> - Identify the medium (e.g., cpc, email, social)</li>
          <li><code>utm_campaign</code> - Identify the campaign name (e.g., summer_sale)</li>
          <li><code>utm_term</code> - Identify paid keywords</li>
          <li><code>utm_content</code> - Differentiate ads or links</li>
        </ul>
        <p className="help-example">
          Example: <code>https://example.com?utm_source=google&utm_medium=cpc&utm_campaign=summer_sale</code>
        </p>
      </div>
    </div>
  );
};

export default CampaignsContainer;
