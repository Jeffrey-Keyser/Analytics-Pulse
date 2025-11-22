/**
 * Project-related type definitions
 */

export interface Project {
  id: string;
  name: string;
  domain: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectRequest {
  name: string;
  domain: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  domain?: string;
  description?: string;
  is_active?: boolean;
}

export interface ProjectListResponse {
  success: boolean;
  data: Project[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    page: number;
    pages: number;
  };
}

export interface ProjectResponse {
  success: boolean;
  data: Project;
  message?: string;
}

export interface DeleteProjectResponse {
  success: boolean;
  message: string;
}

export interface ProjectListParams {
  limit?: number;
  offset?: number;
  domain?: string;
  name?: string;
  is_active?: boolean;
}
