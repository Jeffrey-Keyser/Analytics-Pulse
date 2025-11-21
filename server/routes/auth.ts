import { Router, Request, Response } from "express";
const { requireAuth } = require('@jeffrey-keyser/pay-auth-integration/server');

const router = Router();

/**
 * @openapi
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current authenticated user\'s details
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     description: Retrieves the profile information of the currently logged-in user. Uses pay-auth-integration middleware.
 *     responses:
 *       200:
 *         description: Successfully retrieved user details.
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
 *                 id:
 *                   type: string
 *                   format: uuid
 *                   example: "123e4567-e89b-12d3-a456-426614174000"
 *                 email:
 *                   type: string
 *                   format: email
 *                   example: "user@example.com"
 *                 role:
 *                   type: string
 *                   example: "user"
 *                 roles:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["user"]
 *                 permissions:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["read:profile"]
 *       401:
 *         description: Unauthorized - JWT is missing or invalid.
 *       500:
 *         description: Internal server error.
 */
router.get("/me", requireAuth, (req: Request, res: Response) => {
  // User is populated by payAuthMiddleware
  res.json(req.user);
});

export default router; 