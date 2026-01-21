import type { ApiResponse } from "../interfaces/api-response.interface"

export class SuccessResponse<T> implements ApiResponse<T> {
  success = true
  statusCode: number
  message: string
  data?: T
  timestamp: string

  constructor(message: string, data?: T, statusCode = 200) {
    this.message = message
    this.data = data
    this.statusCode = statusCode
    this.timestamp = new Date().toISOString()
  }
}
