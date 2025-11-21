import { createApiSlice } from "@jeffrey-keyser/redux-app-toolkit";
import { BASE_URL, makeStandardHeaders } from "./common";
import { DetailedDiagnostics } from "../models/common";

export const diagnosticsApi = createApiSlice({
  name: "diagnosticsApi",
  baseUrl: `${BASE_URL}`,
  endpoints: (builder) => ({
    health: builder.query<string, void>({
      query: () => `/health`,
    }),
    detailedDiagnostics: builder.query<DetailedDiagnostics, void>({
      query: () => `/v1/diagnostics/detailed`,
    }),
  }),
  options: {
    credentials: "include",
    headers: makeStandardHeaders(),
  },
});

export const { useHealthQuery, useDetailedDiagnosticsQuery } = diagnosticsApi;
