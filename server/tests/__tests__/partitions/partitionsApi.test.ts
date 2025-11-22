import request from 'supertest';
import app from '../../../app';
import { pool } from '@jeffrey-keyser/database-base-config';

describe('Partitions API', () => {
  let authToken: string;

  beforeAll(async () => {
    // Deploy partition manager SQL
    const fs = require('fs');
    const path = require('path');
    const sqlPath = path.join(__dirname, '../../../db/scripts/partition-manager.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);

    // Mock auth token for tests
    authToken = 'test-token';
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('GET /api/v1/partitions/health', () => {
    it('should return partition health summary', async () => {
      const response = await request(app)
        .get('/api/v1/partitions/health')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);

      if (response.body.data.length > 0) {
        const healthItem = response.body.data[0];
        expect(healthItem).toHaveProperty('table_name');
        expect(healthItem).toHaveProperty('total_partitions');
        expect(healthItem).toHaveProperty('total_rows');
        expect(healthItem).toHaveProperty('total_size_mb');
        expect(healthItem).toHaveProperty('health_status');
      }
    });
  });

  describe('GET /api/v1/partitions/list', () => {
    it('should list all partitions', async () => {
      const response = await request(app)
        .get('/api/v1/partitions/list')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter partitions by table', async () => {
      const response = await request(app)
        .get('/api/v1/partitions/list?table=events')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);

      // All partitions should be for events table
      response.body.data.forEach((partition: any) => {
        expect(partition.parent_table).toBe('events');
      });
    });
  });

  describe('GET /api/v1/partitions/status', () => {
    it('should return maintenance job status', async () => {
      const response = await request(app)
        .get('/api/v1/partitions/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('isRunning');
      expect(response.body.data).toHaveProperty('jobScheduled');
      expect(typeof response.body.data.isRunning).toBe('boolean');
      expect(typeof response.body.data.jobScheduled).toBe('boolean');
    });
  });

  describe('POST /api/v1/partitions/create', () => {
    it('should create future partitions', async () => {
      const response = await request(app)
        .post('/api/v1/partitions/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          table: 'events',
          monthsAhead: 3,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);

      response.body.data.forEach((result: any) => {
        expect(result).toHaveProperty('partition_name');
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('message');
      });
    });

    it('should reject invalid table names', async () => {
      const response = await request(app)
        .post('/api/v1/partitions/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          table: 'invalid_table',
          monthsAhead: 3,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('Invalid table name');
    });

    it('should reject invalid monthsAhead values', async () => {
      const response = await request(app)
        .post('/api/v1/partitions/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          table: 'events',
          monthsAhead: 50, // Too high
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('monthsAhead must be between');
    });
  });

  describe('POST /api/v1/partitions/analyze', () => {
    it('should analyze partitions', async () => {
      const response = await request(app)
        .post('/api/v1/partitions/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          table: 'events',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should reject invalid table names', async () => {
      const response = await request(app)
        .post('/api/v1/partitions/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          table: 'invalid_table',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/v1/partitions/vacuum', () => {
    it('should vacuum partitions', async () => {
      const response = await request(app)
        .post('/api/v1/partitions/vacuum')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          table: 'events',
          full: false,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should reject invalid table names', async () => {
      const response = await request(app)
        .post('/api/v1/partitions/vacuum')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          table: 'invalid_table',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/v1/partitions/cleanup', () => {
    it('should preview cleanup in dry run mode', async () => {
      const response = await request(app)
        .post('/api/v1/partitions/cleanup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          table: 'events',
          retentionMonths: 12,
          dryRun: true,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Dry run');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should reject invalid retention months', async () => {
      const response = await request(app)
        .post('/api/v1/partitions/cleanup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          table: 'events',
          retentionMonths: 150, // Too high
          dryRun: true,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('retentionMonths must be between');
    });

    it('should reject invalid table names', async () => {
      const response = await request(app)
        .post('/api/v1/partitions/cleanup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          table: 'invalid_table',
          retentionMonths: 12,
          dryRun: true,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/v1/partitions/maintenance', () => {
    it('should trigger maintenance in dry run mode', async () => {
      const response = await request(app)
        .post('/api/v1/partitions/maintenance')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          dryRun: true,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('dry run');
    });

    it('should default to dry run when not specified', async () => {
      const response = await request(app)
        .post('/api/v1/partitions/maintenance')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
  });
});
