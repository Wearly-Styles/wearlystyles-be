import {Router} from 'express';
import {PostController} from './post.controller';
import { authMiddleware } from "@common/middleware/auth.middleware";
import multer from "multer";
const router = Router();

const postController = new PostController();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported image format"));
    }
  },
});
router.get(
  "/",
  authMiddleware,
  postController.getAllPosts.bind(postController)
);
router.get('/user', authMiddleware, postController.getPostsByUserId.bind(postController));

router.post(
  "/",
  authMiddleware,
  upload.single("image"),
  postController.createPost.bind(postController)
);

router.put(
  "/:id",
  authMiddleware,
  upload.single("image"),
  postController.updatePost.bind(postController)
);

router.delete(
  "/:id",
  authMiddleware,
  postController.deletePost.bind(postController)
);

router.post(
  "/:id/like",
  authMiddleware,
  postController.likePost.bind(postController)
);

router.post(
  "/:id/comment",
  authMiddleware,
  postController.commentOnPost.bind(postController)
);

export default router;