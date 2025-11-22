import { Request, Response } from 'express';
import goalsDal, { GoalType } from '../dal/goals';
import projectsDal from '../dal/projects';

/**
 * Goals Controller
 * Handles goal management and conversion tracking endpoints
 */

interface CreateGoalRequest {
  name: string;
  description?: string;
  goal_type: GoalType;
  target_event_name?: string;
  target_url_pattern?: string;
  target_value?: number;
  is_active?: boolean;
}

interface UpdateGoalRequest {
  name?: string;
  description?: string;
  goal_type?: GoalType;
  target_event_name?: string;
  target_url_pattern?: string;
  target_value?: number;
  is_active?: boolean;
}

interface QueryGoalsParams {
  include_inactive?: 'true' | 'false';
  with_stats?: 'true' | 'false';
  start_date?: string;
  end_date?: string;
}

interface QueryCompletionsParams {
  goal_id?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

interface FunnelRequest {
  goal_ids: string[];
  start_date?: string;
  end_date?: string;
}

class GoalsController {
  /**
   * Create a new goal
   * POST /api/v1/projects/:id/goals
   */
  async createGoal(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.id;
      const goalData: CreateGoalRequest = req.body;

      // Verify project exists
      const project = await projectsDal.findById(projectId);
      if (!project) {
        res.status(404).json({
          success: false,
          error: 'PROJECT_NOT_FOUND',
          message: 'Project not found'
        });
        return;
      }

      // Validate goal type and required fields
      if (goalData.goal_type === 'event' && !goalData.target_event_name) {
        res.status(400).json({
          success: false,
          error: 'INVALID_GOAL',
          message: 'target_event_name is required for event-type goals'
        });
        return;
      }

      if (goalData.goal_type === 'pageview' && !goalData.target_url_pattern) {
        res.status(400).json({
          success: false,
          error: 'INVALID_GOAL',
          message: 'target_url_pattern is required for pageview-type goals'
        });
        return;
      }

      if (goalData.goal_type === 'value' && goalData.target_value === undefined) {
        res.status(400).json({
          success: false,
          error: 'INVALID_GOAL',
          message: 'target_value is required for value-type goals'
        });
        return;
      }

      const goal = await goalsDal.create({
        project_id: projectId,
        ...goalData
      });

      res.status(201).json({
        success: true,
        data: goal
      });
    } catch (error) {
      console.error('Error creating goal:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to create goal'
      });
    }
  }

  /**
   * Get all goals for a project
   * GET /api/v1/projects/:id/goals
   */
  async getGoals(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.id;
      const {
        include_inactive = 'false',
        with_stats = 'false',
        start_date,
        end_date
      } = req.query as QueryGoalsParams;

      // Verify project exists
      const project = await projectsDal.findById(projectId);
      if (!project) {
        res.status(404).json({
          success: false,
          error: 'PROJECT_NOT_FOUND',
          message: 'Project not found'
        });
        return;
      }

      // Parse dates if provided
      const startDate = start_date ? new Date(start_date) : undefined;
      const endDate = end_date ? new Date(end_date) : undefined;

      // Validate date range
      if (startDate && endDate && startDate > endDate) {
        res.status(400).json({
          success: false,
          error: 'INVALID_DATE_RANGE',
          message: 'start_date must be before end_date'
        });
        return;
      }

      let goals;
      if (with_stats === 'true') {
        goals = await goalsDal.findByProjectIdWithStats(
          projectId,
          startDate,
          endDate
        );
      } else {
        goals = await goalsDal.findByProjectId(
          projectId,
          include_inactive === 'true'
        );
      }

      res.json({
        success: true,
        data: goals,
        filters: {
          include_inactive: include_inactive === 'true',
          with_stats: with_stats === 'true',
          start_date: startDate?.toISOString() || null,
          end_date: endDate?.toISOString() || null
        }
      });
    } catch (error) {
      console.error('Error fetching goals:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch goals'
      });
    }
  }

  /**
   * Get a single goal by ID
   * GET /api/v1/projects/:id/goals/:goalId
   */
  async getGoalById(req: Request, res: Response): Promise<void> {
    try {
      const { id: projectId, goalId } = req.params;

      const goal = await goalsDal.findById(goalId);

      if (!goal) {
        res.status(404).json({
          success: false,
          error: 'GOAL_NOT_FOUND',
          message: 'Goal not found'
        });
        return;
      }

      // Verify goal belongs to project
      if (goal.project_id !== projectId) {
        res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Goal does not belong to this project'
        });
        return;
      }

      res.json({
        success: true,
        data: goal
      });
    } catch (error) {
      console.error('Error fetching goal:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch goal'
      });
    }
  }

  /**
   * Update a goal
   * PUT /api/v1/projects/:id/goals/:goalId
   */
  async updateGoal(req: Request, res: Response): Promise<void> {
    try {
      const { id: projectId, goalId } = req.params;
      const updates: UpdateGoalRequest = req.body;

      // Verify goal exists and belongs to project
      const existingGoal = await goalsDal.findById(goalId);
      if (!existingGoal) {
        res.status(404).json({
          success: false,
          error: 'GOAL_NOT_FOUND',
          message: 'Goal not found'
        });
        return;
      }

      if (existingGoal.project_id !== projectId) {
        res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Goal does not belong to this project'
        });
        return;
      }

      // Validate goal type changes
      const finalGoalType = updates.goal_type || existingGoal.goal_type;
      const finalEventName = updates.target_event_name !== undefined
        ? updates.target_event_name
        : existingGoal.target_event_name;
      const finalUrlPattern = updates.target_url_pattern !== undefined
        ? updates.target_url_pattern
        : existingGoal.target_url_pattern;
      const finalValue = updates.target_value !== undefined
        ? updates.target_value
        : existingGoal.target_value;

      if (finalGoalType === 'event' && !finalEventName) {
        res.status(400).json({
          success: false,
          error: 'INVALID_GOAL',
          message: 'target_event_name is required for event-type goals'
        });
        return;
      }

      if (finalGoalType === 'pageview' && !finalUrlPattern) {
        res.status(400).json({
          success: false,
          error: 'INVALID_GOAL',
          message: 'target_url_pattern is required for pageview-type goals'
        });
        return;
      }

      if (finalGoalType === 'value' && finalValue === null) {
        res.status(400).json({
          success: false,
          error: 'INVALID_GOAL',
          message: 'target_value is required for value-type goals'
        });
        return;
      }

      const updatedGoal = await goalsDal.update(goalId, updates);

      res.json({
        success: true,
        data: updatedGoal
      });
    } catch (error) {
      console.error('Error updating goal:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to update goal'
      });
    }
  }

  /**
   * Delete a goal
   * DELETE /api/v1/projects/:id/goals/:goalId
   */
  async deleteGoal(req: Request, res: Response): Promise<void> {
    try {
      const { id: projectId, goalId } = req.params;

      // Verify goal exists and belongs to project
      const goal = await goalsDal.findById(goalId);
      if (!goal) {
        res.status(404).json({
          success: false,
          error: 'GOAL_NOT_FOUND',
          message: 'Goal not found'
        });
        return;
      }

      if (goal.project_id !== projectId) {
        res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Goal does not belong to this project'
        });
        return;
      }

      await goalsDal.delete(goalId);

      res.json({
        success: true,
        message: 'Goal deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting goal:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to delete goal'
      });
    }
  }

  /**
   * Get goal completions
   * GET /api/v1/projects/:id/goals/completions
   */
  async getCompletions(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.id;
      const {
        goal_id,
        start_date,
        end_date,
        limit = 100,
        offset = 0
      } = req.query as QueryCompletionsParams;

      // Parse dates if provided
      const startDate = start_date ? new Date(start_date) : undefined;
      const endDate = end_date ? new Date(end_date) : undefined;

      // Validate date range
      if (startDate && endDate && startDate > endDate) {
        res.status(400).json({
          success: false,
          error: 'INVALID_DATE_RANGE',
          message: 'start_date must be before end_date'
        });
        return;
      }

      const [completions, totalCount] = await Promise.all([
        goalsDal.getCompletions(
          projectId,
          goal_id,
          startDate,
          endDate,
          Number(limit),
          Number(offset)
        ),
        goalsDal.countCompletions(
          projectId,
          goal_id,
          startDate,
          endDate
        )
      ]);

      res.json({
        success: true,
        data: completions,
        pagination: {
          total: totalCount,
          limit: Number(limit),
          offset: Number(offset),
          page: Math.floor(Number(offset) / Number(limit)) + 1,
          pages: Math.ceil(totalCount / Number(limit))
        },
        filters: {
          goal_id: goal_id || null,
          start_date: startDate?.toISOString() || null,
          end_date: endDate?.toISOString() || null
        }
      });
    } catch (error) {
      console.error('Error fetching goal completions:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch goal completions'
      });
    }
  }

  /**
   * Get conversion funnel data
   * POST /api/v1/projects/:id/goals/funnel
   */
  async getConversionFunnel(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.id;
      const { goal_ids, start_date, end_date } = req.body as FunnelRequest;

      if (!goal_ids || !Array.isArray(goal_ids) || goal_ids.length === 0) {
        res.status(400).json({
          success: false,
          error: 'INVALID_REQUEST',
          message: 'goal_ids array is required'
        });
        return;
      }

      // Parse dates if provided
      const startDate = start_date ? new Date(start_date) : undefined;
      const endDate = end_date ? new Date(end_date) : undefined;

      // Validate date range
      if (startDate && endDate && startDate > endDate) {
        res.status(400).json({
          success: false,
          error: 'INVALID_DATE_RANGE',
          message: 'start_date must be before end_date'
        });
        return;
      }

      const funnelData = await goalsDal.getConversionFunnel(
        projectId,
        goal_ids,
        startDate,
        endDate
      );

      res.json({
        success: true,
        data: {
          steps: funnelData,
          date_range: {
            start: startDate?.toISOString() || null,
            end: endDate?.toISOString() || null
          }
        }
      });
    } catch (error) {
      console.error('Error fetching conversion funnel:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch conversion funnel'
      });
    }
  }

  /**
   * Get conversion rate for a goal
   * GET /api/v1/projects/:id/goals/:goalId/conversion-rate
   */
  async getConversionRate(req: Request, res: Response): Promise<void> {
    try {
      const { id: projectId, goalId } = req.params;
      const { start_date, end_date } = req.query as {
        start_date?: string;
        end_date?: string;
      };

      // Verify goal exists and belongs to project
      const goal = await goalsDal.findById(goalId);
      if (!goal) {
        res.status(404).json({
          success: false,
          error: 'GOAL_NOT_FOUND',
          message: 'Goal not found'
        });
        return;
      }

      if (goal.project_id !== projectId) {
        res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Goal does not belong to this project'
        });
        return;
      }

      // Parse dates if provided
      const startDate = start_date ? new Date(start_date) : undefined;
      const endDate = end_date ? new Date(end_date) : undefined;

      // Validate date range
      if (startDate && endDate && startDate > endDate) {
        res.status(400).json({
          success: false,
          error: 'INVALID_DATE_RANGE',
          message: 'start_date must be before end_date'
        });
        return;
      }

      const conversionRate = await goalsDal.getConversionRate(
        goalId,
        startDate,
        endDate
      );

      res.json({
        success: true,
        data: {
          goal_id: goalId,
          conversion_rate: conversionRate,
          date_range: {
            start: startDate?.toISOString() || null,
            end: endDate?.toISOString() || null
          }
        }
      });
    } catch (error) {
      console.error('Error fetching conversion rate:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch conversion rate'
      });
    }
  }
}

export default new GoalsController();
