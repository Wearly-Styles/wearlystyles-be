/**
 * @swagger
 * /dashboard/metrics:
 *   get:
 *     tags:
 *       - Dashboard
 *     summary: Get dashboard metrics
 *     description: Retrieve dashboard cards + chart series (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: days
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 90
 *         description: Number of days (including today) for chart series
 *     responses:
 *       200:
 *         description: Dashboard updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */

import { Router } from "express"
import { DashboardController } from "./dashboard.controller"
import { authMiddleware } from "@middleware/auth.middleware"
import { roleMiddleware } from "@middleware/role.middleware"
import { ROLES } from "@common/constants/roles.constant"
import { validateRequest } from "@middleware/validation.middleware"
import { dashboardMetricsSchema } from "@validations/dashboard.validator"

const router = Router()
const dashboardController = new DashboardController()

router.get(
  "/metrics",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN]),
  validateRequest(dashboardMetricsSchema),
  (req, res, next) => dashboardController.getMetrics(req, res, next),
)

export default router

