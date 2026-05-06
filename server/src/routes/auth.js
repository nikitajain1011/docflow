import { Router } from "express";
import bcrypt from "bcryptjs";
import { signToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  createdAt: true
};

router.post("/login", async (request, response, next) => {
  try {
    const { email, password } = request.body;

    if (!email || !password) {
      return response.status(400).json({ message: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase().trim() }
    });

    if (!user) {
      return response.status(401).json({ message: "Invalid email or password" });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return response.status(401).json({ message: "Invalid email or password" });
    }

    const token = signToken(user);
    const publicUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: publicUserSelect
    });

    return response.json({ token, user: publicUser });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", requireAuth, (request, response) => {
  response.json({ user: request.user });
});

export default router;
