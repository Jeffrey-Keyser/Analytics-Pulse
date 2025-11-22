/**
 * Integration tests for Campaigns API endpoints
 */

import request from 'supertest';
import app from '../../../app';

// Mock authentication middleware
jest.mock('@jeffrey-keyser/pay-auth-integration', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id' };
    next();
  },
}));

// Mock campaigns DAL
jest.mock('../../../dal/campaigns', () => ({
  __esModule: true,
  default: {
    getCampaignStats: jest.fn(),
    compareCampaigns: jest.fn(),
    getTopCampaigns: jest.fn(),
    getCampaignStatsByParameter: jest.fn(),
    getCampaignConversions: jest.fn(),
  },
  CampaignsDal: jest.fn().mockImplementation(() => ({
    getCampaignStats: jest.fn(),
    compareCampaigns: jest.fn(),
    getTopCampaigns: jest.fn(),
    getCampaignStatsByParameter: jest.fn(),
    getCampaignConversions: jest.fn(),
  })),
}));

import campaignsDal from '../../../dal/campaigns';

describe('Campaigns API Endpoints', () => {
  const projectId = 'test-project-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/projects/:id/campaigns', () => {
    it('should return campaign statistics', async () => {
      const mockCampaigns = [
        {
          utm_source: 'google',
          utm_medium: 'cpc',
          utm_campaign: 'summer_sale',
          utm_term: null,
          utm_content: null,
          visits: 100,
          unique_sessions: 80,
          pageviews: 250,
          custom_events: 50,
          bounce_rate: 35.5,
          avg_session_duration: 125.5,
          first_seen: new Date('2025-01-01'),
          last_seen: new Date('2025-01-15'),
        },
      ];

      (campaignsDal.getCampaignStats as jest.Mock).mockResolvedValue(mockCampaigns);

      const response = await request(app)
        .get(`/api/v1/projects/${projectId}/campaigns`)
        .expect(200);

      expect(response.body.campaigns).toHaveLength(1);
      expect(response.body.campaigns[0].utm_campaign).toBe('summer_sale');
      expect(response.body.pagination).toBeDefined();
    });

    it('should accept date range query parameters', async () => {
      (campaignsDal.getCampaignStats as jest.Mock).mockResolvedValue([]);

      await request(app)
        .get(`/api/v1/projects/${projectId}/campaigns`)
        .query({
          start_date: '2025-01-01T00:00:00Z',
          end_date: '2025-01-31T23:59:59Z',
          limit: 10,
          offset: 0,
        })
        .expect(200);

      expect(campaignsDal.getCampaignStats).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId,
          startDate: expect.any(Date),
          endDate: expect.any(Date),
          limit: 10,
          offset: 0,
        })
      );
    });
  });

  describe('POST /api/v1/projects/:id/campaigns/compare', () => {
    it('should compare multiple campaigns', async () => {
      const mockComparison = [
        {
          campaign_name: 'summer_sale',
          visits: 150,
          unique_sessions: 100,
          pageviews: 300,
          custom_events: 50,
          bounce_rate: 30.0,
        },
        {
          campaign_name: 'winter_sale',
          visits: 120,
          unique_sessions: 90,
          pageviews: 250,
          custom_events: 40,
          bounce_rate: 35.0,
        },
      ];

      (campaignsDal.compareCampaigns as jest.Mock).mockResolvedValue(mockComparison);

      const response = await request(app)
        .post(`/api/v1/projects/${projectId}/campaigns/compare`)
        .send({
          campaign_names: ['summer_sale', 'winter_sale'],
        })
        .expect(200);

      expect(response.body.campaigns).toHaveLength(2);
      expect(response.body.campaigns[0].campaign_name).toBe('summer_sale');
    });

    it('should return 400 for invalid campaign_names', async () => {
      await request(app)
        .post(`/api/v1/projects/${projectId}/campaigns/compare`)
        .send({
          campaign_names: [],
        })
        .expect(400);

      await request(app)
        .post(`/api/v1/projects/${projectId}/campaigns/compare`)
        .send({})
        .expect(400);
    });
  });

  describe('GET /api/v1/projects/:id/campaigns/top', () => {
    it('should return top campaigns', async () => {
      const mockTopCampaigns = [
        {
          utm_source: 'google',
          utm_medium: 'cpc',
          utm_campaign: 'top_campaign',
          visits: 500,
          unique_sessions: 400,
        },
      ];

      (campaignsDal.getTopCampaigns as jest.Mock).mockResolvedValue(mockTopCampaigns);

      const response = await request(app)
        .get(`/api/v1/projects/${projectId}/campaigns/top`)
        .query({ metric: 'visits', limit: 10 })
        .expect(200);

      expect(response.body.campaigns).toHaveLength(1);
      expect(response.body.campaigns[0].utm_campaign).toBe('top_campaign');
    });

    it('should validate metric parameter', async () => {
      await request(app)
        .get(`/api/v1/projects/${projectId}/campaigns/top`)
        .query({ metric: 'invalid' })
        .expect(400);
    });
  });

  describe('GET /api/v1/projects/:id/campaigns/by-parameter', () => {
    it('should return stats grouped by parameter', async () => {
      const mockStats = [
        {
          parameter_value: 'google',
          visits: 300,
          unique_sessions: 250,
        },
        {
          parameter_value: 'facebook',
          visits: 200,
          unique_sessions: 180,
        },
      ];

      (campaignsDal.getCampaignStatsByParameter as jest.Mock).mockResolvedValue(mockStats);

      const response = await request(app)
        .get(`/api/v1/projects/${projectId}/campaigns/by-parameter`)
        .query({ parameter: 'source' })
        .expect(200);

      expect(response.body.parameter).toBe('source');
      expect(response.body.stats).toHaveLength(2);
      expect(response.body.stats[0].parameter_value).toBe('google');
    });

    it('should validate parameter', async () => {
      await request(app)
        .get(`/api/v1/projects/${projectId}/campaigns/by-parameter`)
        .query({ parameter: 'invalid' })
        .expect(400);

      await request(app)
        .get(`/api/v1/projects/${projectId}/campaigns/by-parameter`)
        .expect(400);
    });
  });

  describe('GET /api/v1/projects/:id/campaigns/:campaignName/conversions', () => {
    it('should return conversion statistics', async () => {
      const mockConversions = {
        campaign_name: 'summer_sale',
        total_sessions: 100,
        converted_sessions: 25,
        conversion_rate: 25.0,
      };

      (campaignsDal.getCampaignConversions as jest.Mock).mockResolvedValue(mockConversions);

      const response = await request(app)
        .get(`/api/v1/projects/${projectId}/campaigns/summer_sale/conversions`)
        .query({ conversion_event: 'purchase' })
        .expect(200);

      expect(response.body.campaign_name).toBe('summer_sale');
      expect(response.body.total_sessions).toBe(100);
      expect(response.body.conversion_rate).toBe(25.0);
    });

    it('should require conversion_event parameter', async () => {
      await request(app)
        .get(`/api/v1/projects/${projectId}/campaigns/summer_sale/conversions`)
        .expect(400);
    });

    it('should handle URL-encoded campaign names', async () => {
      const mockConversions = {
        campaign_name: 'summer sale 2025',
        total_sessions: 50,
        converted_sessions: 10,
        conversion_rate: 20.0,
      };

      (campaignsDal.getCampaignConversions as jest.Mock).mockResolvedValue(mockConversions);

      const response = await request(app)
        .get(`/api/v1/projects/${projectId}/campaigns/${encodeURIComponent('summer sale 2025')}/conversions`)
        .query({ conversion_event: 'signup' })
        .expect(200);

      expect(response.body.campaign_name).toBe('summer sale 2025');
    });
  });
});
