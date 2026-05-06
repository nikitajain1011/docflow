import bcrypt from "bcryptjs";
import request from "supertest";
import { app } from "../app.js";
import { prisma } from "../lib/prisma.js";

beforeAll(async () => {
  const passwordHash = await bcrypt.hash("demo123", 12);

  await prisma.user.upsert({
    where: {
      email: "alice@demo.com"
    },
    update: {
      name: "Alice Rivers",
      passwordHash
    },
    create: {
      email: "alice@demo.com",
      name: "Alice Rivers",
      passwordHash
    }
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("auth", () => {
  test("POST /api/auth/login returns a token for Alice", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "alice@demo.com",
      password: "demo123"
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("token");
  });

  test("POST /api/auth/login rejects a wrong password", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "alice@demo.com",
      password: "wrong-password"
    });

    expect(response.status).toBe(401);
  });
});

describe("documents", () => {
  test("POST /api/documents creates an untitled document for Alice", async () => {
    const loginResponse = await request(app).post("/api/auth/login").send({
      email: "alice@demo.com",
      password: "demo123"
    });

    const response = await request(app)
      .post("/api/documents")
      .set("Authorization", `Bearer ${loginResponse.body.token}`)
      .send();

    expect(response.status).toBe(201);
    expect(response.body.document).toMatchObject({
      title: "Untitled Document"
    });
  });
});
