import { Router } from 'express';
import emailPreferencesController from '../controllers/emailPreferences';

const router = Router({ mergeParams: true });

/**
 * @openapi
 * /api/v1/projects/{projectId}/email-preferences:
 *   get:
 *     summary: Get email notification preferences
 *     description: Retrieve email reporting preferences for the current user and project
 *     tags:
 *       - Email Reporting
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Email preferences retrieved successfully
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
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     projectId:
 *                       type: string
 *                       format: uuid
 *                     userEmail:
 *                       type: string
 *                       format: email
 *                     dailyReportEnabled:
 *                       type: boolean
 *                     weeklyReportEnabled:
 *                       type: boolean
 *                     monthlyReportEnabled:
 *                       type: boolean
 *                     dailyReportTime:
 *                       type: string
 *                       example: "09:00:00"
 *                     weeklyReportDay:
 *                       type: integer
 *                       example: 1
 *                       description: Day of week (0=Sunday, 1=Monday)
 *                     weeklyReportTime:
 *                       type: string
 *                       example: "09:00:00"
 *                     monthlyReportDay:
 *                       type: integer
 *                       example: 1
 *                       description: Day of month (1-28)
 *                     monthlyReportTime:
 *                       type: string
 *                       example: "09:00:00"
 *                     timezone:
 *                       type: string
 *                       example: "UTC"
 *                     isActive:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 */
router.get('/', emailPreferencesController.getPreferences.bind(emailPreferencesController));

/**
 * @openapi
 * /api/v1/projects/{projectId}/email-preferences:
 *   put:
 *     summary: Create or update email preferences
 *     description: Set email reporting preferences for the current user and project
 *     tags:
 *       - Email Reporting
 *     parameters:
 *       - in: path
 *         name: projectId
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
 *             properties:
 *               dailyReportEnabled:
 *                 type: boolean
 *                 example: true
 *               weeklyReportEnabled:
 *                 type: boolean
 *                 example: false
 *               monthlyReportEnabled:
 *                 type: boolean
 *                 example: false
 *               dailyReportTime:
 *                 type: string
 *                 example: "09:00:00"
 *               weeklyReportDay:
 *                 type: integer
 *                 example: 1
 *               weeklyReportTime:
 *                 type: string
 *                 example: "09:00:00"
 *               monthlyReportDay:
 *                 type: integer
 *                 example: 1
 *               monthlyReportTime:
 *                 type: string
 *                 example: "09:00:00"
 *               timezone:
 *                 type: string
 *                 example: "America/New_York"
 *     responses:
 *       200:
 *         description: Email preferences saved successfully
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 */
router.put('/', emailPreferencesController.upsertPreferences.bind(emailPreferencesController));

/**
 * @openapi
 * /api/v1/projects/{projectId}/email-preferences/reports:
 *   get:
 *     summary: Get email report history
 *     description: Retrieve history of sent email reports for the current user and project
 *     tags:
 *       - Email Reporting
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of reports to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of reports to skip
 *     responses:
 *       200:
 *         description: Report history retrieved successfully
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
 *                     reports:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           reportType:
 *                             type: string
 *                             enum: [daily, weekly, monthly, test]
 *                           status:
 *                             type: string
 *                             enum: [pending, sent, failed, bounced]
 *                           reportStartDate:
 *                             type: string
 *                             format: date
 *                           reportEndDate:
 *                             type: string
 *                             format: date
 *                           sentAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 */
router.get('/reports', emailPreferencesController.getReportHistory.bind(emailPreferencesController));

/**
 * @openapi
 * /api/v1/projects/{projectId}/email-preferences/test:
 *   post:
 *     summary: Send a test email report
 *     description: Send a test analytics report email to the current user
 *     tags:
 *       - Email Reporting
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Test report sent successfully
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
 *                   example: "Test report sent successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     reportId:
 *                       type: string
 *                       format: uuid
 *                     messageId:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 *       500:
 *         description: Failed to send test report
 */
router.post('/test', emailPreferencesController.sendTestReport.bind(emailPreferencesController));

/**
 * @openapi
 * /api/v1/unsubscribe:
 *   get:
 *     summary: Unsubscribe from email reports
 *     description: Unsubscribe from all email reports using the unsubscribe token
 *     tags:
 *       - Email Reporting
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Unsubscribe token from email
 *     responses:
 *       200:
 *         description: Successfully unsubscribed
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
 *                   example: "Successfully unsubscribed from email reports"
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                       format: email
 *                     projectId:
 *                       type: string
 *                       format: uuid
 *       400:
 *         description: Missing unsubscribe token
 *       404:
 *         description: Invalid unsubscribe token
 */
// Unsubscribe route (at root level, not project-specific)
export const unsubscribeRouter = Router();
unsubscribeRouter.get('/', emailPreferencesController.unsubscribe.bind(emailPreferencesController));

export default router;
