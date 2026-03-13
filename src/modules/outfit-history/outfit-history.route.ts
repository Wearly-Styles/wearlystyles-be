import { Router } from "express"
import { authMiddleware } from "@middleware/auth.middleware"
import { validateRequest } from "@middleware/validation.middleware"
import {
  createOutfitHistorySchema,
  listOutfitHistoriesSchema,
} from "@validations/outfit-history.validator"
import { OutfitHistoryController } from "./outfit-history.controller"

const router = Router()
const outfitHistoryController = new OutfitHistoryController()

router.post(
  "/wear-today",
  authMiddleware,
  validateRequest(createOutfitHistorySchema),
  (req, res, next) => outfitHistoryController.wearToday(req, res, next),
)

router.get(
  "/",
  authMiddleware,
  validateRequest(listOutfitHistoriesSchema),
  (req, res, next) => outfitHistoryController.listHistories(req, res, next),
)

export default router
