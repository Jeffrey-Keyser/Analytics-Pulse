import { createApiSlice } from "@jeffrey-keyser/redux-app-toolkit";
import { BASE_URL, makeStandardHeaders } from "./common";
import {
  CampaignStatsResponse,
  CampaignComparisonResponse,
  TopCampaignsResponse,
  CampaignStatsByParameterResponse,
  CampaignConversionsResponse,
  CampaignQueryParams,
  CampaignComparisonParams,
  TopCampaignsParams,
  CampaignStatsByParameterParams,
  CampaignConversionsParams,
} from "../models/campaigns";
import { ExportCampaignsParams } from "../models/export";

export const campaignsApi = createApiSlice({
  name: "campaignsApi",
  baseUrl: `${BASE_URL}`,
  endpoints: (builder) => ({
    getCampaignStats: builder.query<CampaignStatsResponse, { projectId: string } & CampaignQueryParams>({
      query: ({ projectId, ...params }) => {
        const queryParams = new URLSearchParams();

        if (params.start_date) queryParams.append('start_date', params.start_date);
        if (params.end_date) queryParams.append('end_date', params.end_date);
        if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
        if (params.offset !== undefined) queryParams.append('offset', params.offset.toString());

        const queryString = queryParams.toString();
        return `/api/v1/projects/${projectId}/campaigns${queryString ? `?${queryString}` : ''}`;
      },
    }),
    compareCampaigns: builder.mutation<CampaignComparisonResponse, { projectId: string } & CampaignComparisonParams>({
      query: ({ projectId, ...body }) => ({
        url: `/api/v1/projects/${projectId}/campaigns/compare`,
        method: 'POST',
        body,
      }),
    }),
    getTopCampaigns: builder.query<TopCampaignsResponse, { projectId: string } & TopCampaignsParams>({
      query: ({ projectId, ...params }) => {
        const queryParams = new URLSearchParams();

        if (params.metric) queryParams.append('metric', params.metric);
        if (params.start_date) queryParams.append('start_date', params.start_date);
        if (params.end_date) queryParams.append('end_date', params.end_date);
        if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());

        const queryString = queryParams.toString();
        return `/api/v1/projects/${projectId}/campaigns/top${queryString ? `?${queryString}` : ''}`;
      },
    }),
    getCampaignStatsByParameter: builder.query<
      CampaignStatsByParameterResponse,
      { projectId: string } & CampaignStatsByParameterParams
    >({
      query: ({ projectId, ...params }) => {
        const queryParams = new URLSearchParams();

        queryParams.append('parameter', params.parameter);
        if (params.start_date) queryParams.append('start_date', params.start_date);
        if (params.end_date) queryParams.append('end_date', params.end_date);
        if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());

        const queryString = queryParams.toString();
        return `/api/v1/projects/${projectId}/campaigns/by-parameter${queryString ? `?${queryString}` : ''}`;
      },
    }),
    getCampaignConversions: builder.query<
      CampaignConversionsResponse,
      { projectId: string; campaignName: string } & CampaignConversionsParams
    >({
      query: ({ projectId, campaignName, ...params }) => {
        const queryParams = new URLSearchParams();

        queryParams.append('conversion_event', params.conversion_event);
        if (params.start_date) queryParams.append('start_date', params.start_date);
        if (params.end_date) queryParams.append('end_date', params.end_date);

        const queryString = queryParams.toString();
        return `/api/v1/projects/${projectId}/campaigns/${encodeURIComponent(campaignName)}/conversions${queryString ? `?${queryString}` : ''}`;
      },
    }),
    exportCampaigns: builder.mutation<Blob, ExportCampaignsParams & { format: 'csv' | 'json' }>({
      query: ({ projectId, format, ...params }) => {
        const queryParams = new URLSearchParams();

        queryParams.append('format', format);
        if (params.start_date) queryParams.append('start_date', params.start_date);
        if (params.end_date) queryParams.append('end_date', params.end_date);
        if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
        if (params.offset !== undefined) queryParams.append('offset', params.offset.toString());

        const queryString = queryParams.toString();
        return {
          url: `/api/v1/projects/${projectId}/campaigns/export${queryString ? `?${queryString}` : ''}`,
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
  useGetCampaignStatsQuery,
  useCompareCampaignsMutation,
  useGetTopCampaignsQuery,
  useGetCampaignStatsByParameterQuery,
  useGetCampaignConversionsQuery,
  useExportCampaignsMutation,
} = campaignsApi;
