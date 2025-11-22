/**
 * Tests for CampaignsDal
 */

import { CampaignsDal } from '../../../dal/campaigns';
import pool from '../../../db/connection';

// Mock the database connection
jest.mock('../../../db/connection', () => ({
  query: jest.fn(),
}));

describe('CampaignsDal', () => {
  let campaignsDal: CampaignsDal;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    campaignsDal = new CampaignsDal();
    mockQuery = pool.query as jest.Mock;
    mockQuery.mockClear();
  });

  describe('getCampaignStats', () => {
    it('should query campaign statistics with all parameters', async () => {
      const mockResult = {
        rows: [
          {
            utm_source: 'google',
            utm_medium: 'cpc',
            utm_campaign: 'summer_sale',
            utm_term: 'shoes',
            utm_content: 'ad1',
            visits: '100',
            unique_sessions: '80',
            pageviews: '250',
            custom_events: '50',
            bounce_rate: '35.5',
            avg_session_duration: '125.5',
            first_seen: new Date('2025-01-01'),
            last_seen: new Date('2025-01-15'),
          },
        ],
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await campaignsDal.getCampaignStats({
        projectId: 'test-project-id',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        limit: 10,
        offset: 0,
      });

      expect(mockQuery).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].utm_source).toBe('google');
      expect(result[0].utm_campaign).toBe('summer_sale');
    });

    it('should handle no date filters', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await campaignsDal.getCampaignStats({
        projectId: 'test-project-id',
        limit: 50,
      });

      expect(mockQuery).toHaveBeenCalled();
      const query = mockQuery.mock.calls[0][0];
      expect(query).not.toContain('timestamp >=');
      expect(query).not.toContain('timestamp <=');
    });
  });

  describe('compareCampaigns', () => {
    it('should compare multiple campaigns', async () => {
      const mockResult = {
        rows: [
          {
            campaign_name: 'summer_sale',
            visits: '150',
            unique_sessions: '100',
            pageviews: '300',
            custom_events: '50',
            bounce_rate: '30.0',
          },
          {
            campaign_name: 'winter_sale',
            visits: '120',
            unique_sessions: '90',
            pageviews: '250',
            custom_events: '40',
            bounce_rate: '35.0',
          },
        ],
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await campaignsDal.compareCampaigns({
        projectId: 'test-project-id',
        campaignNames: ['summer_sale', 'winter_sale'],
      });

      expect(mockQuery).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].campaign_name).toBe('summer_sale');
      expect(result[1].campaign_name).toBe('winter_sale');
    });

    it('should return empty array for empty campaign list', async () => {
      const result = await campaignsDal.compareCampaigns({
        projectId: 'test-project-id',
        campaignNames: [],
      });

      expect(mockQuery).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('getTopCampaigns', () => {
    it('should get top campaigns by visits', async () => {
      const mockResult = {
        rows: [
          {
            utm_source: 'google',
            utm_medium: 'cpc',
            utm_campaign: 'top_campaign',
            visits: '500',
            unique_sessions: '400',
          },
        ],
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await campaignsDal.getTopCampaigns({
        projectId: 'test-project-id',
        metric: 'visits',
        limit: 10,
      });

      expect(mockQuery).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].utm_campaign).toBe('top_campaign');
    });

    it('should use default limit of 10', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await campaignsDal.getTopCampaigns({
        projectId: 'test-project-id',
      });

      expect(mockQuery).toHaveBeenCalled();
      const params = mockQuery.mock.calls[0][1];
      expect(params[params.length - 1]).toBe(10); // Last param should be limit
    });
  });

  describe('getCampaignStatsByParameter', () => {
    it('should get stats grouped by source', async () => {
      const mockResult = {
        rows: [
          {
            parameter_value: 'google',
            visits: '300',
            unique_sessions: '250',
          },
          {
            parameter_value: 'facebook',
            visits: '200',
            unique_sessions: '180',
          },
        ],
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await campaignsDal.getCampaignStatsByParameter({
        projectId: 'test-project-id',
        parameter: 'source',
        limit: 10,
      });

      expect(mockQuery).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].parameter_value).toBe('google');
      expect(result[0].visits).toBe(300);
      expect(result[0].unique_sessions).toBe(250);
    });

    it('should handle all UTM parameters', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const parameters: Array<'source' | 'medium' | 'campaign' | 'term' | 'content'> = [
        'source',
        'medium',
        'campaign',
        'term',
        'content',
      ];

      for (const parameter of parameters) {
        await campaignsDal.getCampaignStatsByParameter({
          projectId: 'test-project-id',
          parameter,
        });

        expect(mockQuery).toHaveBeenCalled();
        const query = mockQuery.mock.calls[0][0];
        expect(query).toContain(`utm_${parameter}`);
        mockQuery.mockClear();
      }
    });
  });

  describe('getCampaignConversions', () => {
    it('should calculate conversion rate for campaign', async () => {
      const mockResult = {
        rows: [
          {
            campaign_name: 'summer_sale',
            total_sessions: '100',
            converted_sessions: '25',
            conversion_rate: '25.0',
          },
        ],
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await campaignsDal.getCampaignConversions({
        projectId: 'test-project-id',
        campaignName: 'summer_sale',
        conversionEvent: 'purchase',
      });

      expect(mockQuery).toHaveBeenCalled();
      expect(result.campaign_name).toBe('summer_sale');
      expect(result.total_sessions).toBe(100);
      expect(result.converted_sessions).toBe(25);
      expect(result.conversion_rate).toBe(25.0);
    });
  });
});
