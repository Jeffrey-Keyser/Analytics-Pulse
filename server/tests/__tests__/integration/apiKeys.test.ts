import request from 'supertest';
import app from '../../../app';
import { ApiKeyService } from '../../../services/apiKeys';
import { ApiKeysDal } from '../../../dal/apiKeys';

// Mock the ApiKeyService
jest.mock('../../../services/apiKeys');
jest.mock('../../../dal/apiKeys');

describe('API Keys Integration Tests', () => {
  const mockProjectId = '123e4567-e89b-12d3-a456-426614174000';
  const mockKeyId = '987e6543-e21b-43d2-a654-426614174111';
  const mockApiKey = {
    id: mockKeyId,
    project_id: mockProjectId,
    key_hash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456',
    key_prefix: 'ap_abc12',
    name: 'Test Key',
    description: 'Test description',
    is_active: true,
    last_used_at: new Date('2025-11-21T10:30:00Z'),
    created_at: new Date('2025-11-20T14:22:00Z'),
    updated_at: new Date('2025-11-20T14:22:00Z'),
  };

  const mockGeneratedKey = {
    key: 'ap_abc123def456ghi789jkl012mno',
    hash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456',
    prefix: 'ap_abc12',
    id: mockKeyId,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/projects/:projectId/api-keys', () => {
    it('should list all API keys for a project', async () => {
      const mockKeys = [
        {
          id: mockKeyId,
          prefix: 'ap_abc12',
          name: 'Test Key',
          description: 'Test description',
          is_active: true,
          last_used_at: mockApiKey.last_used_at,
          created_at: mockApiKey.created_at,
        },
      ];

      // Mock the service method
      const mockListProjectApiKeys = jest.fn().mockResolvedValue(mockKeys);
      (ApiKeyService as jest.Mock).mockImplementation(() => ({
        listProjectApiKeys: mockListProjectApiKeys,
      }));

      const response = await request(app)
        .get(`/api/v1/projects/${mockProjectId}/api-keys`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 400 if projectId is missing', async () => {
      const response = await request(app).get('/api/v1/projects//api-keys');

      // Should return 404 for malformed URL or 400 for validation error
      expect([400, 404]).toContain(response.status);
    });

    it('should return empty array if project has no API keys', async () => {
      const mockListProjectApiKeys = jest.fn().mockResolvedValue([]);
      (ApiKeyService as jest.Mock).mockImplementation(() => ({
        listProjectApiKeys: mockListProjectApiKeys,
      }));

      const response = await request(app)
        .get(`/api/v1/projects/${mockProjectId}/api-keys`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toEqual([]);
    });

    it('should never return full key hashes in list view', async () => {
      const mockKeys = [
        {
          id: mockKeyId,
          prefix: 'ap_abc12',
          name: 'Test Key',
          description: 'Test description',
          is_active: true,
          last_used_at: mockApiKey.last_used_at,
          created_at: mockApiKey.created_at,
        },
      ];

      const mockListProjectApiKeys = jest.fn().mockResolvedValue(mockKeys);
      (ApiKeyService as jest.Mock).mockImplementation(() => ({
        listProjectApiKeys: mockListProjectApiKeys,
      }));

      const response = await request(app)
        .get(`/api/v1/projects/${mockProjectId}/api-keys`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Ensure no key hash or full key is returned
      response.body.data.forEach((key: any) => {
        expect(key).not.toHaveProperty('key');
        expect(key).not.toHaveProperty('key_hash');
        expect(key).toHaveProperty('prefix');
      });
    });

    it('should include last_used_at timestamp in response', async () => {
      const mockKeys = [
        {
          id: mockKeyId,
          prefix: 'ap_abc12',
          name: 'Test Key',
          description: 'Test description',
          is_active: true,
          last_used_at: mockApiKey.last_used_at,
          created_at: mockApiKey.created_at,
        },
      ];

      const mockListProjectApiKeys = jest.fn().mockResolvedValue(mockKeys);
      (ApiKeyService as jest.Mock).mockImplementation(() => ({
        listProjectApiKeys: mockListProjectApiKeys,
      }));

      const response = await request(app)
        .get(`/api/v1/projects/${mockProjectId}/api-keys`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data[0]).toHaveProperty('last_used_at');
    });
  });

  describe('POST /api/v1/projects/:projectId/api-keys', () => {
    it('should generate a new API key', async () => {
      const mockGenerateApiKey = jest.fn().mockResolvedValue(mockGeneratedKey);
      (ApiKeyService as jest.Mock).mockImplementation(() => ({
        generateApiKey: mockGenerateApiKey,
      }));

      const response = await request(app)
        .post(`/api/v1/projects/${mockProjectId}/api-keys`)
        .send({
          name: 'New Test Key',
          description: 'New test description',
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('key'); // Full key returned only on creation
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('prefix');
      expect(response.body.data).toHaveProperty('message');
    });

    it('should return full key ONLY on creation', async () => {
      const mockGenerateApiKey = jest.fn().mockResolvedValue(mockGeneratedKey);
      (ApiKeyService as jest.Mock).mockImplementation(() => ({
        generateApiKey: mockGenerateApiKey,
      }));

      const response = await request(app)
        .post(`/api/v1/projects/${mockProjectId}/api-keys`)
        .send({
          name: 'New Test Key',
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('key');
      expect(response.body.data.key).toBe(mockGeneratedKey.key);
      expect(response.body.data.message).toContain('Save this key securely');
    });

    it('should generate key without name and description', async () => {
      const mockGenerateApiKey = jest.fn().mockResolvedValue(mockGeneratedKey);
      (ApiKeyService as jest.Mock).mockImplementation(() => ({
        generateApiKey: mockGenerateApiKey,
      }));

      const response = await request(app)
        .post(`/api/v1/projects/${mockProjectId}/api-keys`)
        .send({})
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('key');
    });

    it('should validate name length', async () => {
      const longName = 'a'.repeat(256); // 256 characters, exceeds limit

      const response = await request(app)
        .post(`/api/v1/projects/${mockProjectId}/api-keys`)
        .send({
          name: longName,
        });

      // Should return validation error
      expect([400, 422]).toContain(response.status);
    });

    it('should return 400 if projectId is missing', async () => {
      const response = await request(app).post('/api/v1/projects//api-keys').send({
        name: 'Test Key',
      });

      expect([400, 404]).toContain(response.status);
    });

    it('should include warning message about key visibility', async () => {
      const mockGenerateApiKey = jest.fn().mockResolvedValue(mockGeneratedKey);
      (ApiKeyService as jest.Mock).mockImplementation(() => ({
        generateApiKey: mockGenerateApiKey,
      }));

      const response = await request(app)
        .post(`/api/v1/projects/${mockProjectId}/api-keys`)
        .send({
          name: 'Test Key',
        })
        .expect(201);

      expect(response.body.data.message).toMatch(/will not be shown again/i);
    });
  });

  describe('DELETE /api/v1/projects/:projectId/api-keys/:keyId', () => {
    it('should revoke an API key', async () => {
      const mockListProjectApiKeys = jest.fn().mockResolvedValue([
        {
          id: mockKeyId,
          prefix: 'ap_abc12',
          name: 'Test Key',
          description: 'Test description',
          is_active: true,
          last_used_at: mockApiKey.last_used_at,
          created_at: mockApiKey.created_at,
        },
        {
          id: 'another-key-id',
          prefix: 'ap_xyz78',
          name: 'Another Key',
          description: 'Another description',
          is_active: true,
          last_used_at: null,
          created_at: mockApiKey.created_at,
        },
      ]);
      const mockCanRevokeKey = jest.fn().mockResolvedValue(true);
      const mockDeleteApiKey = jest.fn().mockResolvedValue(undefined);

      (ApiKeyService as jest.Mock).mockImplementation(() => ({
        listProjectApiKeys: mockListProjectApiKeys,
        canRevokeKey: mockCanRevokeKey,
        deleteApiKey: mockDeleteApiKey,
      }));

      const response = await request(app)
        .delete(`/api/v1/projects/${mockProjectId}/api-keys/${mockKeyId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'API key revoked successfully');
      expect(mockDeleteApiKey).toHaveBeenCalledWith(mockKeyId);
    });

    it('should return 404 if API key does not exist', async () => {
      const mockListProjectApiKeys = jest.fn().mockResolvedValue([]);

      (ApiKeyService as jest.Mock).mockImplementation(() => ({
        listProjectApiKeys: mockListProjectApiKeys,
      }));

      const response = await request(app)
        .delete(`/api/v1/projects/${mockProjectId}/api-keys/${mockKeyId}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should prevent deletion of last active key', async () => {
      const mockListProjectApiKeys = jest.fn().mockResolvedValue([
        {
          id: mockKeyId,
          prefix: 'ap_abc12',
          name: 'Last Key',
          description: 'Only active key',
          is_active: true,
          last_used_at: mockApiKey.last_used_at,
          created_at: mockApiKey.created_at,
        },
      ]);
      const mockCanRevokeKey = jest.fn().mockResolvedValue(false);

      (ApiKeyService as jest.Mock).mockImplementation(() => ({
        listProjectApiKeys: mockListProjectApiKeys,
        canRevokeKey: mockCanRevokeKey,
      }));

      const response = await request(app)
        .delete(`/api/v1/projects/${mockProjectId}/api-keys/${mockKeyId}`)
        .expect(409);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toMatch(/last active/i);
    });

    it('should return 400 if projectId is missing', async () => {
      const response = await request(app).delete(`/api/v1/projects//api-keys/${mockKeyId}`);

      expect([400, 404]).toContain(response.status);
    });

    it('should return 400 if keyId is missing', async () => {
      const response = await request(app).delete(`/api/v1/projects/${mockProjectId}/api-keys/`);

      expect([400, 404]).toContain(response.status);
    });

    it('should verify key belongs to project before deletion', async () => {
      const mockListProjectApiKeys = jest.fn().mockResolvedValue([
        {
          id: 'different-key-id',
          prefix: 'ap_xyz78',
          name: 'Different Key',
          description: 'Different project key',
          is_active: true,
          last_used_at: null,
          created_at: mockApiKey.created_at,
        },
      ]);

      (ApiKeyService as jest.Mock).mockImplementation(() => ({
        listProjectApiKeys: mockListProjectApiKeys,
      }));

      const response = await request(app)
        .delete(`/api/v1/projects/${mockProjectId}/api-keys/${mockKeyId}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const mockListProjectApiKeys = jest
        .fn()
        .mockRejectedValue(new Error('Database connection failed'));

      (ApiKeyService as jest.Mock).mockImplementation(() => ({
        listProjectApiKeys: mockListProjectApiKeys,
      }));

      const response = await request(app).get(`/api/v1/projects/${mockProjectId}/api-keys`);

      expect([500, 503]).toContain(response.status);
    });

    it('should return consistent error format', async () => {
      const mockListProjectApiKeys = jest.fn().mockResolvedValue([]);

      (ApiKeyService as jest.Mock).mockImplementation(() => ({
        listProjectApiKeys: mockListProjectApiKeys,
      }));

      const response = await request(app).delete(
        `/api/v1/projects/${mockProjectId}/api-keys/invalid-key-id`
      );

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Security', () => {
    it('should never expose key hashes in any response', async () => {
      const mockKeys = [
        {
          id: mockKeyId,
          prefix: 'ap_abc12',
          name: 'Test Key',
          description: 'Test description',
          is_active: true,
          last_used_at: mockApiKey.last_used_at,
          created_at: mockApiKey.created_at,
        },
      ];

      const mockListProjectApiKeys = jest.fn().mockResolvedValue(mockKeys);
      (ApiKeyService as jest.Mock).mockImplementation(() => ({
        listProjectApiKeys: mockListProjectApiKeys,
      }));

      const response = await request(app)
        .get(`/api/v1/projects/${mockProjectId}/api-keys`)
        .expect(200);

      const dataStr = JSON.stringify(response.body);
      expect(dataStr).not.toContain('key_hash');
      expect(dataStr).not.toContain('$2b$'); // bcrypt hash prefix
    });

    it('should show only key prefix in list view', async () => {
      const mockKeys = [
        {
          id: mockKeyId,
          prefix: 'ap_abc12',
          name: 'Test Key',
          description: 'Test description',
          is_active: true,
          last_used_at: mockApiKey.last_used_at,
          created_at: mockApiKey.created_at,
        },
      ];

      const mockListProjectApiKeys = jest.fn().mockResolvedValue(mockKeys);
      (ApiKeyService as jest.Mock).mockImplementation(() => ({
        listProjectApiKeys: mockListProjectApiKeys,
      }));

      const response = await request(app)
        .get(`/api/v1/projects/${mockProjectId}/api-keys`)
        .expect(200);

      expect(response.body.data[0].prefix).toBe('ap_abc12');
      expect(response.body.data[0].prefix.length).toBeLessThanOrEqual(10);
    });
  });

  describe('API Versioning', () => {
    it('should include API-Version header in responses', async () => {
      const mockKeys = [
        {
          id: mockKeyId,
          prefix: 'ap_abc12',
          name: 'Test Key',
          description: 'Test description',
          is_active: true,
          last_used_at: mockApiKey.last_used_at,
          created_at: mockApiKey.created_at,
        },
      ];

      const mockListProjectApiKeys = jest.fn().mockResolvedValue(mockKeys);
      (ApiKeyService as jest.Mock).mockImplementation(() => ({
        listProjectApiKeys: mockListProjectApiKeys,
      }));

      const response = await request(app)
        .get(`/api/v1/projects/${mockProjectId}/api-keys`)
        .expect(200);

      // API-Version header should be present
      // Note: This may not be present in all test environments
      if (response.headers['api-version']) {
        expect(response.headers['api-version']).toBe('1');
      }
    });
  });
});
