import { Request, Response } from 'express';
import projectsDal, { CreateProjectParams, UpdateProjectParams, ListProjectsParams } from '../dal/projects';

/**
 * ProjectsController handles business logic for project CRUD operations
 */
export class ProjectsController {
  /**
   * List all projects with pagination and filtering
   */
  async list(req: Request, res: Response): Promise<void> {
    try {
      const params: ListProjectsParams = {
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
        domain: req.query.domain as string | undefined,
        name: req.query.name as string | undefined,
        is_active: req.query.is_active !== undefined
          ? req.query.is_active === 'true'
          : undefined
      };

      const result = await projectsDal.list(params);

      res.status(200).json({
        success: true,
        data: result.projects,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          page: Math.floor(result.offset / result.limit) + 1,
          pages: Math.ceil(result.total / result.limit)
        }
      });
    } catch (error) {
      console.error('Error listing projects:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to list projects'
      });
    }
  }

  /**
   * Get a single project by ID
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const project = await projectsDal.findById(id);

      if (!project) {
        res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Project not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: project
      });
    } catch (error) {
      console.error('Error getting project:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve project'
      });
    }
  }

  /**
   * Create a new project
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const params: CreateProjectParams = {
        name: req.body.name,
        domain: req.body.domain,
        description: req.body.description
      };

      // Check if domain already exists
      const existingProject = await projectsDal.findByDomain(params.domain);
      if (existingProject) {
        res.status(409).json({
          success: false,
          error: 'CONFLICT',
          message: 'A project with this domain already exists'
        });
        return;
      }

      const project = await projectsDal.create(params);

      res.status(201).json({
        success: true,
        data: project,
        message: 'Project created successfully'
      });
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to create project'
      });
    }
  }

  /**
   * Update an existing project
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Check if project exists
      const existingProject = await projectsDal.findById(id);
      if (!existingProject) {
        res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Project not found'
        });
        return;
      }

      // Check if domain is being changed to one that already exists
      if (req.body.domain && req.body.domain !== existingProject.domain) {
        const domainConflict = await projectsDal.findByDomain(req.body.domain);
        if (domainConflict) {
          res.status(409).json({
            success: false,
            error: 'CONFLICT',
            message: 'A project with this domain already exists'
          });
          return;
        }
      }

      const params: UpdateProjectParams = {
        name: req.body.name,
        domain: req.body.domain,
        description: req.body.description,
        is_active: req.body.is_active
      };

      const project = await projectsDal.update(id, params);

      res.status(200).json({
        success: true,
        data: project,
        message: 'Project updated successfully'
      });
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to update project'
      });
    }
  }

  /**
   * Delete a project (cascades to events)
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Check if project exists
      const existingProject = await projectsDal.findById(id);
      if (!existingProject) {
        res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Project not found'
        });
        return;
      }

      const deleted = await projectsDal.delete(id);

      if (deleted) {
        res.status(200).json({
          success: true,
          message: 'Project deleted successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'INTERNAL_ERROR',
          message: 'Failed to delete project'
        });
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to delete project'
      });
    }
  }
}

export default new ProjectsController();
