import { Router } from "express";
import authRoutes from "@modules/auth/auth.route";
import userRoutes from "@modules/user/user.route";
import clothingRoutes from "@modules/clothing/clothing.route";
import dashboardRoutes from "@modules/dashboard/dashboard.route"
import { authMiddleware } from "@middleware/auth.middleware"
import { roleMiddleware } from "@middleware/role.middleware"
import { ROLES } from "@common/constants/roles.constant"

const router = Router();

router.use("/auth", authRoutes);
// Admin-only surface for web dashboard
router.use("/users", authMiddleware, roleMiddleware([ROLES.ADMIN]), userRoutes);
router.use("/clothing", clothingRoutes);
router.use("/dashboard", dashboardRoutes)

export default router;
