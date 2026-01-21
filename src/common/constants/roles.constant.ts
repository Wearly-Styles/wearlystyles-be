export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  SELLER: "seller",
}

export const ROLE_PERMISSIONS = {
  admin: ["create", "read", "update", "delete"],
  seller: ["create", "read", "update"],
  user: ["read"],
}
