export interface RegisterDTO {
  email: string
  password: string
  fullName?: string
}

export interface GoogleAuthDTO {
  authCode: string
}
export interface LoginDTO {
  email: string
  password: string
}

export interface GoogleLoginDTO {
  idToken: string
}

export interface GoogleCodeLoginDTO {
  code: string
  redirectUri: string
}

export interface RefreshTokenDTO {
  refreshToken: string
}

export interface VerifyEmailDTO {
  email: string
  token: string
}

export interface ForgotPasswordDTO {
  email: string;
}

export interface ResetPasswordDTO {
  newPassword: string
  token: string
}
