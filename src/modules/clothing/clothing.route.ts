import { Router } from "express";
import { ClothingController } from "./clothing.controller";
import { authMiddleware } from "@common/middleware/auth.middleware";
import multer from "multer";

const router = Router();
const clothingController = new ClothingController();

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

router.post(
  "/items",
  authMiddleware,
  upload.single("image"),
  clothingController.createClothingItem.bind(clothingController),
);

router.post(
  "/categories",
  authMiddleware,
  clothingController.createCategory.bind(clothingController),
);

router.post(
  "/tags",
  authMiddleware,
  clothingController.createTag.bind(clothingController),
);

router.get(
  "/categories",
  authMiddleware,
  clothingController.listCategories.bind(clothingController),
);

router.get(
  "/tags",
  authMiddleware,
  clothingController.listTags.bind(clothingController),
);

router.get(
  "/items",
  authMiddleware,
  clothingController.listClothingItems.bind(clothingController),
);

router.get(
  "/items/:id",
  authMiddleware,
  clothingController.getClothingItemDetail.bind(clothingController),
);

router.patch(
  "/items/:id/category",
  authMiddleware,
  clothingController.updateClothingItemCategory.bind(clothingController),
);

export default router;
