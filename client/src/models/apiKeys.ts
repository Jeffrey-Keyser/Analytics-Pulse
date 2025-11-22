export interface ApiKey {
  id: string;
  prefix: string;
  name: string | null;
  description: string | null;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

export interface NewApiKey extends ApiKey {
  key: string;
  message: string;
}

export interface GenerateApiKeyRequest {
  name?: string;
  description?: string;
}
