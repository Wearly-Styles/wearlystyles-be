export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const isValidEmail = (email: string): boolean => {
  return emailRegex.test(email)
}
