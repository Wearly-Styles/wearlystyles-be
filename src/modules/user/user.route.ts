/**
 * @swagger
 * /users:
 *   post:
 *     tags:
 *       - Users
 *     summary: Create new user (Admin only)
 *     description: Create a new user account as an administrator
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       403:
 *         description: Forbidden - insufficient permissions
 *       401:
 *         description: Unauthorized - invalid token
 *   get:
 *     tags:
 *       - Users
 *     summary: Get all users
 *     description: Retrieve a paginated list of all users
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 10
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *         description: Search by email or name
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *
 * /users/{id}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user by ID
 *     description: Retrieve a single user by their ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *           format: int32
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *   patch:
 *     tags:
 *       - Users
 *     summary: Update user profile
 *     description: Update user information (authenticated users can update their own profile)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *           format: int32
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - invalid token
 *       404:
 *         description: User not found
 *   delete:
 *     tags:
 *       - Users
 *     summary: Delete user (Admin only)
 *     description: Remove a user from the system
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *           format: int32
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       403:
 *         description: Forbidden - insufficient permissions
 *       401:
 *         description: Unauthorized - invalid token
 *       404:
 *         description: User not found
 */

import { Router } from "express"
import { UserController } from "./user.controller"
import { authMiddleware } from "@middleware/auth.middleware"
import { roleMiddleware } from "@middleware/role.middleware"
import { validateRequest } from "@middleware/validation.middleware"
import { createUserSchema, updateUserSchema } from "@validations/user.validator"
import { ROLES } from "@common/constants/roles.constant"

const router = Router()
const userController = new UserController()

router.post("/", authMiddleware, roleMiddleware([ROLES.ADMIN]), validateRequest(createUserSchema), (req, res, next) =>
  userController.createUser(req, res, next),
)

router.get("/", (req, res, next) => userController.getAllUsers(req, res, next))

router.get("/:id", (req, res, next) => userController.getUserById(req, res, next))

router.patch("/:id", authMiddleware, validateRequest(updateUserSchema), (req, res, next) =>
  userController.updateUser(req, res, next),
)

router.delete("/:id", authMiddleware, roleMiddleware([ROLES.ADMIN]), (req, res, next) =>
  userController.deleteUser(req, res, next),
)

export default router
