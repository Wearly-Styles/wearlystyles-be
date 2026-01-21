import type { ApiResponse } from "../interfaces/api-response.interface"

export class ErrorResponse implements ApiResponse {
  success = false
  statusCode: number
  message: string
  error: string
  timestamp: string

  constructor(message: string, error: string, statusCode = 400) {
    this.message = message
    this.error = error
    this.statusCode = statusCode
    this.timestamp = new Date().toISOString()
  }
}
