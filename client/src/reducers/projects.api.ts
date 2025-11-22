import { createApiSlice } from "@jeffrey-keyser/redux-app-toolkit";
import { BASE_URL, makeStandardHeaders } from "./common";
import {
  Project,
  ProjectListResponse,
  ProjectResponse,
  DeleteProjectResponse,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectListParams,
} from "../models/projects";

export const projectsApi = createApiSlice({
  name: "projectsApi",
  baseUrl: `${BASE_URL}`,
  endpoints: (builder) => ({
    listProjects: builder.query<ProjectListResponse, ProjectListParams | void>({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.limit !== undefined) searchParams.append('limit', params.limit.toString());
        if (params.offset !== undefined) searchParams.append('offset', params.offset.toString());
        if (params.domain) searchParams.append('domain', params.domain);
        if (params.name) searchParams.append('name', params.name);
        if (params.is_active !== undefined) searchParams.append('is_active', params.is_active.toString());

        const queryString = searchParams.toString();
        return `/api/v1/projects${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ id }) => ({ type: 'Project' as const, id })),
              { type: 'Project', id: 'LIST' },
            ]
          : [{ type: 'Project', id: 'LIST' }],
    }),
    getProject: builder.query<ProjectResponse, string>({
      query: (id) => `/api/v1/projects/${id}`,
      providesTags: (result, error, id) => [{ type: 'Project', id }],
    }),
    createProject: builder.mutation<ProjectResponse, CreateProjectRequest>({
      query: (body) => ({
        url: `/api/v1/projects`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Project', id: 'LIST' }],
    }),
    updateProject: builder.mutation<ProjectResponse, { id: string; body: UpdateProjectRequest }>({
      query: ({ id, body }) => ({
        url: `/api/v1/projects/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Project', id },
        { type: 'Project', id: 'LIST' },
      ],
    }),
    deleteProject: builder.mutation<DeleteProjectResponse, string>({
      query: (id) => ({
        url: `/api/v1/projects/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Project', id: 'LIST' }],
    }),
  }),
  options: {
    credentials: "include",
    headers: makeStandardHeaders(),
  },
  tagTypes: ['Project'],
});

export const {
  useListProjectsQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
} = projectsApi;
