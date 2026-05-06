import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const emptyDocumentContent = JSON.stringify({
  type: "doc",
  content: [
    {
      type: "paragraph"
    }
  ]
});

function mapDocumentSummary(document, userId) {
  return {
    id: document.id,
    title: document.title,
    ownerId: document.ownerId,
    ownerName: document.owner.name,
    updatedAt: document.updatedAt,
    isOwner: document.ownerId === userId
  };
}

async function findAccessibleDocument(documentId, userId) {
  return prisma.document.findFirst({
    where: {
      id: documentId,
      OR: [
        { ownerId: userId },
        {
          shares: {
            some: {
              sharedWithId: userId
            }
          }
        }
      ]
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true
        }
      },
      shares: {
        include: {
          sharedWith: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }
    }
  });
}

router.use(requireAuth);

router.get("/", async (request, response, next) => {
  try {
    const documents = await prisma.document.findMany({
      where: {
        OR: [
          { ownerId: request.user.id },
          {
            shares: {
              some: {
                sharedWithId: request.user.id
              }
            }
          }
        ]
      },
      include: {
        owner: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

    response.json({
      documents: documents.map((document) => mapDocumentSummary(document, request.user.id))
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (request, response, next) => {
  try {
    const document = await prisma.document.create({
      data: {
        title: "Untitled Document",
        content: emptyDocumentContent,
        ownerId: request.user.id
      },
      include: {
        owner: {
          select: {
            name: true
          }
        }
      }
    });

    response.status(201).json({ document: mapDocumentSummary(document, request.user.id) });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/versions", async (request, response, next) => {
  try {
    const document = await findAccessibleDocument(request.params.id, request.user.id);

    if (!document) {
      return response.status(404).json({ message: "Document not found" });
    }

    const versions = await prisma.documentVersion.findMany({
      where: {
        documentId: document.id
      },
      select: {
        id: true,
        savedAt: true
      },
      orderBy: {
        savedAt: "desc"
      }
    });

    return response.json({ versions });
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/versions", async (request, response, next) => {
  try {
    const document = await findAccessibleDocument(request.params.id, request.user.id);

    if (!document) {
      return response.status(404).json({ message: "Document not found" });
    }

    const version = await prisma.documentVersion.create({
      data: {
        documentId: document.id,
        title: document.title,
        content: document.content
      },
      select: {
        id: true,
        savedAt: true
      }
    });

    const versions = await prisma.documentVersion.findMany({
      where: {
        documentId: document.id
      },
      select: {
        id: true
      },
      orderBy: {
        savedAt: "desc"
      },
      skip: 10
    });

    if (versions.length) {
      await prisma.documentVersion.deleteMany({
        where: {
          id: {
            in: versions.map((oldVersion) => oldVersion.id)
          }
        }
      });
    }

    return response.status(201).json({ version });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id/versions/:versionId", async (request, response, next) => {
  try {
    const document = await findAccessibleDocument(request.params.id, request.user.id);

    if (!document) {
      return response.status(404).json({ message: "Document not found" });
    }

    const version = await prisma.documentVersion.findFirst({
      where: {
        id: request.params.versionId,
        documentId: document.id
      },
      select: {
        id: true,
        title: true,
        content: true,
        savedAt: true
      }
    });

    if (!version) {
      return response.status(404).json({ message: "Version not found" });
    }

    return response.json({ version });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (request, response, next) => {
  try {
    const document = await findAccessibleDocument(request.params.id, request.user.id);

    if (!document) {
      return response.status(404).json({ message: "Document not found" });
    }

    return response.json({
      document: {
        id: document.id,
        title: document.title,
        content: document.content,
        ownerId: document.ownerId,
        ownerName: document.owner.name,
        updatedAt: document.updatedAt,
        isOwner: document.ownerId === request.user.id,
        sharedUsers: document.shares.map((share) => share.sharedWith)
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.put("/:id", async (request, response, next) => {
  try {
    const document = await findAccessibleDocument(request.params.id, request.user.id);

    if (!document) {
      return response.status(404).json({ message: "Document not found" });
    }

    const updates = {};

    if (request.body.title !== undefined) {
      const title = String(request.body.title).trim();
      updates.title = title || "Untitled Document";
    }

    if (request.body.content !== undefined) {
      if (typeof request.body.content === "string") {
        updates.content = request.body.content;
      } else {
        updates.content = JSON.stringify(request.body.content);
      }
    }

    const updatedDocument = await prisma.document.update({
      where: {
        id: document.id
      },
      data: updates,
      include: {
        owner: {
          select: {
            name: true
          }
        }
      }
    });

    return response.json({
      document: {
        ...mapDocumentSummary(updatedDocument, request.user.id),
        content: updatedDocument.content
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (request, response, next) => {
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
      return response.status(403).json({ message: "Only the owner can delete this document" });
    }

    await prisma.document.delete({
      where: {
        id: document.id
      }
    });

    return response.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
