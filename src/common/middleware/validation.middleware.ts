import type { Request, Response, NextFunction } from "express"
import { ValidationError } from "@common/errors/validation-error"
import { MESSAGES } from "@common/constants/messages.constant"

export const validateRequest = (schema: any) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      })
      next()
    } catch (error: any) {
      const validationError = new ValidationError(MESSAGES.VALIDATION_ERROR)
      validationError.details = error.errors || []
      next(validationError)
    }
  }
}
