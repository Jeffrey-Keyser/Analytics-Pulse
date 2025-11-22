export interface CustomEvent {
  id: string;
  event_name: string;
  url: string;
  custom_data: Record<string, any> | null;
  timestamp: string;
  session_id: string;
  ip_hash: string;
  country: string | null;
  city: string | null;
  browser: string | null;
  os: string | null;
  device_type: string | null;
}

export interface EventCount {
  event_name: string;
  count: number;
}

export interface EventsQueryParams {
  event_name?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

export interface EventsAggregateParams {
  start_date?: string;
  end_date?: string;
  aggregate: 'true';
}

export interface EventsPagination {
  total: number;
  limit: number;
  offset: number;
  page: number;
  pages: number;
}

export interface EventsFilters {
  event_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

export interface EventsResponse {
  success: boolean;
  data: CustomEvent[];
  pagination: EventsPagination;
  filters: EventsFilters;
}

export interface EventsAggregateResponse {
  success: boolean;
  data: {
    event_counts: EventCount[];
    date_range: {
      start: string | null;
      end: string | null;
    };
  };
}
