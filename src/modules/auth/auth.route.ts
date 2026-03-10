/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register a new user
 *     description: Create a new user account with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Too many requests - rate limit exceeded
 *
 * /auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Login user
 *     description: Authenticate user with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Too many login attempts - rate limit exceeded
 *
 * /auth/logout:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Logout user
 *     description: Invalidate user's current session
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized - invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /auth/refresh-token:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Refresh access token
 *     description: Get a new access token using refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token from login response
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * 
 * /auth/google:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Login with Google
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GoogleAuthRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid authorization code
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Google authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

import { Router } from "express"
import { AuthController } from "./auth.controller"
import { authMiddleware } from "@middleware/auth.middleware"
import { validateRequest } from "@middleware/validation.middleware"
import { authRateLimiter } from "@middleware/rate-limit.middleware"
import { registerSchema, loginSchema, googleLoginSchema, googleCodeLoginSchema, googleAuthSchema } from "@validations/auth.validator"

const router = Router()
const authController = new AuthController()

router.post("/register", authRateLimiter, validateRequest(registerSchema), (req, res, next) =>
  authController.register(req, res, next),
)

router.post("/login", authRateLimiter, validateRequest(loginSchema), (req, res, next) =>
  authController.login(req, res, next),
)

router.post("/login/google", authRateLimiter, validateRequest(googleLoginSchema), (req, res, next) =>
  authController.loginWithGoogle(req, res, next),
)

router.post("/login/google-code", authRateLimiter, validateRequest(googleCodeLoginSchema), (req, res, next) =>
  authController.loginWithGoogleCode(req, res, next),
)

router.post("/logout", authMiddleware, (req, res, next) => authController.logout(req, res, next))

router.post("/refresh-token", (req, res, next) => authController.refreshToken(req, res, next))

router.post("/google", authRateLimiter, validateRequest(googleAuthSchema), 
  (req, res, next) => authController.googleLogin(req, res, next)
)

router.post("/forgot-password", (req, res, next) => authController.forgotPassword(req, res, next));

router.post("/reset-password", (req, res, next) => authController.resetPassword(req, res, next));

export default router