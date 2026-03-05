export const MESSAGES = {
  // Auth
  AUTH_LOGIN_SUCCESS: "Login successful",
  AUTH_LOGOUT_SUCCESS: "Logout successful",
  AUTH_REGISTER_SUCCESS: "Registration successful",
  AUTH_EMAIL_VERIFIED: "Email verified successfully",
  AUTH_PASSWORD_RESET: "Password reset successful",
  AUTH_INVALID_CREDENTIALS: "Invalid email or password",
  AUTH_EMAIL_EXISTS: "Email already exists",
  AUTH_UNAUTHORIZED: "Please sign in to continue",
  AUTH_TOKEN_EXPIRED: "Token has expired",
  AUTH_TOKEN_INVALID: "Invalid token",
  AUTH_GOOGLE_FAILED: "Google authentication failed",
  AUTH_TOKEN_REFRESHED: "Session refreshed",
  AUTH_GOOGLE_LOGIN_SUCCESS: "Google login successful",

  // Context
  CONTEXT_WEATHER_RETRIEVED: "Weather updated",
  CONTEXT_CALENDAR_RETRIEVED: "Calendar synced",
  CONTEXT_CLOSET_RETRIEVED: "Wardrobe loaded",
  CONTEXT_GOOGLE_TOKEN_REQUIRED: "Please connect your Google Calendar",
  CONTEXT_WEATHER_UNAVAILABLE: "Couldn't load weather right now. Please try again",
  CONTEXT_CALENDAR_UNAVAILABLE: "Couldn't load your calendar right now. Please try again",

  // Clothing
  IMAGE_REQUIRED: "Please upload an image",
  IMAGE_UNSUPPORTED: "Unsupported image format. Please use JPEG, PNG, GIF, or WebP",
  CLOTHING_ITEM_CREATED: "Item added to your wardrobe",
  CLOTHING_ITEM_DELETED: "Item removed from your wardrobe",
  CLOTHING_ITEM_NOT_FOUND: "Item not found",
  CLOTHING_ITEM_ID_INVALID: "Invalid item id",
  CLOTHING_CATEGORY_NOT_FOUND: "Category not found",
  CLOTHING_CATEGORY_CREATED: "Category created",
  CLOTHING_CATEGORIES_RETRIEVED: "Categories loaded",
  CLOTHING_TAG_CREATED: "Tag created",
  CLOTHING_TAGS_RETRIEVED: "Tags loaded",

  // Profile
  PROFILE_RETRIEVED: "Profile loaded",
  PROFILE_UPDATED: "Profile updated",

  // Outfit
  OUTFIT_CREATED: "Outfit saved",
  OUTFIT_ITEMS_REQUIRED: "Please choose at least one item",
  OUTFIT_ITEMS_INVALID: "Some selected items are invalid",

  // Outfit plan
  OUTFIT_PLANS_CREATED: "Outfit scheduled",
  OUTFIT_PLANS_RETRIEVED: "Schedule loaded",
  OUTFIT_PLAN_UPDATED: "Schedule updated",
  OUTFIT_PLAN_DELETED: "Removed from schedule",
  OUTFIT_PLAN_ID_INVALID: "Invalid plan id",
  OUTFIT_PLAN_NOT_FOUND: "Scheduled outfit not found",
  OUTFIT_NOT_FOUND_OR_FORBIDDEN: "Outfit not found",

  // Recommendation
  RECOMMENDATION_GENERATED: "Outfit recommendations ready",
  RECOMMENDATION_FAILED: "Couldn't generate recommendations. Please try again",
  CLOSET_ITEMS_REQUIRED: "Please add items to your wardrobe first",
  CLOSET_ITEM_IDS_INVALID: "Invalid wardrobe items selected",

  // User
  USER_CREATED: "User created successfully",
  USER_UPDATED: "User updated successfully",
  USER_DELETED: "User deleted successfully",
  USER_NOT_FOUND: "User not found",
  USER_RETRIEVED: "User loaded",
  USERS_RETRIEVED: "Users loaded",
  USER_FETCH_SUCCESS: "Users fetched successfully",

  // Product
  PRODUCT_CREATED: "Product created successfully",
  PRODUCT_UPDATED: "Product updated successfully",
  PRODUCT_DELETED: "Product deleted successfully",
  PRODUCT_NOT_FOUND: "Product not found",
  PRODUCT_FETCH_SUCCESS: "Products fetched successfully",

  // Validation
  VALIDATION_ERROR: "Please check your input",
  INVALID_EMAIL: "Invalid email format",
  INVALID_UUID: "Invalid UUID format",

  // Server
  SERVER_ERROR: "Something went wrong. Please try again",
  SERVICE_UNAVAILABLE: "Service is temporarily unavailable. Please try again",
  TOO_MANY_REQUESTS: "Too many requests. Please try again later",
  BAD_REQUEST: "Invalid request",
  FORBIDDEN: "You don't have permission to do that",
  NOT_FOUND: "Resource not found",
}
