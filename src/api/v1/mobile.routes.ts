import { Router } from "express";
import authRoutes from "@modules/auth/auth.route";
import userRoutes from "@modules/user/user.route";
import clothingRoutes from "@modules/clothing/clothing.route";

const router = Router();

// Mount routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/clothing", clothingRoutes);

export default router;
