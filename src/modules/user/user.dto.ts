export interface CreateUserDTO {
  email: string
  fullName?: string
  avatar?: string
  password: string
}

export interface UpdateUserDTO {
  fullName?: string
  avatar?: string
}

export interface UserResponseDTO {
  id: number
  email: string
  fullName?: string
  avatar?: string
  role: string
  status: string
  createdAt: Date
  updatedAt: Date
}
