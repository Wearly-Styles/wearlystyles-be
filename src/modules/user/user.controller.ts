import type { Request, Response, NextFunction } from "express"
import { UserService } from "./user.service"
import { SuccessResponse } from "@common/responses/success.response"
import { AppError } from "@common/errors/app-error"
import { MESSAGES } from "@common/constants/messages.constant"
import { ErrorCode } from "@common/enums/error-code.enum"
import type { CreateUserDTO, UpdateUserDTO } from "./user.dto"
import type { UserStatus } from "@common/enums/user-status.enum"

export class UserController {
  private userService = new UserService()
  private parseUserId(id: string): number {
    const parsed = Number.parseInt(id, 10)
    if (Number.isNaN(parsed)) {
      throw new AppError(MESSAGES.BAD_REQUEST, 400, ErrorCode.BAD_REQUEST)
    }
    return parsed
  }

  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const data: CreateUserDTO = req.body
      const result = await this.userService.createUser(data)

      res.status(201).json(new SuccessResponse(MESSAGES.USER_CREATED, result, 201))
    } catch (error) {
      next(error)
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = this.parseUserId(req.params.id)
      const result = await this.userService.getUserById(id)

      res.json(new SuccessResponse(MESSAGES.USER_RETRIEVED, result))
    } catch (error) {
      next(error)
    }
  }

  async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.userService.getAllUsers(req.query)

      res.json(new SuccessResponse(MESSAGES.USERS_RETRIEVED, result))
    } catch (error) {
      next(error)
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const id = this.parseUserId(req.params.id)
      const data: UpdateUserDTO = req.body
      const result = await this.userService.updateUser(id, data)

      res.json(new SuccessResponse(MESSAGES.USER_UPDATED, result))
    } catch (error) {
      next(error)
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const id = this.parseUserId(req.params.id)
      if (req.user?.id === id) {
        throw new AppError(MESSAGES.FORBIDDEN, 403, ErrorCode.FORBIDDEN)
      }
      const result = await this.userService.deleteUser(id)

      res.json(new SuccessResponse(MESSAGES.USER_DELETED, result))
    } catch (error) {
      next(error)
    }
  }

  async updateUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = this.parseUserId(req.params.id)
      if (req.user?.id === id) {
        throw new AppError(MESSAGES.FORBIDDEN, 403, ErrorCode.FORBIDDEN)
      }

      const { status } = req.body as { status: UserStatus }
      const result = await this.userService.updateUserStatus(id, status)
      res.json(new SuccessResponse(MESSAGES.USER_UPDATED, result))
    } catch (error) {
      next(error)
    }
  }
}
