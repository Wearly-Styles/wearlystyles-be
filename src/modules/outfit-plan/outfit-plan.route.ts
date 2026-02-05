/**
 * @swagger
 * /outfit-plans:
 *   post:
 *     tags:
 *       - Outfit Plans
 *     summary: Create outfit plans
 *     description: Schedule one or many outfit plans for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     outfitId:
 *                       type: integer
 *                     planDate:
 *                       type: string
 *                       format: date-time
 *                     planType:
 *                       type: string
 *                     reminderSent:
 *                       type: boolean
 *   get:
 *     tags:
 *       - Outfit Plans
 *     summary: List outfit plans
 *     description: Retrieve scheduled outfits for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: from
 *         in: query
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: to
 *         in: query
 *         schema:
 *           type: string
 *           format: date-time
 *
 * /outfit-plans/{id}:
 *   patch:
 *     tags:
 *       - Outfit Plans
 *     summary: Update an outfit plan
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *   delete:
 *     tags:
 *       - Outfit Plans
 *     summary: Delete an outfit plan
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 */

import { Router } from "express"
import { OutfitPlanController } from "./outfit-plan.controller"
import { authMiddleware } from "@middleware/auth.middleware"
import { validateRequest } from "@middleware/validation.middleware"
import {
  createOutfitPlansSchema,
  listOutfitPlansSchema,
  updateOutfitPlanSchema,
} from "@validations/outfit-plan.validator"

const router = Router()
const outfitPlanController = new OutfitPlanController()

router.post("/", authMiddleware, validateRequest(createOutfitPlansSchema), (req, res, next) =>
  outfitPlanController.createPlans(req, res, next),
)

router.get("/", authMiddleware, validateRequest(listOutfitPlansSchema), (req, res, next) =>
  outfitPlanController.listPlans(req, res, next),
)

router.patch("/:id", authMiddleware, validateRequest(updateOutfitPlanSchema), (req, res, next) =>
  outfitPlanController.updatePlan(req, res, next),
)

router.delete("/:id", authMiddleware, (req, res, next) => outfitPlanController.deletePlan(req, res, next))

export default router
