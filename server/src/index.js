import { app } from "./app.js";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedIfEmpty() {
  const count = await prisma.user.count();
  if (count === 0) {
    const passwordHash = await bcrypt.hash("demo123", 12);
    const users = [
      { email: "alice@demo.com", name: "Alice Chen" },
      { email: "bob@demo.com", name: "Bob Patel" },
      { email: "carol@demo.com", name: "Carol Kim" },
    ];
    for (const user of users) {
      await prisma.user.create({ data: { ...user, passwordHash } });
    }
    console.log("Demo users seeded.");
  } else {
    console.log("Users already exist, skipping seed.");
  }
}

const PORT = process.env.PORT || 4000;
seedIfEmpty().then(() => {
  app.listen(PORT, () => {
    console.log(`DocFlow API is running at http://localhost:${PORT}`);
  });
});