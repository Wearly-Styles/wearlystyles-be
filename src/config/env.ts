import dotenv from "dotenv"

dotenv.config()

interface IConfig {
  node_env: string
  port: number
  app_name: string
  database_url: string
  database: {
    host: string
    port: number
    username: string
    password: string
    database: string
    synchronize: boolean
    logging: boolean
  }
  jwt: {
    secret: string
    expiresIn: string
    refreshSecret: string
    refreshExpiresIn: string
  }
  log: {
    level: string
  }
  email: {
    smtpHost: string
    smtpPort: number
    user: string
    pass: string
    fromEmail: string
  }
  redis: {
    url: string
  }
  swagger: {
    enabled: boolean
    apiVersion: string
  }
}

const config: IConfig = {
  node_env: process.env.NODE_ENV || "development",
  port: Number.parseInt(process.env.PORT || "3000", 10),
  app_name: process.env.APP_NAME || "wearly-styles-be",
  database_url: process.env.DATABASE_URL || "",

  database: {
    host: process.env.DB_HOST || "localhost",
    port: Number.parseInt(process.env.DB_PORT || "5432", 10),
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "password",
    database: process.env.DB_NAME || "wearly_styles",
    synchronize: process.env.DB_SYNC === "true",
    logging: process.env.DB_LOGGING === "true",
  },

  jwt: {
    secret: process.env.JWT_SECRET || "default-secret-key",
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "default-refresh-secret",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },

  log: {
    level: process.env.LOG_LEVEL || "info",
  },

  email: {
    smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",
    smtpPort: Number.parseInt(process.env.SMTP_PORT || "587", 10),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    fromEmail: process.env.FROM_EMAIL || "noreply@wearlystyles.com",
  },

  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },

  swagger: {
    enabled: process.env.SWAGGER_ENABLED === "true",
    apiVersion: process.env.API_VERSION || "v1",
  },
}

export default config
