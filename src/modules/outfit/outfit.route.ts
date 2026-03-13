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
 *   delete:
 *     tags:
 *       - Outfits
 *     summary: Delete an approved outfit
 *     description: Remove an approved outfit if it is not used in schedule or history
 *     security:
 *       - bearerAuth: []
 */

import { Router } from "express"
import { OutfitController } from "./outfit.controller"
import { authMiddleware } from "@middleware/auth.middleware"
import { validateRequest } from "@middleware/validation.middleware"
import { createOutfitSchema, updateOutfitSchema } from "@validations/outfit.validator"

const router = Router()
const outfitController = new OutfitController()

router.post("/", authMiddleware, validateRequest(createOutfitSchema), (req, res, next) =>
  outfitController.createOutfit(req, res, next),
)
router.get("/", authMiddleware, (req, res, next) =>
  outfitController.listOutfits(req, res, next),
)
router.get("/count", authMiddleware, (req, res, next) =>
  outfitController.countOutfits(req, res, next),
)
router.get("/:id", authMiddleware, (req, res, next) =>
  outfitController.getOutfitById(req, res, next),
)
router.patch("/:id", authMiddleware, validateRequest(updateOutfitSchema), (req, res, next) =>
  outfitController.updateOutfit(req, res, next),
)
router.delete("/:id", authMiddleware, (req, res, next) =>
  outfitController.deleteOutfit(req, res, next),
)

export default router
