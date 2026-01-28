import { Router } from "express"
import authRoutes from "@modules/auth/auth.route"
import userRoutes from "@modules/user/user.route"
import closetRoutes from "@modules/closet/closet.route"

const router = Router()

// Mobile-specific routes (can differ from web routes)
router.use("/auth", authRoutes)
router.use("/users", userRoutes)
router.use("/closet", closetRoutes)
export default router
