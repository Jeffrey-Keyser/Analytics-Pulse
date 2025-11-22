import { createApiSlice } from "@jeffrey-keyser/redux-app-toolkit";
import { BASE_URL, makeStandardHeaders } from "./common";
import {
  EventsResponse,
  EventsAggregateResponse,
  EventsQueryParams,
  EventsAggregateParams
} from "../models/events";
import { ExportEventsParams } from "../models/export";

export const eventsApi = createApiSlice({
  name: "eventsApi",
  baseUrl: `${BASE_URL}`,
  endpoints: (builder) => ({
    getProjectEvents: builder.query<EventsResponse, { projectId: string } & EventsQueryParams>({
      query: ({ projectId, ...params }) => {
        const queryParams = new URLSearchParams();

        if (params.event_name) queryParams.append('event_name', params.event_name);
        if (params.start_date) queryParams.append('start_date', params.start_date);
        if (params.end_date) queryParams.append('end_date', params.end_date);
        if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
        if (params.offset !== undefined) queryParams.append('offset', params.offset.toString());

        const queryString = queryParams.toString();
        return `/api/v1/projects/${projectId}/events${queryString ? `?${queryString}` : ''}`;
      },
    }),
    getProjectEventsAggregate: builder.query<EventsAggregateResponse, { projectId: string } & Omit<EventsAggregateParams, 'aggregate'>>({
      query: ({ projectId, ...params }) => {
        const queryParams = new URLSearchParams();
        queryParams.append('aggregate', 'true');

        if (params.start_date) queryParams.append('start_date', params.start_date);
        if (params.end_date) queryParams.append('end_date', params.end_date);

        const queryString = queryParams.toString();
        return `/api/v1/projects/${projectId}/events?${queryString}`;
      },
    }),
    exportEvents: builder.mutation<Blob, ExportEventsParams & { format: 'csv' | 'json' }>({
      query: ({ projectId, format, ...params }) => {
        const queryParams = new URLSearchParams();

        queryParams.append('format', format);
        if (params.event_name) queryParams.append('event_name', params.event_name);
        if (params.start_date) queryParams.append('start_date', params.start_date);
        if (params.end_date) queryParams.append('end_date', params.end_date);
        if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
        if (params.offset !== undefined) queryParams.append('offset', params.offset.toString());

        const queryString = queryParams.toString();
        return {
          url: `/api/v1/projects/${projectId}/events/export${queryString ? `?${queryString}` : ''}`,
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
  useGetProjectEventsQuery,
  useGetProjectEventsAggregateQuery,
  useExportEventsMutation,
} = eventsApi;
