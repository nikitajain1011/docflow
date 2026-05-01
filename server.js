const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const analyze = require("./api/analyze");

const port = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, "public");

function loadLocalEnv() {
  const envPath = path.join(__dirname, ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const envFile = fs.readFileSync(envPath, "utf8");
  for (const line of envFile.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadLocalEnv();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const normalizedPath = path.normalize(decodeURIComponent(url.pathname));
  const safePath = normalizedPath
    .replace(/^([/\\])+/, "")
    .replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(publicDir, safePath === "" ? "index.html" : safePath);

  if (!filePath.startsWith(publicDir + path.sep)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, contents) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream"
    });
    response.end(contents);
  });
}

const server = http.createServer((request, response) => {
  if (request.url?.startsWith("/api/analyze")) {
    analyze(request, response);
    return;
  }

  serveStatic(request, response);
});

server.listen(port, () => {
  console.log(`StrategyAI is running at http://localhost:${port}`);
});
