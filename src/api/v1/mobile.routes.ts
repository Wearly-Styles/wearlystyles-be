import { Router } from "express";
import authRoutes from "@modules/auth/auth.route";
import userRoutes from "@modules/user/user.route";
import clothingRoutes from "@modules/clothing/clothing.route";
import profileRoutes from "@modules/profile/profile.route";

const router = Router();

// Mount routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/clothing", clothingRoutes);
router.use("/profile", profileRoutes);

export default router;
