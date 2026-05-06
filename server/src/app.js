import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import authRoutes from "./routes/auth.js";
import documentRoutes from "./routes/documents.js";
import shareRoutes from "./routes/shares.js";
import uploadRoutes from "./routes/upload.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.join(__dirname, "../../client/dist");

export const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(clientDistPath));

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api", shareRoutes);

app.get("*", (_request, response) => {
  response.sendFile(path.join(clientDistPath, "index.html"));
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ message: "Internal server error" });
});
