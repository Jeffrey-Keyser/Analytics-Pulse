export interface UTMParams {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
}

export interface CampaignStats {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  visits: number;
  unique_sessions: number;
  pageviews: number;
  custom_events: number;
  bounce_rate: number;
  avg_session_duration: number;
  first_seen: string;
  last_seen: string;
}

export interface CampaignComparison {
  campaign_name: string;
  visits: number;
  unique_sessions: number;
  pageviews: number;
  custom_events: number;
  bounce_rate: number;
}

export interface TopCampaign {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  visits: number;
  unique_sessions: number;
}

export interface CampaignStatsResponse {
  campaigns: CampaignStats[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
  };
}

export interface CampaignComparisonResponse {
  campaigns: CampaignComparison[];
}

export interface TopCampaignsResponse {
  campaigns: TopCampaign[];
}

export interface CampaignStatsByParameterResponse {
  parameter: string;
  stats: Array<{
    parameter_value: string;
    visits: number;
    unique_sessions: number;
  }>;
}

export interface CampaignConversionsResponse {
  campaign_name: string;
  total_sessions: number;
  converted_sessions: number;
  conversion_rate: number;
}

export interface CampaignQueryParams {
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface CampaignComparisonParams {
  campaign_names: string[];
  start_date?: string;
  end_date?: string;
}

export interface TopCampaignsParams {
  metric?: 'visits' | 'sessions' | 'pageviews';
  start_date?: string;
  end_date?: string;
  limit?: number;
}

export interface CampaignStatsByParameterParams {
  parameter: 'source' | 'medium' | 'campaign' | 'term' | 'content';
  start_date?: string;
  end_date?: string;
  limit?: number;
}

export interface CampaignConversionsParams {
  conversion_event: string;
  start_date?: string;
  end_date?: string;
}
