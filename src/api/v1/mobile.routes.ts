import { Router } from "express"
import authRoutes from "@modules/auth/auth.route"
import userRoutes from "@modules/user/user.route"

const router = Router()

// Mobile-specific routes (can differ from web routes)
router.use("/auth", authRoutes)
router.use("/users", userRoutes)

export default router
