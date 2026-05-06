import { prisma } from "../lib/prisma.js";
import { verifyToken } from "../lib/jwt.js";

export async function requireAuth(request, response, next) {
  const header = request.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return response.status(401).json({ message: "Authentication required" });
  }

  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    });

    if (!user) {
      return response.status(401).json({ message: "Invalid token" });
    }

    request.user = user;
    return next();
  } catch (_error) {
    return response.status(401).json({ message: "Invalid token" });
  }
}
