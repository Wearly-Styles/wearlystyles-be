import type { Request, Response, NextFunction } from "express"
import { generateUUID } from "@utils/uuid.util"

export const requestIdMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  const requestId = req.headers["x-request-id"] || generateUUID()
  req.id = requestId as string
  next()
}

declare global {
  namespace Express {
    interface Request {
      id?: string
    }
  }
}
