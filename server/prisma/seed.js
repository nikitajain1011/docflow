import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const demoUsers = [
  { email: "alice@demo.com", name: "Alice Chen" },
  { email: "bob@demo.com", name: "Bob Patel" },
  { email: "carol@demo.com", name: "Carol Kim" }
];

async function main() {
  const passwordHash = await bcrypt.hash("demo123", 12);

  for (const user of demoUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        passwordHash
      },
      create: {
        ...user,
        passwordHash
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
