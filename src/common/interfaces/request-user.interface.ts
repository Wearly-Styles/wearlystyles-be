export interface RequestUser {
  id: number
  email: string
  role: string
  iat?: number
  exp?: number
}

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser
    }
  }
}
