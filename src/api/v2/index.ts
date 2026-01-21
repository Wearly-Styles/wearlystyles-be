import { Router } from "express"
import webRoutes from "./web.routes"

const router = Router()

router.use("/web", webRoutes)

export default router
