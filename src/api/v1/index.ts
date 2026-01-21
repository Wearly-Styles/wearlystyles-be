import { Router } from "express"
import webRoutes from "./web.routes"
import mobileRoutes from "./mobile.routes"

const router = Router()

router.use("/web", webRoutes)
router.use("/mobile", mobileRoutes)

export default router
