import type { CorsOptions } from "cors"

export const corsOptions: CorsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : "http://localhost:3000",
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
}
