import jwt, { type SignOptions, type Secret } from "jsonwebtoken"
import jwtConfig from "@config/jwt"
import type { RequestUser } from "@common/interfaces/request-user.interface"

export const generateToken = (payload: Partial<RequestUser>): string => {
  const options: SignOptions = { expiresIn: jwtConfig.expiresIn as SignOptions["expiresIn"] }
  return jwt.sign(payload, jwtConfig.secret as Secret, options)
}

export const generateRefreshToken = (payload: Partial<RequestUser>): string => {
  const options: SignOptions = { expiresIn: jwtConfig.refreshExpiresIn as SignOptions["expiresIn"] }
  return jwt.sign(payload, jwtConfig.refreshSecret as Secret, options)
}

export const verifyToken = (token: string): RequestUser | null => {
  try {
    return jwt.verify(token, jwtConfig.secret) as RequestUser
  } catch {
    return null
  }
}

export const verifyRefreshToken = (token: string): RequestUser | null => {
  try {
    return jwt.verify(token, jwtConfig.refreshSecret) as RequestUser
  } catch {
    return null
  }
}

export const decodeToken = (token: string): RequestUser | null => {
  try {
    return jwt.decode(token) as RequestUser
  } catch {
    return null
  }
}
