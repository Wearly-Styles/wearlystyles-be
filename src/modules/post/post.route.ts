import {Router} from 'express';
import {PostController} from './post.controller';
import { authMiddleware } from "@common/middleware/auth.middleware";

const router = Router();

const postController = new PostController();

router.get('/', postController.getAllPosts.bind(postController));

router.get('/user', authMiddleware, postController.getPostsByUserId.bind(postController));

export default router;