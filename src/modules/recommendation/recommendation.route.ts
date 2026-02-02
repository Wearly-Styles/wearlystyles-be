/**
 * @swagger
 * /recommendations/by-context:
 *   post:
 *     tags:
 *       - Recommendations
 *     summary: Generate outfit recommendations by context
 *     description: Generate outfit recommendations based on weather, calendar, and closet context
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               weather:
 *                 type: object
 *               calendar:
 *                 type: array
 *                 items:
 *                   type: object
 *               closet:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Recommendation generated
 *
 * /recommendations/by-selection:
 *   post:
 *     tags:
 *       - Recommendations
 *     summary: Generate outfit recommendations by selection
 *     description: Generate outfit recommendations based on selected event type and style
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               selectedEventType:
 *                 type: string
 *               selectedStyle:
 *                 type: string
 *               closet:
 *                 type: array
 *                 items:
 *                   type: object
 *               weather:
 *                 type: object
 *               calendar:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Recommendation generated
 */

import { Router } from "express"
import { RecommendationController } from "./recommendation.controller"
import { authMiddleware } from "@middleware/auth.middleware"
import { validateRequest } from "@middleware/validation.middleware"
import { recommendationByContextSchema, recommendationBySelectionSchema } from "@validations/recommendation.validator"

const router = Router()
const recommendationController = new RecommendationController()

router.post("/by-context", authMiddleware, validateRequest(recommendationByContextSchema), (req, res, next) =>
  recommendationController.recommendByContext(req, res, next),
)

router.post("/by-selection", authMiddleware, validateRequest(recommendationBySelectionSchema), (req, res, next) =>
  recommendationController.recommendBySelection(req, res, next),
)

export default router
