import { Router } from "express";
import * as closetController from "./closet.controller";
import { authMiddleware } from "../../common/middleware/auth.middleware"; 

const router = Router();
router.get("/", authMiddleware, closetController.getClosetList); 

export default router;