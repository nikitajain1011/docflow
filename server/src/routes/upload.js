import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const supportedExtensions = new Set([".txt", ".md"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024
  },
  fileFilter(_request, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase();

    if (!supportedExtensions.has(extension)) {
      return callback(new Error("UNSUPPORTED_FILE_TYPE"));
    }

    return callback(null, true);
  }
});

router.post("/", requireAuth, (request, response, next) => {
  upload.single("file")(request, response, (error) => {
    if (error?.message === "UNSUPPORTED_FILE_TYPE") {
      return response.status(400).json({ message: "Only .txt and .md files are supported" });
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return response.status(400).json({ message: "File size must be 2MB or less" });
    }

    if (error) {
      return next(error);
    }

    return next();
  });
});

router.post("/", async (request, response, next) => {
  try {
    if (!request.file) {
      return response.status(400).json({ message: "File is required" });
    }

    const extension = path.extname(request.file.originalname).toLowerCase();
    const title = path.basename(request.file.originalname, extension) || "Untitled Document";
    const text = request.file.buffer.toString("utf8");
    const content = JSON.stringify({
      type: "text",
      content: text
    });

    const document = await prisma.document.create({
      data: {
        title,
        content,
        ownerId: request.user.id
      },
      select: {
        id: true
      }
    });

    return response.status(201).json({ documentId: document.id });
  } catch (error) {
    return next(error);
  }
});

export default router;
