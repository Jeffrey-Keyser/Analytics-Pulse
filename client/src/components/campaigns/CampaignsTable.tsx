import React from 'react';
import { CampaignStats } from '../../models/campaigns';
import './CampaignsTable.css';

interface CampaignsTableProps {
  campaigns: CampaignStats[];
  loading?: boolean;
}

export const CampaignsTable: React.FC<CampaignsTableProps> = ({ campaigns, loading }) => {
  if (loading) {
    return (
      <div className="campaigns-table-loading">
        <div className="loading-spinner">Loading campaigns...</div>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="campaigns-table-empty">
        <p>No campaign data available for the selected period.</p>
        <p className="campaigns-table-hint">
          Campaign data is tracked when visitors arrive with UTM parameters
          (utm_source, utm_medium, utm_campaign, etc.)
        </p>
      </div>
    );
  }

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="campaigns-table-container">
      <table className="campaigns-table">
        <thead>
          <tr>
            <th>Campaign</th>
            <th>Source</th>
            <th>Medium</th>
            <th>Visits</th>
            <th>Sessions</th>
            <th>Pageviews</th>
            <th>Events</th>
            <th>Bounce Rate</th>
            <th>Avg Duration</th>
            <th>First Seen</th>
            <th>Last Seen</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign, index) => (
            <tr key={index}>
              <td className="campaign-name">
                {campaign.utm_campaign || '-'}
                {campaign.utm_content && (
                  <span className="campaign-content" title={campaign.utm_content}>
                    {campaign.utm_content}
                  </span>
                )}
                {campaign.utm_term && (
                  <span className="campaign-term" title={campaign.utm_term}>
                    {campaign.utm_term}
                  </span>
                )}
              </td>
              <td>{campaign.utm_source || '-'}</td>
              <td>{campaign.utm_medium || '-'}</td>
              <td className="numeric">{campaign.visits.toLocaleString()}</td>
              <td className="numeric">{campaign.unique_sessions.toLocaleString()}</td>
              <td className="numeric">{campaign.pageviews.toLocaleString()}</td>
              <td className="numeric">{campaign.custom_events.toLocaleString()}</td>
              <td className="numeric">{campaign.bounce_rate.toFixed(1)}%</td>
              <td className="numeric">{formatDuration(campaign.avg_session_duration)}</td>
              <td className="date">{formatDate(campaign.first_seen)}</td>
              <td className="date">{formatDate(campaign.last_seen)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CampaignsTable;
