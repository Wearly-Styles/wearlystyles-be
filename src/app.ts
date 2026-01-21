import express, { type Application } from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import swaggerUi from "swagger-ui-express"
import { swaggerSpec } from "@config/swagger"
import { errorMiddleware } from "@middleware/error.middleware"
import { requestIdMiddleware } from "@middleware/request-id.middleware"
import { globalRateLimiter } from "@middleware/rate-limit.middleware"
import apiRoutes from "@api/index"
import logger from "@config/logger"
import config from "@config/env"

export const createApp = (): Application => {
  const app = express()

  // Security Middleware
  app.use(helmet())
  app.use(cors())

  // Body Parser Middleware
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // Logger Middleware
  app.use(morgan("combined", { stream: { write: (msg) => logger.http(msg) } }))

  // Request ID Middleware
  app.use(requestIdMiddleware)

  // Rate Limiting
  app.use(globalRateLimiter)

  app.use("/api-docs", swaggerUi.serve)
  app.get(
    "/api-docs",
    swaggerUi.setup(swaggerSpec, {
      swaggerOptions: {
        docExpansion: "list",
        filter: true,
        showRequestHeaders: true,
      },
    }),
  )

  // Health Check Route
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      app: config.app_name,
      timestamp: new Date().toISOString(),
    })
  })

  app.use("/api", apiRoutes)

  // 404 Handler
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      message: "Resource not found",
      statusCode: 404,
      timestamp: new Date().toISOString(),
    })
  })

  // Error Middleware
  app.use(errorMiddleware)

  return app
}
