/**
 * @swagger
 * /outfits:
 *   post:
 *     tags:
 *       - Outfits
 *     summary: Create an outfit
 *     description: Create an outfit from selected clothing items (user-approved)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               occasion:
 *                 type: string
 *               weather:
 *                 type: string
 *               isFavorite:
 *                 type: boolean
 *               items:
 *                 type: array
 *                 items:
 *                   type: integer
 */

import { Router } from "express"
import { OutfitController } from "./outfit.controller"
import { authMiddleware } from "@middleware/auth.middleware"
import { validateRequest } from "@middleware/validation.middleware"
import { createOutfitSchema } from "@validations/outfit.validator"

const router = Router()
const outfitController = new OutfitController()

router.post("/", authMiddleware, validateRequest(createOutfitSchema), (req, res, next) =>
  outfitController.createOutfit(req, res, next),
)

export default router
