import React from 'react';
import { TopCampaign } from '../../models/campaigns';
import './TopCampaignsChart.css';

interface TopCampaignsChartProps {
  campaigns: TopCampaign[];
  loading?: boolean;
  metric?: 'visits' | 'sessions';
}

export const TopCampaignsChart: React.FC<TopCampaignsChartProps> = ({
  campaigns,
  loading,
  metric = 'visits',
}) => {
  if (loading) {
    return (
      <div className="top-campaigns-loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="top-campaigns-empty">
        <p>No campaign data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...campaigns.map(c => metric === 'visits' ? c.visits : c.unique_sessions));

  const getCampaignLabel = (campaign: TopCampaign): string => {
    const parts = [
      campaign.utm_campaign,
      campaign.utm_source,
      campaign.utm_medium,
    ].filter(Boolean);
    return parts.join(' / ') || 'Unknown';
  };

  const getMetricValue = (campaign: TopCampaign): number => {
    return metric === 'visits' ? campaign.visits : campaign.unique_sessions;
  };

  return (
    <div className="top-campaigns-chart">
      <div className="chart-header">
        <h3>Top Campaigns</h3>
        <span className="chart-subtitle">
          By {metric === 'visits' ? 'Total Visits' : 'Unique Sessions'}
        </span>
      </div>
      <div className="chart-bars">
        {campaigns.map((campaign, index) => {
          const value = getMetricValue(campaign);
          const percentage = (value / maxValue) * 100;

          return (
            <div key={index} className="chart-bar-row">
              <div className="chart-bar-label">
                <span className="campaign-label">{getCampaignLabel(campaign)}</span>
                <span className="campaign-value">{value.toLocaleString()}</span>
              </div>
              <div className="chart-bar-container">
                <div
                  className="chart-bar-fill"
                  style={{ width: `${percentage}%` }}
                  title={`${value.toLocaleString()} ${metric}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TopCampaignsChart;
