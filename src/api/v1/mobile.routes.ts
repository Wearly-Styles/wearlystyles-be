import { Router } from "express";
import authRoutes from "@modules/auth/auth.route";
import userRoutes from "@modules/user/user.route";
import clothingRoutes from "@modules/clothing/clothing.route";
import contextRoutes from "@modules/context/context.route";
import recommendationRoutes from "@modules/recommendation/recommendation.route";
import outfitPlanRoutes from "@modules/outfit-plan/outfit-plan.route";
import outfitRoutes from "@modules/outfit/outfit.route";
import outfitHistoryRoutes from "@modules/outfit-history/outfit-history.route";
import profileRoutes from "@modules/profile/profile.route";
import postRoutes from "@modules/post/post.route";

const router = Router();

// Mount routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/clothing", clothingRoutes);
router.use("/context", contextRoutes);
router.use("/recommendations", recommendationRoutes);
router.use("/outfit-plans", outfitPlanRoutes);
router.use("/outfits", outfitRoutes);
router.use("/outfit-histories", outfitHistoryRoutes);
router.use("/profile", profileRoutes);
router.use("/posts", postRoutes);
export default router;
