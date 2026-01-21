import { Router } from "express"
import authRoutes from "@modules/auth/auth.route"
import userRoutes from "@modules/user/user.route"

const router = Router()

router.post("/auth/register", (_req, res) => {
  res.status(404).json({
    success: false,
    message: "Resource not found",
    statusCode: 404,
    timestamp: new Date().toISOString(),
  })
})

// Mount routes
router.use("/auth", authRoutes)
router.use("/users", userRoutes)

export default router
