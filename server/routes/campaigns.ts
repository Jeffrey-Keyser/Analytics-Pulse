import { Router, Request, Response } from 'express';
import { authenticate } from '@jeffrey-keyser/pay-auth-integration';
import campaignsDal, { CampaignsDal } from '../dal/campaigns';

const router = Router();

/**
 * @openapi
 * /api/v1/projects/{id}/campaigns:
 *   get:
 *     summary: Get campaign statistics
 *     description: Retrieve analytics for all campaigns (grouped by UTM parameters)
 *     tags:
 *       - Campaigns
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for filtering (ISO 8601)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for filtering (ISO 8601)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of campaigns to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of campaigns to skip
 *     responses:
 *       200:
 *         description: Campaign statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 campaigns:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       utm_source:
 *                         type: string
 *                       utm_medium:
 *                         type: string
 *                       utm_campaign:
 *                         type: string
 *                       utm_term:
 *                         type: string
 *                       utm_content:
 *                         type: string
 *                       visits:
 *                         type: integer
 *                       unique_sessions:
 *                         type: integer
 *                       pageviews:
 *                         type: integer
 *                       custom_events:
 *                         type: integer
 *                       bounce_rate:
 *                         type: number
 *                       avg_session_duration:
 *                         type: number
 *                       first_seen:
 *                         type: string
 *                         format: date-time
 *                       last_seen:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 */
router.get('/:id/campaigns', authenticate, async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const { start_date, end_date, limit, offset } = req.query;

    // Parse query parameters
    const startDate = start_date ? new Date(start_date as string) : undefined;
    const endDate = end_date ? new Date(end_date as string) : undefined;
    const limitNum = limit ? parseInt(limit as string, 10) : 50;
    const offsetNum = offset ? parseInt(offset as string, 10) : 0;

    // Get campaign statistics
    const campaigns = await campaignsDal.getCampaignStats({
      projectId,
      startDate,
      endDate,
      limit: limitNum,
      offset: offsetNum,
    });

    res.json({
      campaigns,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        count: campaigns.length,
      },
    });
  } catch (error) {
    console.error('Error fetching campaign stats:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch campaign statistics',
    });
  }
});

/**
 * @openapi
 * /api/v1/projects/{id}/campaigns/compare:
 *   post:
 *     summary: Compare multiple campaigns
 *     description: Compare performance metrics for multiple campaigns
 *     tags:
 *       - Campaigns
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - campaign_names
 *             properties:
 *               campaign_names:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of campaign names to compare
 *               start_date:
 *                 type: string
 *                 format: date-time
 *                 description: Start date for filtering
 *               end_date:
 *                 type: string
 *                 format: date-time
 *                 description: End date for filtering
 *     responses:
 *       200:
 *         description: Campaign comparison results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 campaigns:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       campaign_name:
 *                         type: string
 *                       visits:
 *                         type: integer
 *                       unique_sessions:
 *                         type: integer
 *                       pageviews:
 *                         type: integer
 *                       custom_events:
 *                         type: integer
 *                       bounce_rate:
 *                         type: number
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/campaigns/compare', authenticate, async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const { campaign_names, start_date, end_date } = req.body;

    // Validate required fields
    if (!Array.isArray(campaign_names) || campaign_names.length === 0) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'campaign_names must be a non-empty array',
      });
      return;
    }

    // Parse dates
    const startDate = start_date ? new Date(start_date) : undefined;
    const endDate = end_date ? new Date(end_date) : undefined;

    // Compare campaigns
    const campaigns = await campaignsDal.compareCampaigns({
      projectId,
      campaignNames: campaign_names,
      startDate,
      endDate,
    });

    res.json({ campaigns });
  } catch (error) {
    console.error('Error comparing campaigns:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to compare campaigns',
    });
  }
});

/**
 * @openapi
 * /api/v1/projects/{id}/campaigns/top:
 *   get:
 *     summary: Get top performing campaigns
 *     description: Retrieve top campaigns by a specific metric
 *     tags:
 *       - Campaigns
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *       - in: query
 *         name: metric
 *         schema:
 *           type: string
 *           enum: [visits, sessions, pageviews]
 *           default: visits
 *         description: Metric to sort by
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for filtering
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for filtering
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of top campaigns to return
 *     responses:
 *       200:
 *         description: Top campaigns
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 campaigns:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       utm_source:
 *                         type: string
 *                       utm_medium:
 *                         type: string
 *                       utm_campaign:
 *                         type: string
 *                       visits:
 *                         type: integer
 *                       unique_sessions:
 *                         type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/:id/campaigns/top', authenticate, async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const { metric, start_date, end_date, limit } = req.query;

    // Validate metric
    const validMetrics = ['visits', 'sessions', 'pageviews'];
    const metricValue = metric as 'visits' | 'sessions' | 'pageviews' | undefined;

    if (metric && !validMetrics.includes(metric as string)) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: `metric must be one of: ${validMetrics.join(', ')}`,
      });
      return;
    }

    // Parse parameters
    const startDate = start_date ? new Date(start_date as string) : undefined;
    const endDate = end_date ? new Date(end_date as string) : undefined;
    const limitNum = limit ? parseInt(limit as string, 10) : 10;

    // Get top campaigns
    const campaigns = await campaignsDal.getTopCampaigns({
      projectId,
      metric: metricValue,
      startDate,
      endDate,
      limit: limitNum,
    });

    res.json({ campaigns });
  } catch (error) {
    console.error('Error fetching top campaigns:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch top campaigns',
    });
  }
});

/**
 * @openapi
 * /api/v1/projects/{id}/campaigns/by-parameter:
 *   get:
 *     summary: Get campaign statistics by UTM parameter
 *     description: Retrieve campaign statistics grouped by a specific UTM parameter
 *     tags:
 *       - Campaigns
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *       - in: query
 *         name: parameter
 *         required: true
 *         schema:
 *           type: string
 *           enum: [source, medium, campaign, term, content]
 *         description: UTM parameter to group by
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for filtering
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for filtering
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Campaign statistics by parameter
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 parameter:
 *                   type: string
 *                 stats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       parameter_value:
 *                         type: string
 *                       visits:
 *                         type: integer
 *                       unique_sessions:
 *                         type: integer
 *       400:
 *         description: Invalid parameter
 *       401:
 *         description: Unauthorized
 */
router.get('/:id/campaigns/by-parameter', authenticate, async (req: Request, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const { parameter, start_date, end_date, limit } = req.query;

    // Validate parameter
    const validParameters = ['source', 'medium', 'campaign', 'term', 'content'];
    if (!parameter || !validParameters.includes(parameter as string)) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: `parameter is required and must be one of: ${validParameters.join(', ')}`,
      });
      return;
    }

    // Parse parameters
    const startDate = start_date ? new Date(start_date as string) : undefined;
    const endDate = end_date ? new Date(end_date as string) : undefined;
    const limitNum = limit ? parseInt(limit as string, 10) : 10;

    // Get campaign stats by parameter
    const stats = await campaignsDal.getCampaignStatsByParameter({
      projectId,
      parameter: parameter as 'source' | 'medium' | 'campaign' | 'term' | 'content',
      startDate,
      endDate,
      limit: limitNum,
    });

    res.json({
      parameter,
      stats,
    });
  } catch (error) {
    console.error('Error fetching campaign stats by parameter:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch campaign statistics',
    });
  }
});

/**
 * @openapi
 * /api/v1/projects/{id}/campaigns/{campaignName}/conversions:
 *   get:
 *     summary: Get campaign conversion statistics
 *     description: Retrieve conversion rate for a specific campaign
 *     tags:
 *       - Campaigns
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *       - in: path
 *         name: campaignName
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign name (utm_campaign value)
 *       - in: query
 *         name: conversion_event
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the conversion event
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for filtering
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for filtering
 *     responses:
 *       200:
 *         description: Campaign conversion statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 campaign_name:
 *                   type: string
 *                 total_sessions:
 *                   type: integer
 *                 converted_sessions:
 *                   type: integer
 *                 conversion_rate:
 *                   type: number
 *       400:
 *         description: Missing required parameters
 *       401:
 *         description: Unauthorized
 */
router.get('/:id/campaigns/:campaignName/conversions', authenticate, async (req: Request, res: Response) => {
  try {
    const { id: projectId, campaignName } = req.params;
    const { conversion_event, start_date, end_date } = req.query;

    // Validate required fields
    if (!conversion_event) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'conversion_event is required',
      });
      return;
    }

    // Parse dates
    const startDate = start_date ? new Date(start_date as string) : undefined;
    const endDate = end_date ? new Date(end_date as string) : undefined;

    // Get conversion statistics
    const stats = await campaignsDal.getCampaignConversions({
      projectId,
      campaignName,
      conversionEvent: conversion_event as string,
      startDate,
      endDate,
    });

    res.json(stats);
  } catch (error) {
    console.error('Error fetching campaign conversions:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch campaign conversions',
    });
  }
});

export default router;
