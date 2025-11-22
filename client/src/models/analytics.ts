export interface OverviewStats {
  pageviews: number;
  unique_visitors: number;
  sessions: number;
  bounce_rate: number;
  avg_session_duration_seconds: number;
}

export interface TimeSeriesDataPoint {
  date: string;
  pageviews: number;
  unique_visitors: number;
  sessions: number;
}

export interface TopPage {
  url: string;
  pageviews: number;
  unique_visitors: number;
}

export interface TopReferrer {
  referrer: string;
  sessions: number;
  unique_visitors: number;
}

export interface DeviceBreakdown {
  device_type: string;
  count: number;
  percentage: number;
}

export interface BrowserBreakdown {
  browser: string;
  count: number;
  percentage: number;
}

export interface OSBreakdown {
  os: string;
  count: number;
  percentage: number;
}

export interface CountryDistribution {
  country: string;
  visitors: number;
  sessions: number;
  percentage: number;
}

export interface AnalyticsBreakdowns {
  devices: DeviceBreakdown[];
  browsers: BrowserBreakdown[];
  operating_systems: OSBreakdown[];
  countries: CountryDistribution[];
}

export interface DateRange {
  start: string;
  end: string;
  granularity: 'day' | 'week' | 'month';
}

export interface AnalyticsData {
  date_range: DateRange;
  summary: OverviewStats;
  time_series: TimeSeriesDataPoint[];
  top_pages: TopPage[];
  top_referrers: TopReferrer[];
  breakdowns: AnalyticsBreakdowns;
}

export interface AnalyticsResponse {
  success: boolean;
  data: AnalyticsData;
  pagination?: {
    limit: number;
  };
}

export interface AnalyticsQueryParams {
  start_date?: string;
  end_date?: string;
  granularity?: 'day' | 'week' | 'month';
  limit?: number;
}

// Real-time Analytics Types
export interface ActiveVisitors {
  count: number;
  time_window: string;
  timestamp: string;
}

export interface RecentPageviews {
  count: number;
  time_window: string;
}

export interface CurrentPage {
  url: string;
  active_visitors: number;
  pageviews: number;
}

export interface RealtimeAnalyticsData {
  active_visitors: ActiveVisitors;
  recent_pageviews: RecentPageviews;
  current_pages: CurrentPage[];
  timestamp: string;
}

export interface RealtimeAnalyticsResponse {
  success: boolean;
  data: RealtimeAnalyticsData;
}
