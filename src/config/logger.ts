import winston from "winston"
import config from "./env"

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
}

const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
}

winston.addColors(colors)

const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`),
)

const transports = [
  // Console transports
  new winston.transports.Console(),
  // File transports
  new winston.transports.File({
    filename: "logs/error.log",
    level: "error",
  }),
  new winston.transports.File({ filename: "logs/app.log" }),
]

const logger = winston.createLogger({
  level: config.log.level,
  levels,
  format,
  transports,
})

export default logger
