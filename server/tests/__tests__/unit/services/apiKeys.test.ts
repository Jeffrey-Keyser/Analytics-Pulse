import { ApiKeyService } from '../../../../services/apiKeys';
import { ApiKeysDal } from '../../../../dal/apiKeys';
import bcrypt from 'bcrypt';

// Mock the DAL
jest.mock('../../../../dal/apiKeys');
jest.mock('bcrypt');

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let mockDal: jest.Mocked<ApiKeysDal>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock DAL
    mockDal = {
      create: jest.fn(),
      findByHash: jest.fn(),
      findById: jest.fn(),
      findByProjectId: jest.fn(),
      findByPrefix: jest.fn(),
      updateLastUsed: jest.fn(),
      revoke: jest.fn(),
      delete: jest.fn(),
      countActiveByProjectId: jest.fn(),
    } as any;

    // Create service with mock DAL
    service = new ApiKeyService(mockDal);
  });

  describe('generateApiKey', () => {
    it('should generate a valid API key with prefix', async () => {
      const projectId = 'test-project-id';
      const mockCreatedKey = {
        id: 'key-id',
        project_id: projectId,
        key_hash: 'hashed-key',
        key_prefix: 'ap_abc12',
        name: null,
        description: null,
        is_active: true,
        last_used_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDal.create.mockResolvedValue(mockCreatedKey);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-key');

      const result = await service.generateApiKey(projectId);

      expect(result.key).toMatch(/^ap_[a-zA-Z0-9]{26}$/);
      expect(result.prefix).toMatch(/^ap_[a-zA-Z0-9]{5}$/);
      expect(result.hash).toBe('hashed-key');
      expect(result.id).toBe('key-id');
      expect(mockDal.create).toHaveBeenCalledWith({
        project_id: projectId,
        key_hash: 'hashed-key',
        key_prefix: expect.stringMatching(/^ap_[a-zA-Z0-9]{5}$/),
        name: undefined,
        description: undefined,
      });
    });

    it('should generate API key with name and description', async () => {
      const projectId = 'test-project-id';
      const name = 'Production Key';
      const description = 'Key for production website';

      const mockCreatedKey = {
        id: 'key-id',
        project_id: projectId,
        key_hash: 'hashed-key',
        key_prefix: 'ap_abc12',
        name,
        description,
        is_active: true,
        last_used_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDal.create.mockResolvedValue(mockCreatedKey);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-key');

      const result = await service.generateApiKey(projectId, name, description);

      expect(mockDal.create).toHaveBeenCalledWith({
        project_id: projectId,
        key_hash: 'hashed-key',
        key_prefix: expect.any(String),
        name,
        description,
      });
    });

    it('should generate unique keys on multiple calls', async () => {
      const projectId = 'test-project-id';

      mockDal.create.mockResolvedValue({
        id: 'key-id',
        project_id: projectId,
        key_hash: 'hashed-key',
        key_prefix: 'ap_abc12',
        name: null,
        description: null,
        is_active: true,
        last_used_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-key');

      const result1 = await service.generateApiKey(projectId);
      const result2 = await service.generateApiKey(projectId);

      expect(result1.key).not.toBe(result2.key);
    });
  });

  describe('validateApiKey', () => {
    it('should return isValid=true for valid active API key', async () => {
      const testKey = 'ap_validkey123456789012345678';
      const mockApiKey = {
        id: 'key-id',
        project_id: 'project-id',
        key_hash: 'hashed-key',
        key_prefix: 'ap_validk',
        name: 'Test Key',
        description: null,
        is_active: true,
        last_used_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDal.findByPrefix.mockResolvedValue([mockApiKey]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateApiKey(testKey);

      expect(result.isValid).toBe(true);
      expect(result.projectId).toBe('project-id');
      expect(result.apiKeyId).toBe('key-id');
      expect(mockDal.findByPrefix).toHaveBeenCalledWith('ap_valid');
      expect(bcrypt.compare).toHaveBeenCalledWith(testKey, 'hashed-key');
      expect(mockDal.updateLastUsed).toHaveBeenCalledWith('key-id');
    });

    it('should return isValid=false for invalid key format', async () => {
      const invalidKey = 'invalid-key-format';

      const result = await service.validateApiKey(invalidKey);

      expect(result.isValid).toBe(false);
      expect(result.projectId).toBeUndefined();
      expect(mockDal.findByPrefix).not.toHaveBeenCalled();
    });

    it('should return isValid=false for wrong prefix', async () => {
      const wrongPrefix = 'wrong_prefix123456789012345678';

      const result = await service.validateApiKey(wrongPrefix);

      expect(result.isValid).toBe(false);
      expect(result.projectId).toBeUndefined();
      expect(mockDal.findByPrefix).not.toHaveBeenCalled();
    });

    it('should return isValid=false for inactive API key', async () => {
      const testKey = 'ap_inactivekey1234567890123456';
      const mockApiKey = {
        id: 'key-id',
        project_id: 'project-id',
        key_hash: 'hashed-key',
        key_prefix: 'ap_inact',
        name: 'Inactive Key',
        description: null,
        is_active: false,
        last_used_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDal.findByPrefix.mockResolvedValue([mockApiKey]);

      const result = await service.validateApiKey(testKey);

      expect(result.isValid).toBe(false);
      expect(result.projectId).toBeUndefined();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return isValid=false when key hash does not match', async () => {
      const testKey = 'ap_wrongkey123456789012345678';
      const mockApiKey = {
        id: 'key-id',
        project_id: 'project-id',
        key_hash: 'hashed-key',
        key_prefix: 'ap_wrongk',
        name: 'Test Key',
        description: null,
        is_active: true,
        last_used_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDal.findByPrefix.mockResolvedValue([mockApiKey]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateApiKey(testKey);

      expect(result.isValid).toBe(false);
      expect(result.projectId).toBeUndefined();
      expect(mockDal.updateLastUsed).not.toHaveBeenCalled();
    });

    it('should handle multiple keys with same prefix', async () => {
      const testKey = 'ap_multikey123456789012345678';
      const mockKeys = [
        {
          id: 'key-1',
          project_id: 'project-1',
          key_hash: 'hashed-key-1',
          key_prefix: 'ap_multik',
          name: 'Key 1',
          description: null,
          is_active: true,
          last_used_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'key-2',
          project_id: 'project-2',
          key_hash: 'hashed-key-2',
          key_prefix: 'ap_multik',
          name: 'Key 2',
          description: null,
          is_active: true,
          last_used_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockDal.findByPrefix.mockResolvedValue(mockKeys);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const result = await service.validateApiKey(testKey);

      expect(result.isValid).toBe(true);
      expect(result.projectId).toBe('project-2');
      expect(result.apiKeyId).toBe('key-2');
      expect(bcrypt.compare).toHaveBeenCalledTimes(2);
    });

    it('should handle empty string gracefully', async () => {
      const result = await service.validateApiKey('');

      expect(result.isValid).toBe(false);
      expect(mockDal.findByPrefix).not.toHaveBeenCalled();
    });
  });

  describe('revokeApiKey', () => {
    it('should call DAL revoke method', async () => {
      const keyId = 'key-id';
      mockDal.revoke.mockResolvedValue();

      await service.revokeApiKey(keyId);

      expect(mockDal.revoke).toHaveBeenCalledWith(keyId);
    });
  });

  describe('listProjectApiKeys', () => {
    it('should return API keys without exposing key hash', async () => {
      const projectId = 'project-id';
      const mockKeys = [
        {
          id: 'key-1',
          project_id: projectId,
          key_hash: 'secret-hash-1',
          key_prefix: 'ap_abc12',
          name: 'Production Key',
          description: 'Main website',
          is_active: true,
          last_used_at: new Date('2025-01-15T10:00:00Z'),
          created_at: new Date('2025-01-01T00:00:00Z'),
          updated_at: new Date('2025-01-01T00:00:00Z'),
        },
        {
          id: 'key-2',
          project_id: projectId,
          key_hash: 'secret-hash-2',
          key_prefix: 'ap_def34',
          name: 'Development Key',
          description: 'Test environment',
          is_active: false,
          last_used_at: null,
          created_at: new Date('2025-01-10T00:00:00Z'),
          updated_at: new Date('2025-01-10T00:00:00Z'),
        },
      ];

      mockDal.findByProjectId.mockResolvedValue(mockKeys);

      const result = await service.listProjectApiKeys(projectId);

      expect(result).toHaveLength(2);
      expect(result[0]).not.toHaveProperty('key_hash');
      expect(result[0]).toEqual({
        id: 'key-1',
        prefix: 'ap_abc12',
        name: 'Production Key',
        description: 'Main website',
        is_active: true,
        last_used_at: mockKeys[0].last_used_at,
        created_at: mockKeys[0].created_at,
      });
    });

    it('should return empty array if no keys found', async () => {
      const projectId = 'project-id';
      mockDal.findByProjectId.mockResolvedValue([]);

      const result = await service.listProjectApiKeys(projectId);

      expect(result).toEqual([]);
    });
  });

  describe('canRevokeKey', () => {
    it('should return true if project has more than one active key', async () => {
      const projectId = 'project-id';
      const keyId = 'key-id';

      mockDal.countActiveByProjectId.mockResolvedValue(2);

      const result = await service.canRevokeKey(projectId, keyId);

      expect(result).toBe(true);
      expect(mockDal.countActiveByProjectId).toHaveBeenCalledWith(projectId);
    });

    it('should return false if project has only one active key', async () => {
      const projectId = 'project-id';
      const keyId = 'key-id';

      mockDal.countActiveByProjectId.mockResolvedValue(1);

      const result = await service.canRevokeKey(projectId, keyId);

      expect(result).toBe(false);
    });

    it('should return true if project has zero active keys', async () => {
      const projectId = 'project-id';
      const keyId = 'key-id';

      mockDal.countActiveByProjectId.mockResolvedValue(0);

      const result = await service.canRevokeKey(projectId, keyId);

      expect(result).toBe(false);
    });
  });

  describe('deleteApiKey', () => {
    it('should call DAL delete method', async () => {
      const keyId = 'key-id';
      mockDal.delete.mockResolvedValue();

      await service.deleteApiKey(keyId);

      expect(mockDal.delete).toHaveBeenCalledWith(keyId);
    });
  });
});
