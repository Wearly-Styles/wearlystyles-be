export interface RegisterDTO {
  email: string
  password: string
  fullName?: string
}

export interface LoginDTO {
  email: string
  password: string
}

export interface RefreshTokenDTO {
  refreshToken: string
}

export interface VerifyEmailDTO {
  email: string
  token: string
}

export interface ResetPasswordDTO {
  email: string
  newPassword: string
  token: string
}
