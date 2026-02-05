import { v2 as cloudinary } from "cloudinary";
import config from "@config/env";
import { Readable } from "stream";

export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
    });
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "clothing-items",
          public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
          resource_type: "image",
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve(result.secure_url);
          } else {
            reject(new Error("Upload failed"));
          }
        }
      );

      const stream = Readable.from(file.buffer);
      stream.pipe(uploadStream);
    });
  }

  private extractPublicId(url: string): string | null {
    try {
      const parsed = new URL(url);
      const parts = parsed.pathname.split("/").filter(Boolean);
      const uploadIndex = parts.findIndex((part) => part === "upload");
      if (uploadIndex < 0) return null;
      const publicParts = parts.slice(uploadIndex + 1);
      if (publicParts.length === 0) return null;
      const withoutVersion = publicParts[0].startsWith("v") ? publicParts.slice(1) : publicParts;
      if (withoutVersion.length === 0) return null;
      const last = withoutVersion[withoutVersion.length - 1];
      const name = last.includes(".") ? last.slice(0, last.lastIndexOf(".")) : last;
      const pathParts = [...withoutVersion.slice(0, -1), name];
      return pathParts.join("/");
    } catch {
      return null;
    }
  }

  async deleteFileByUrl(url?: string | null): Promise<void> {
    if (!url) return;
    const publicId = this.extractPublicId(url);
    if (!publicId) {
      throw new Error("Unable to resolve Cloudinary public id");
    }
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
    if (result.result !== "ok" && result.result !== "not found") {
      throw new Error(`Cloudinary delete failed: ${result.result || "unknown"}`);
    }
  }
}
