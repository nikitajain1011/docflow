import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/users", async (request, response, next) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        id: {
          not: request.user.id
        }
      },
      select: {
        id: true,
        name: true,
        email: true
      },
      orderBy: {
        name: "asc"
      }
    });

    return response.json({ users });
  } catch (error) {
    return next(error);
  }
});

router.post("/documents/:id/share", async (request, response, next) => {
  try {
    const { userId } = request.body;

    if (!userId) {
      return response.status(400).json({ message: "userId is required" });
    }

    const document = await prisma.document.findUnique({
      where: {
        id: request.params.id
      },
      select: {
        id: true,
        ownerId: true
      }
    });

    if (!document) {
      return response.status(404).json({ message: "Document not found" });
    }

    if (document.ownerId !== request.user.id) {
      return response.status(403).json({ message: "Only the owner can share this document" });
    }

    if (userId === request.user.id) {
      return response.status(400).json({ message: "Cannot share a document with yourself" });
    }

    const sharedWith = await prisma.user.findUnique({
      where: {
        id: userId
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    if (!sharedWith) {
      return response.status(404).json({ message: "User not found" });
    }

    await prisma.documentShare.upsert({
      where: {
        documentId_sharedWithId: {
          documentId: document.id,
          sharedWithId: sharedWith.id
        }
      },
      update: {},
      create: {
        documentId: document.id,
        sharedWithId: sharedWith.id
      }
    });

    return response.json({ user: sharedWith });
  } catch (error) {
    return next(error);
  }
});

router.delete("/documents/:id/share/:userId", async (request, response, next) => {
  try {
    const document = await prisma.document.findUnique({
      where: {
        id: request.params.id
      },
      select: {
        id: true,
        ownerId: true
      }
    });

    if (!document) {
      return response.status(404).json({ message: "Document not found" });
    }

    if (document.ownerId !== request.user.id) {
      return response.status(403).json({ message: "Only the owner can revoke access" });
    }

    await prisma.documentShare.deleteMany({
      where: {
        documentId: document.id,
        sharedWithId: request.params.userId
      }
    });

    return response.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
