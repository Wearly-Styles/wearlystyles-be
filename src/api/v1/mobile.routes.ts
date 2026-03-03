import { Router } from "express";
import authRoutes from "@modules/auth/auth.route";
import userRoutes from "@modules/user/user.route";
import clothingRoutes from "@modules/clothing/clothing.route";
import contextRoutes from "@modules/context/context.route";
import recommendationRoutes from "@modules/recommendation/recommendation.route";
import outfitPlanRoutes from "@modules/outfit-plan/outfit-plan.route";
import outfitRoutes from "@modules/outfit/outfit.route";
import profileRoutes from "@modules/profile/profile.route";

const router = Router();

router.post("/auth/register", (_req, res) => {
  res.status(404).json({
    success: false,
    message: "Resource not found",
    statusCode: 404,
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/clothing", clothingRoutes);
router.use("/context", contextRoutes);
router.use("/recommendations", recommendationRoutes);
router.use("/outfit-plans", outfitPlanRoutes);
router.use("/outfits", outfitRoutes);
router.use("/profile", profileRoutes);
export default router;
