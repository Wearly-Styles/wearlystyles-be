import { v4 as uuidv4 } from "uuid"

export const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const isValidUUID = (uuid: string): boolean => {
  return uuidRegex.test(uuid)
}

export const generateUUID = (): string => {
  return uuidv4()
}
