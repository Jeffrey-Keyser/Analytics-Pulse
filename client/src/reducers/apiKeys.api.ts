import { createApiSlice } from "@jeffrey-keyser/redux-app-toolkit";
import { BASE_URL, makeStandardHeaders } from "./common";
import { ApiKey, NewApiKey, GenerateApiKeyRequest } from "../models/apiKeys";

export const apiKeysApi = createApiSlice({
  name: "apiKeysApi",
  baseUrl: `${BASE_URL}/api/v1`,
  endpoints: (builder) => ({
    listApiKeys: builder.query<ApiKey[], string>({
      query: (projectId) => `/projects/${projectId}/api-keys`,
      providesTags: (result, error, projectId) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ApiKey' as const, id })),
              { type: 'ApiKey' as const, id: 'LIST' },
            ]
          : [{ type: 'ApiKey' as const, id: 'LIST' }],
    }),
    generateApiKey: builder.mutation<NewApiKey, { projectId: string; data: GenerateApiKeyRequest }>({
      query: ({ projectId, data }) => ({
        url: `/projects/${projectId}/api-keys`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'ApiKey', id: 'LIST' }],
    }),
    revokeApiKey: builder.mutation<{ success: boolean; message: string }, { projectId: string; keyId: string }>({
      query: ({ projectId, keyId }) => ({
        url: `/projects/${projectId}/api-keys/${keyId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { keyId }) => [
        { type: 'ApiKey', id: keyId },
        { type: 'ApiKey', id: 'LIST' },
      ],
    }),
  }),
  options: {
    credentials: "include",
    headers: makeStandardHeaders(),
  },
  tagTypes: ['ApiKey'],
});

export const {
  useListApiKeysQuery,
  useGenerateApiKeyMutation,
  useRevokeApiKeyMutation,
} = apiKeysApi;
