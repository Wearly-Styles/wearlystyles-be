export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const allowedEmailDomain = "gmail.com"

export const isValidEmail = (email: string): boolean => {
  if (!emailRegex.test(email)) return false

  const domain = email.split("@").pop()?.toLowerCase()
  return domain === allowedEmailDomain
}
