import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../../app';
import projectsDal from '../../../dal/projects';

// Mock the pay-auth-integration module
jest.mock('@jeffrey-keyser/pay-auth-integration/server', () => {
  const mockMiddleware = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;

    // Allow public routes to pass through
    const publicRoutes = [
      '/health',
      '/v1/diagnostics',
      '/api-docs',
      '/swagger-ui',
      '/',
      '/ping',
    ];
    if (publicRoutes.includes(req.path)) {
      return next();
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.replace('Bearer ', '');
    try {
      const decoded = jwt.verify(token, 'test-jwt-secret');
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };

  return {
    setupPayAuth: jest.fn(() => ({
      middleware: mockMiddleware,
      routes: require('express').Router(),
    })),
    requireAuth: mockMiddleware,
    PayProxyClient: jest.fn().mockImplementation(() => ({
      createPaymentIntent: jest.fn(),
      getPaymentStatus: jest.fn(),
      processRefund: jest.fn(),
    })),
  };
});

describe('Projects API Integration Tests', () => {
  const TEST_SECRET = 'test-jwt-secret';
  let authToken: string;
  let testProjectId: string;

  beforeAll(() => {
    // Create a valid test token
    authToken = jwt.sign(
      { id: 'test-user-123', email: 'test@example.com', role: 'user' },
      TEST_SECRET
    );
  });

  afterEach(async () => {
    // Clean up test projects
    if (testProjectId) {
      try {
        await projectsDal.delete(testProjectId);
      } catch (error) {
        // Ignore errors if project was already deleted
      }
    }
  });

  describe('POST /api/v1/projects', () => {
    it('should create a new project with valid data', async () => {
      const newProject = {
        name: 'Test Project',
        domain: 'test-project.com',
        description: 'A test project for integration tests'
      };

      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newProject)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('name', newProject.name);
      expect(response.body.data).toHaveProperty('domain', newProject.domain);
      expect(response.body.data).toHaveProperty('description', newProject.description);
      expect(response.body.data).toHaveProperty('is_active', true);
      expect(response.body.data).toHaveProperty('created_at');
      expect(response.body.data).toHaveProperty('updated_at');

      testProjectId = response.body.data.id;
    });

    it('should create a project without description', async () => {
      const newProject = {
        name: 'Minimal Project',
        domain: 'minimal-project.com'
      };

      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newProject)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.description).toBeNull();

      testProjectId = response.body.data.id;
    });

    it('should reject creating a project without authentication', async () => {
      const newProject = {
        name: 'Test Project',
        domain: 'test.com'
      };

      const response = await request(app)
        .post('/api/v1/projects')
        .send(newProject)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication required');
    });

    it('should reject creating a project without name', async () => {
      const newProject = {
        domain: 'test.com'
      };

      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newProject)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
      expect(response.body).toHaveProperty('details');
    });

    it('should reject creating a project without domain', async () => {
      const newProject = {
        name: 'Test Project'
      };

      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newProject)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
    });

    it('should reject creating a project with empty name', async () => {
      const newProject = {
        name: '',
        domain: 'test.com'
      };

      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newProject)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
    });

    it('should reject creating a project with duplicate domain', async () => {
      const projectData = {
        name: 'Original Project',
        domain: 'duplicate-test.com'
      };

      // Create first project
      const firstResponse = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData)
        .expect(201);

      testProjectId = firstResponse.body.data.id;

      // Try to create duplicate
      const duplicateData = {
        name: 'Duplicate Project',
        domain: 'duplicate-test.com'
      };

      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicateData)
        .expect(409);

      expect(response.body).toHaveProperty('error', 'CONFLICT');
      expect(response.body.message).toContain('domain already exists');
    });
  });

  describe('GET /api/v1/projects', () => {
    beforeEach(async () => {
      // Create test projects
      const project = await projectsDal.create({
        name: 'List Test Project',
        domain: 'list-test.com',
        description: 'Project for list tests'
      });
      testProjectId = project.id;
    });

    it('should list all projects', async () => {
      const response = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('offset');
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('pages');
    });

    it('should list projects with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/projects?limit=5&offset=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.pagination.offset).toBe(0);
    });

    it('should filter projects by domain', async () => {
      const response = await request(app)
        .get('/api/v1/projects?domain=list-test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].domain).toContain('list-test');
    });

    it('should filter projects by name', async () => {
      const response = await request(app)
        .get('/api/v1/projects?name=List Test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].name).toContain('List Test');
    });

    it('should filter projects by is_active status', async () => {
      const response = await request(app)
        .get('/api/v1/projects?is_active=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((project: any) => {
        expect(project.is_active).toBe(true);
      });
    });

    it('should reject listing projects without authentication', async () => {
      await request(app)
        .get('/api/v1/projects')
        .expect(401);
    });

    it('should reject invalid pagination parameters', async () => {
      await request(app)
        .get('/api/v1/projects?limit=-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('GET /api/v1/projects/:id', () => {
    beforeEach(async () => {
      const project = await projectsDal.create({
        name: 'Get Test Project',
        domain: 'get-test.com',
        description: 'Project for get tests'
      });
      testProjectId = project.id;
    });

    it('should get a project by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', testProjectId);
      expect(response.body.data).toHaveProperty('name', 'Get Test Project');
      expect(response.body.data).toHaveProperty('domain', 'get-test.com');
    });

    it('should return 404 for non-existent project', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/v1/projects/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'NOT_FOUND');
      expect(response.body.message).toContain('not found');
    });

    it('should reject invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/v1/projects/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
    });

    it('should reject getting project without authentication', async () => {
      await request(app)
        .get(`/api/v1/projects/${testProjectId}`)
        .expect(401);
    });
  });

  describe('PUT /api/v1/projects/:id', () => {
    beforeEach(async () => {
      const project = await projectsDal.create({
        name: 'Update Test Project',
        domain: 'update-test.com',
        description: 'Project for update tests'
      });
      testProjectId = project.id;
    });

    it('should update project name', async () => {
      const updates = {
        name: 'Updated Project Name'
      };

      const response = await request(app)
        .put(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('name', 'Updated Project Name');
      expect(response.body.data).toHaveProperty('domain', 'update-test.com');
    });

    it('should update project domain', async () => {
      const updates = {
        domain: 'updated-domain.com'
      };

      const response = await request(app)
        .put(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.data).toHaveProperty('domain', 'updated-domain.com');
    });

    it('should update project description', async () => {
      const updates = {
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.data).toHaveProperty('description', 'Updated description');
    });

    it('should update project is_active status', async () => {
      const updates = {
        is_active: false
      };

      const response = await request(app)
        .put(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.data).toHaveProperty('is_active', false);
    });

    it('should update multiple fields at once', async () => {
      const updates = {
        name: 'Multi Update',
        description: 'Multi field update test',
        is_active: false
      };

      const response = await request(app)
        .put(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.data).toHaveProperty('name', 'Multi Update');
      expect(response.body.data).toHaveProperty('description', 'Multi field update test');
      expect(response.body.data).toHaveProperty('is_active', false);
    });

    it('should return 404 for non-existent project', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updates = { name: 'Updated Name' };

      const response = await request(app)
        .put(`/api/v1/projects/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'NOT_FOUND');
    });

    it('should reject updating to duplicate domain', async () => {
      // Create another project
      const anotherProject = await projectsDal.create({
        name: 'Another Project',
        domain: 'another-test.com'
      });

      // Try to update first project to use second project's domain
      const updates = {
        domain: 'another-test.com'
      };

      const response = await request(app)
        .put(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(409);

      expect(response.body).toHaveProperty('error', 'CONFLICT');

      // Clean up
      await projectsDal.delete(anotherProject.id);
    });

    it('should reject invalid field types', async () => {
      const updates = {
        is_active: 'not-a-boolean'
      };

      const response = await request(app)
        .put(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
    });

    it('should reject updating without authentication', async () => {
      const updates = { name: 'Updated' };

      await request(app)
        .put(`/api/v1/projects/${testProjectId}`)
        .send(updates)
        .expect(401);
    });
  });

  describe('DELETE /api/v1/projects/:id', () => {
    beforeEach(async () => {
      const project = await projectsDal.create({
        name: 'Delete Test Project',
        domain: 'delete-test.com',
        description: 'Project for delete tests'
      });
      testProjectId = project.id;
    });

    it('should delete a project', async () => {
      const response = await request(app)
        .delete(`/api/v1/projects/${testProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('deleted successfully');

      // Verify project is deleted
      const project = await projectsDal.findById(testProjectId);
      expect(project).toBeNull();

      testProjectId = ''; // Clear so afterEach doesn't try to delete again
    });

    it('should return 404 for non-existent project', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .delete(`/api/v1/projects/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'NOT_FOUND');
    });

    it('should reject deleting with invalid UUID format', async () => {
      await request(app)
        .delete('/api/v1/projects/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should reject deleting without authentication', async () => {
      await request(app)
        .delete(`/api/v1/projects/${testProjectId}`)
        .expect(401);
    });
  });

  describe('Validation Edge Cases', () => {
    it('should handle very long project names', async () => {
      const longName = 'A'.repeat(300);
      const newProject = {
        name: longName,
        domain: 'long-name-test.com'
      };

      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newProject)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
    });

    it('should trim whitespace from name and domain', async () => {
      const newProject = {
        name: '  Trimmed Project  ',
        domain: '  trimmed.com  '
      };

      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newProject)
        .expect(201);

      expect(response.body.data.name).toBe('Trimmed Project');
      expect(response.body.data.domain).toBe('trimmed.com');

      testProjectId = response.body.data.id;
    });

    it('should handle special characters in description', async () => {
      const newProject = {
        name: 'Special Chars',
        domain: 'special-chars.com',
        description: 'Test with special chars: <>&"\'/\\[]{}!@#$%^&*()'
      };

      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newProject)
        .expect(201);

      expect(response.body.data.description).toBe(newProject.description);

      testProjectId = response.body.data.id;
    });
  });

  describe('Response Headers', () => {
    beforeEach(async () => {
      const project = await projectsDal.create({
        name: 'Header Test Project',
        domain: 'header-test.com'
      });
      testProjectId = project.id;
    });

    it('should include API-Version header in responses', async () => {
      const response = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers).toHaveProperty('api-version');
    });
  });
});
