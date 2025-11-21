import express, { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import projectsController from '../controllers/projects';
const { requireAuth } = require('@jeffrey-keyser/pay-auth-integration/server');

const router = express.Router();

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req: Request, res: Response, next: Function) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Invalid request parameters',
      details: errors.array()
    });
  }
  next();
};

/**
 * @swagger
 * components:
 *   schemas:
 *     Project:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the project
 *         name:
 *           type: string
 *           description: Project name
 *         domain:
 *           type: string
 *           description: Primary domain of the project
 *         description:
 *           type: string
 *           nullable: true
 *           description: Optional project description
 *         is_active:
 *           type: boolean
 *           description: Whether the project is active
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Project creation timestamp
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *     CreateProjectRequest:
 *       type: object
 *       required:
 *         - name
 *         - domain
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *           description: Project name
 *         domain:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *           description: Primary domain
 *         description:
 *           type: string
 *           description: Optional project description
 *     UpdateProjectRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *           description: Project name
 *         domain:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *           description: Primary domain
 *         description:
 *           type: string
 *           description: Project description
 *         is_active:
 *           type: boolean
 *           description: Whether the project is active
 *     ProjectListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Project'
 *         pagination:
 *           type: object
 *           properties:
 *             total:
 *               type: number
 *             limit:
 *               type: number
 *             offset:
 *               type: number
 *             page:
 *               type: number
 *             pages:
 *               type: number
 */

/**
 * @swagger
 * /api/v1/projects:
 *   get:
 *     summary: List all projects
 *     description: Retrieves a paginated list of projects with optional filtering
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of projects per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of projects to skip
 *       - in: query
 *         name: domain
 *         schema:
 *           type: string
 *         description: Filter by domain (partial match)
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter by name (partial match)
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of projects
 *         headers:
 *           API-Version:
 *             description: The API version used for this response
 *             schema:
 *               type: string
 *               example: "1"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProjectListResponse'
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  '/',
  requireAuth,
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
    query('domain').optional().isString().trim(),
    query('name').optional().isString().trim(),
    query('is_active').optional().isBoolean()
  ],
  handleValidationErrors,
  (req: Request, res: Response) => projectsController.list(req, res)
);

/**
 * @swagger
 * /api/v1/projects/{id}:
 *   get:
 *     summary: Get project by ID
 *     description: Retrieves a single project by its unique identifier
 *     tags: [Projects]
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
 *     responses:
 *       200:
 *         description: Project details
 *         headers:
 *           API-Version:
 *             description: The API version used for this response
 *             schema:
 *               type: string
 *               example: "1"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 *       400:
 *         description: Invalid project ID format
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 *       500:
 *         description: Internal server error
 */
router.get(
  '/:id',
  requireAuth,
  [
    param('id').isUUID().withMessage('Invalid project ID format')
  ],
  handleValidationErrors,
  (req: Request, res: Response) => projectsController.getById(req, res)
);

/**
 * @swagger
 * /api/v1/projects:
 *   post:
 *     summary: Create a new project
 *     description: Creates a new analytics project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProjectRequest'
 *     responses:
 *       201:
 *         description: Project created successfully
 *         headers:
 *           API-Version:
 *             description: The API version used for this response
 *             schema:
 *               type: string
 *               example: "1"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Project with this domain already exists
 *       500:
 *         description: Internal server error
 */
router.post(
  '/',
  requireAuth,
  [
    body('name')
      .notEmpty().withMessage('Name is required')
      .isString().withMessage('Name must be a string')
      .trim()
      .isLength({ min: 1, max: 255 }).withMessage('Name must be between 1 and 255 characters'),
    body('domain')
      .notEmpty().withMessage('Domain is required')
      .isString().withMessage('Domain must be a string')
      .trim()
      .isLength({ min: 1, max: 255 }).withMessage('Domain must be between 1 and 255 characters'),
    body('description')
      .optional()
      .isString().withMessage('Description must be a string')
      .trim()
  ],
  handleValidationErrors,
  (req: Request, res: Response) => projectsController.create(req, res)
);

/**
 * @swagger
 * /api/v1/projects/{id}:
 *   put:
 *     summary: Update a project
 *     description: Updates an existing project's details
 *     tags: [Projects]
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
 *             $ref: '#/components/schemas/UpdateProjectRequest'
 *     responses:
 *       200:
 *         description: Project updated successfully
 *         headers:
 *           API-Version:
 *             description: The API version used for this response
 *             schema:
 *               type: string
 *               example: "1"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 *       409:
 *         description: Project with this domain already exists
 *       500:
 *         description: Internal server error
 */
router.put(
  '/:id',
  requireAuth,
  [
    param('id').isUUID().withMessage('Invalid project ID format'),
    body('name')
      .optional()
      .isString().withMessage('Name must be a string')
      .trim()
      .isLength({ min: 1, max: 255 }).withMessage('Name must be between 1 and 255 characters'),
    body('domain')
      .optional()
      .isString().withMessage('Domain must be a string')
      .trim()
      .isLength({ min: 1, max: 255 }).withMessage('Domain must be between 1 and 255 characters'),
    body('description')
      .optional()
      .isString().withMessage('Description must be a string')
      .trim(),
    body('is_active')
      .optional()
      .isBoolean().withMessage('is_active must be a boolean')
  ],
  handleValidationErrors,
  (req: Request, res: Response) => projectsController.update(req, res)
);

/**
 * @swagger
 * /api/v1/projects/{id}:
 *   delete:
 *     summary: Delete a project
 *     description: Deletes a project and all associated events (cascades)
 *     tags: [Projects]
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
 *     responses:
 *       200:
 *         description: Project deleted successfully
 *         headers:
 *           API-Version:
 *             description: The API version used for this response
 *             schema:
 *               type: string
 *               example: "1"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid project ID format
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 *       500:
 *         description: Internal server error
 */
router.delete(
  '/:id',
  requireAuth,
  [
    param('id').isUUID().withMessage('Invalid project ID format')
  ],
  handleValidationErrors,
  (req: Request, res: Response) => projectsController.delete(req, res)
);

export default router;
