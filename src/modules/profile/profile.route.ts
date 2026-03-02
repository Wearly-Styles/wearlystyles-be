import { Router } from "express";
import { ProfileController } from "./profile.controller";
import { authMiddleware } from "@common/middleware/auth.middleware";
import multer from "multer";

const router = Router();
const profileController = new ProfileController();

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
  "/me",
  authMiddleware,
    profileController.getProfileById.bind(profileController),
);

router.post(
  "/me",
  authMiddleware,
  upload.single("avatar"),
  profileController.updateProfile.bind(profileController),
);

export default router;