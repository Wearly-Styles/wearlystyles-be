import { Router } from "express";
import authRoutes from "@modules/auth/auth.route";
import userRoutes from "@modules/user/user.route";
import clothingRoutes from "@modules/clothing/clothing.route";
import contextRoutes from "@modules/context/context.route";
import recommendationRoutes from "@modules/recommendation/recommendation.route";

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
export default router;
