import { Router } from 'express';
import apiKeysController from '../controllers/apiKeys';

const router = Router({ mergeParams: true }); // Enable access to parent route params

/**
 * @openapi
 * /api/v1/projects/{projectId}/api-keys:
 *   get:
 *     summary: List all API keys for a project
 *     description: |
 *       Returns a list of all API keys associated with the specified project.
 *       Full keys are never returned - only metadata and key prefixes are shown.
 *     tags:
 *       - API Keys
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The project UUID
 *     responses:
 *       200:
 *         description: List of API keys retrieved successfully
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
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                         example: "123e4567-e89b-12d3-a456-426614174000"
 *                       prefix:
 *                         type: string
 *                         example: "ap_abc12"
 *                         description: First 8 characters of the key for display
 *                       name:
 *                         type: string
 *                         nullable: true
 *                         example: "Production Key"
 *                       description:
 *                         type: string
 *                         nullable: true
 *                         example: "API key for production website"
 *                       is_active:
 *                         type: boolean
 *                         example: true
 *                       last_used_at:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                         example: "2025-11-21T10:30:00Z"
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-11-20T14:22:00Z"
 *       400:
 *         description: Invalid request parameters
 *       404:
 *         description: Project not found
 *       500:
 *         description: Internal server error
 */
router.get('/', apiKeysController.listApiKeys.bind(apiKeysController));

/**
 * @openapi
 * /api/v1/projects/{projectId}/api-keys:
 *   post:
 *     summary: Generate a new API key for a project
 *     description: |
 *       Creates a new API key for the specified project.
 *       **IMPORTANT**: The full API key is returned ONLY in this response and will never be shown again.
 *       Make sure to save it securely before closing this response.
 *     tags:
 *       - API Keys
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The project UUID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *                 example: "Production Key"
 *                 description: Optional human-readable name for the key
 *               description:
 *                 type: string
 *                 example: "API key for production website"
 *                 description: Optional description of where/how the key is used
 *     responses:
 *       201:
 *         description: API key created successfully
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
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: "123e4567-e89b-12d3-a456-426614174000"
 *                     key:
 *                       type: string
 *                       example: "ap_abc123def456ghi789jkl012mno"
 *                       description: "FULL API KEY - Save this securely! It will never be shown again."
 *                     prefix:
 *                       type: string
 *                       example: "ap_abc12"
 *                     name:
 *                       type: string
 *                       nullable: true
 *                       example: "Production Key"
 *                     description:
 *                       type: string
 *                       nullable: true
 *                       example: "API key for production website"
 *                     message:
 *                       type: string
 *                       example: "API key created successfully. Save this key securely - it will not be shown again."
 *       400:
 *         description: Invalid request parameters
 *       404:
 *         description: Project not found
 *       500:
 *         description: Internal server error
 */
router.post('/', apiKeysController.generateApiKey.bind(apiKeysController));

/**
 * @openapi
 * /api/v1/projects/{projectId}/api-keys/{keyId}:
 *   delete:
 *     summary: Revoke an API key
 *     description: |
 *       Permanently deletes an API key. This action cannot be undone.
 *       **Note**: You cannot revoke the last active API key for a project.
 *       Create a new key before revoking the last one.
 *     tags:
 *       - API Keys
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The project UUID
 *       - in: path
 *         name: keyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The API key UUID
 *     responses:
 *       200:
 *         description: API key revoked successfully
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "API key revoked successfully"
 *       400:
 *         description: Invalid request parameters
 *       404:
 *         description: API key not found
 *       409:
 *         description: Cannot revoke last active API key
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Cannot revoke the last active API key"
 *       500:
 *         description: Internal server error
 */
router.delete('/:keyId', apiKeysController.revokeApiKey.bind(apiKeysController));

export default router;
