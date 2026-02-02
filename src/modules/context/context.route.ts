/**
 * @swagger
 * /context/weather:
 *   get:
 *     tags:
 *       - Context
 *     summary: Get weather context
 *     description: Retrieve normalized weather context by coordinates
 *     parameters:
 *       - name: lat
 *         in: query
 *         required: true
 *         schema:
 *           type: number
 *       - name: lon
 *         in: query
 *         required: true
 *         schema:
 *           type: number
 *       - name: datetime
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Weather context retrieved
 *
 * /context/calendar:
 *   post:
 *     tags:
 *       - Context
 *     summary: Get calendar context
 *     description: Retrieve normalized calendar events for a time window
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               accessToken:
 *                 type: string
 *               timeMin:
 *                 type: string
 *                 format: date-time
 *               timeMax:
 *                 type: string
 *                 format: date-time
 *               maxResults:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Calendar context retrieved
 *
 * /context/closet:
 *   get:
 *     tags:
 *       - Context
 *     summary: Get closet context
 *     description: Retrieve normalized closet items for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Closet context retrieved
 */

import { Router } from "express"
import { ContextController } from "./context.controller"
import { validateRequest } from "@middleware/validation.middleware"
import { authMiddleware } from "@middleware/auth.middleware"
import { calendarSchema, weatherSchema } from "@validations/context.validator"

const router = Router()
const contextController = new ContextController()

router.get("/weather", validateRequest(weatherSchema), (req, res, next) =>
  contextController.getWeather(req, res, next),
)

router.post("/calendar", authMiddleware, validateRequest(calendarSchema), (req, res, next) =>
  contextController.getCalendar(req, res, next),
)

router.get("/closet", authMiddleware, (req, res, next) => contextController.getCloset(req, res, next))

export default router
