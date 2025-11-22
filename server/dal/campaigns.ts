import { BaseDal } from '@jeffrey-keyser/database-base-config';
import pool from '../db/connection';
import { UTMParams } from './events';

export interface CampaignStats {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  visits: number;
  unique_sessions: number;
  pageviews: number;
  custom_events: number;
  bounce_rate: number;
  avg_session_duration: number;
  first_seen: Date;
  last_seen: Date;
}

export interface CampaignComparison {
  campaign_name: string;
  visits: number;
  unique_sessions: number;
  pageviews: number;
  custom_events: number;
  bounce_rate: number;
}

export interface TopCampaign {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  visits: number;
  unique_sessions: number;
}

export class CampaignsDal extends BaseDal {
  constructor() {
    super(pool);
  }

  /**
   * Get campaign statistics for a project
   * Groups by all UTM parameters
   */
  async getCampaignStats(params: {
    projectId: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<CampaignStats[]> {
    let query = `
      WITH campaign_data AS (
        SELECT
          utm_params->>'utm_source' as utm_source,
          utm_params->>'utm_medium' as utm_medium,
          utm_params->>'utm_campaign' as utm_campaign,
          utm_params->>'utm_term' as utm_term,
          utm_params->>'utm_content' as utm_content,
          session_id,
          event_type,
          timestamp
        FROM events
        WHERE project_id = $1
          AND utm_params IS NOT NULL
    `;

    const values: any[] = [params.projectId];
    let paramIndex = 2;

    if (params.startDate) {
      query += ` AND timestamp >= $${paramIndex}`;
      values.push(params.startDate);
      paramIndex++;
    }

    if (params.endDate) {
      query += ` AND timestamp <= $${paramIndex}`;
      values.push(params.endDate);
      paramIndex++;
    }

    query += `
      ),
      session_stats AS (
        SELECT
          session_id,
          MIN(timestamp) as session_start,
          MAX(timestamp) as session_end,
          COUNT(*) as event_count
        FROM campaign_data
        GROUP BY session_id
      )
      SELECT
        cd.utm_source,
        cd.utm_medium,
        cd.utm_campaign,
        cd.utm_term,
        cd.utm_content,
        COUNT(*) as visits,
        COUNT(DISTINCT cd.session_id) as unique_sessions,
        SUM(CASE WHEN cd.event_type = 'pageview' THEN 1 ELSE 0 END) as pageviews,
        SUM(CASE WHEN cd.event_type = 'custom' THEN 1 ELSE 0 END) as custom_events,
        ROUND(
          (COUNT(DISTINCT CASE WHEN ss.event_count = 1 THEN cd.session_id END)::numeric /
           NULLIF(COUNT(DISTINCT cd.session_id), 0)) * 100,
          2
        ) as bounce_rate,
        ROUND(
          AVG(EXTRACT(EPOCH FROM (ss.session_end - ss.session_start))),
          2
        ) as avg_session_duration,
        MIN(cd.timestamp) as first_seen,
        MAX(cd.timestamp) as last_seen
      FROM campaign_data cd
      JOIN session_stats ss ON cd.session_id = ss.session_id
      GROUP BY
        cd.utm_source,
        cd.utm_medium,
        cd.utm_campaign,
        cd.utm_term,
        cd.utm_content
      ORDER BY visits DESC
    `;

    if (params.limit !== undefined) {
      query += ` LIMIT $${paramIndex}`;
      values.push(params.limit);
      paramIndex++;
    }

    if (params.offset !== undefined) {
      query += ` OFFSET $${paramIndex}`;
      values.push(params.offset);
    }

    const result = await this.query<CampaignStats>(query, values);
    return result.rows;
  }

  /**
   * Compare multiple campaigns by name
   */
  async compareCampaigns(params: {
    projectId: string;
    campaignNames: string[];
    startDate?: Date;
    endDate?: Date;
  }): Promise<CampaignComparison[]> {
    if (params.campaignNames.length === 0) {
      return [];
    }

    let query = `
      WITH campaign_data AS (
        SELECT
          utm_params->>'utm_campaign' as campaign_name,
          session_id,
          event_type,
          timestamp
        FROM events
        WHERE project_id = $1
          AND utm_params->>'utm_campaign' = ANY($2)
    `;

    const values: any[] = [params.projectId, params.campaignNames];
    let paramIndex = 3;

    if (params.startDate) {
      query += ` AND timestamp >= $${paramIndex}`;
      values.push(params.startDate);
      paramIndex++;
    }

    if (params.endDate) {
      query += ` AND timestamp <= $${paramIndex}`;
      values.push(params.endDate);
      paramIndex++;
    }

    query += `
      ),
      session_stats AS (
        SELECT
          session_id,
          COUNT(*) as event_count
        FROM campaign_data
        GROUP BY session_id
      )
      SELECT
        cd.campaign_name,
        COUNT(*) as visits,
        COUNT(DISTINCT cd.session_id) as unique_sessions,
        SUM(CASE WHEN cd.event_type = 'pageview' THEN 1 ELSE 0 END) as pageviews,
        SUM(CASE WHEN cd.event_type = 'custom' THEN 1 ELSE 0 END) as custom_events,
        ROUND(
          (COUNT(DISTINCT CASE WHEN ss.event_count = 1 THEN cd.session_id END)::numeric /
           NULLIF(COUNT(DISTINCT cd.session_id), 0)) * 100,
          2
        ) as bounce_rate
      FROM campaign_data cd
      JOIN session_stats ss ON cd.session_id = ss.session_id
      GROUP BY cd.campaign_name
      ORDER BY visits DESC
    `;

    const result = await this.query<CampaignComparison>(query, values);
    return result.rows;
  }

  /**
   * Get top campaigns by a specific metric
   */
  async getTopCampaigns(params: {
    projectId: string;
    metric?: 'visits' | 'sessions' | 'pageviews';
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<TopCampaign[]> {
    const metric = params.metric || 'visits';
    const limit = params.limit || 10;

    let query = `
      SELECT
        utm_params->>'utm_source' as utm_source,
        utm_params->>'utm_medium' as utm_medium,
        utm_params->>'utm_campaign' as utm_campaign,
        COUNT(*) as visits,
        COUNT(DISTINCT session_id) as unique_sessions
      FROM events
      WHERE project_id = $1
        AND utm_params IS NOT NULL
    `;

    const values: any[] = [params.projectId];
    let paramIndex = 2;

    if (params.startDate) {
      query += ` AND timestamp >= $${paramIndex}`;
      values.push(params.startDate);
      paramIndex++;
    }

    if (params.endDate) {
      query += ` AND timestamp <= $${paramIndex}`;
      values.push(params.endDate);
      paramIndex++;
    }

    query += `
      GROUP BY
        utm_params->>'utm_source',
        utm_params->>'utm_medium',
        utm_params->>'utm_campaign'
    `;

    // Sort by the specified metric
    switch (metric) {
      case 'sessions':
        query += ' ORDER BY unique_sessions DESC';
        break;
      case 'pageviews':
        query += ' ORDER BY SUM(CASE WHEN event_type = \'pageview\' THEN 1 ELSE 0 END) DESC';
        break;
      default:
        query += ' ORDER BY visits DESC';
    }

    query += ` LIMIT $${paramIndex}`;
    values.push(limit);

    const result = await this.query<TopCampaign>(query, values);
    return result.rows;
  }

  /**
   * Get campaign statistics by a single UTM parameter
   */
  async getCampaignStatsByParameter(params: {
    projectId: string;
    parameter: 'source' | 'medium' | 'campaign' | 'term' | 'content';
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<Array<{ parameter_value: string; visits: number; unique_sessions: number }>> {
    const utmField = `utm_${params.parameter}`;
    const limit = params.limit || 10;

    let query = `
      SELECT
        utm_params->>'${utmField}' as parameter_value,
        COUNT(*) as visits,
        COUNT(DISTINCT session_id) as unique_sessions
      FROM events
      WHERE project_id = $1
        AND utm_params->>'${utmField}' IS NOT NULL
    `;

    const values: any[] = [params.projectId];
    let paramIndex = 2;

    if (params.startDate) {
      query += ` AND timestamp >= $${paramIndex}`;
      values.push(params.startDate);
      paramIndex++;
    }

    if (params.endDate) {
      query += ` AND timestamp <= $${paramIndex}`;
      values.push(params.endDate);
      paramIndex++;
    }

    query += `
      GROUP BY utm_params->>'${utmField}'
      ORDER BY visits DESC
      LIMIT $${paramIndex}
    `;
    values.push(limit);

    const result = await this.query<{ parameter_value: string; visits: string; unique_sessions: string }>(
      query,
      values
    );

    return result.rows.map(row => ({
      parameter_value: row.parameter_value,
      visits: parseInt(row.visits, 10),
      unique_sessions: parseInt(row.unique_sessions, 10),
    }));
  }

  /**
   * Get campaign conversion funnel
   * Useful for tracking conversions for specific campaigns
   */
  async getCampaignConversions(params: {
    projectId: string;
    campaignName: string;
    conversionEvent: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    campaign_name: string;
    total_sessions: number;
    converted_sessions: number;
    conversion_rate: number;
  }> {
    let query = `
      WITH campaign_sessions AS (
        SELECT DISTINCT session_id
        FROM events
        WHERE project_id = $1
          AND utm_params->>'utm_campaign' = $2
    `;

    const values: any[] = [params.projectId, params.campaignName];
    let paramIndex = 3;

    if (params.startDate) {
      query += ` AND timestamp >= $${paramIndex}`;
      values.push(params.startDate);
      paramIndex++;
    }

    if (params.endDate) {
      query += ` AND timestamp <= $${paramIndex}`;
      values.push(params.endDate);
      paramIndex++;
    }

    query += `
      ),
      converted_sessions AS (
        SELECT DISTINCT session_id
        FROM events
        WHERE project_id = $1
          AND event_name = $${paramIndex}
          AND session_id IN (SELECT session_id FROM campaign_sessions)
      )
      SELECT
        $2 as campaign_name,
        (SELECT COUNT(*) FROM campaign_sessions) as total_sessions,
        (SELECT COUNT(*) FROM converted_sessions) as converted_sessions,
        ROUND(
          (SELECT COUNT(*) FROM converted_sessions)::numeric /
          NULLIF((SELECT COUNT(*) FROM campaign_sessions), 0) * 100,
          2
        ) as conversion_rate
    `;

    values.push(params.conversionEvent);

    const result = await this.query<{
      campaign_name: string;
      total_sessions: string;
      converted_sessions: string;
      conversion_rate: string;
    }>(query, values);

    const row = result.rows[0];
    return {
      campaign_name: row.campaign_name,
      total_sessions: parseInt(row.total_sessions, 10),
      converted_sessions: parseInt(row.converted_sessions, 10),
      conversion_rate: parseFloat(row.conversion_rate),
    };
  }
}

export default new CampaignsDal();
