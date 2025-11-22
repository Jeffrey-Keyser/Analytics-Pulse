import { createApiSlice } from "@jeffrey-keyser/redux-app-toolkit";
import { BASE_URL, makeStandardHeaders } from "./common";
import { AnalyticsResponse, AnalyticsQueryParams, RealtimeAnalyticsResponse } from "../models/analytics";
import { ExportAnalyticsParams } from "../models/export";

export const analyticsApi = createApiSlice({
  name: "analyticsApi",
  baseUrl: `${BASE_URL}`,
  endpoints: (builder) => ({
    getProjectAnalytics: builder.query<AnalyticsResponse, { projectId: string } & AnalyticsQueryParams>({
      query: ({ projectId, ...params }) => {
        const queryParams = new URLSearchParams();

        if (params.start_date) queryParams.append('start_date', params.start_date);
        if (params.end_date) queryParams.append('end_date', params.end_date);
        if (params.granularity) queryParams.append('granularity', params.granularity);
        if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());

        const queryString = queryParams.toString();
        return `/api/v1/projects/${projectId}/analytics${queryString ? `?${queryString}` : ''}`;
      },
    }),
    getRealtimeAnalytics: builder.query<RealtimeAnalyticsResponse, { projectId: string; pollingInterval?: number }>({
      query: ({ projectId }) => `/api/v1/projects/${projectId}/realtime`,
    }),
    exportAnalytics: builder.mutation<Blob, ExportAnalyticsParams & { format: 'csv' | 'json' }>({
      query: ({ projectId, format, ...params }) => {
        const queryParams = new URLSearchParams();

        queryParams.append('format', format);
        if (params.start_date) queryParams.append('start_date', params.start_date);
        if (params.end_date) queryParams.append('end_date', params.end_date);
        if (params.granularity) queryParams.append('granularity', params.granularity);
        if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());

        const queryString = queryParams.toString();
        return {
          url: `/api/v1/projects/${projectId}/analytics/export${queryString ? `?${queryString}` : ''}`,
          method: 'GET',
          responseHandler: (response: Response) => response.blob(),
        };
      },
    }),
  }),
  options: {
    credentials: "include",
    headers: makeStandardHeaders(),
  },
});

export const {
  useGetProjectAnalyticsQuery,
  useGetRealtimeAnalyticsQuery,
  useExportAnalyticsMutation,
} = analyticsApi;
