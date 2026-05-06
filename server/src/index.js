import { app } from "./app.js";
import { execSync } from "child_process";

try {
  execSync("npx prisma db seed", { cwd: process.cwd() + "/server", stdio: "inherit" });
} catch (e) {
  console.log("Seed skipped:", e.message);
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`DocFlow API is running at http://localhost:${PORT}`);
});