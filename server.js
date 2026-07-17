const http = require("http");
const fs = require("fs");
const path = require("path");
const PORT = 3000;
const ROOT = __dirname;

// Try loading dotenv for local env variables
try {
  require("dotenv").config();
} catch (e) {}

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf"
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split("?")[0];

  // Route API requests to Vercel Serverless Function equivalents
  if (urlPath.startsWith("/api/")) {
    const apiFile = path.join(ROOT, urlPath + ".js");
    if (fs.existsSync(apiFile)) {
      try {
        // Clear require cache for local hot reloading
        delete require.cache[require.resolve(apiFile)];
        const handler = require(apiFile);

        let bodyData = "";
        req.on("data", chunk => {
          bodyData += chunk;
        });

        req.on("end", async () => {
          // Parse body if JSON
          req.body = {};
          if (bodyData) {
            try {
              req.body = JSON.parse(bodyData);
            } catch (e) {
              req.body = bodyData;
            }
          }

          // Parse query string
          const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
          req.query = Object.fromEntries(urlObj.searchParams);

          // Mock Vercel response helper methods
          let statusCode = 200;
          const responseHeaders = { "Content-Type": "application/json" };

          const resMock = {
            status(code) {
              statusCode = code;
              return this;
            },
            setHeader(name, value) {
              responseHeaders[name] = value;
              return this;
            },
            json(data) {
              res.writeHead(statusCode, responseHeaders);
              res.end(JSON.stringify(data));
              return this;
            },
            send(data) {
              res.writeHead(statusCode, { ...responseHeaders, "Content-Type": "text/plain" });
              res.end(data);
              return this;
            }
          };

          try {
            await handler(req, resMock);
          } catch (handlerErr) {
            console.error(`Error in API handler ${urlPath}:`, handlerErr);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "API execution error", details: handlerErr.message }));
          }
        });
      } catch (err) {
        console.error(`Error loading API module ${urlPath}:`, err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to load API module", details: err.message }));
      }
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "API endpoint not found" }));
    }
    return;
  }

  // Serve static files
  let p = urlPath;
  if (p === "/") p = "/index.html";
  const fp = path.join(ROOT, p);
  const ext = path.extname(fp);
  const ct = MIME[ext] || "application/octet-stream";

  fs.readFile(fp, (err, data) => {
    if (err) {
      // For single-page application routing, fall back to index.html if not an API and file not found
      fs.readFile(path.join(ROOT, "index.html"), (err2, data2) => {
        if (err2) {
          res.writeHead(404);
          res.end("404 Not Found");
          return;
        }
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(data2);
      });
      return;
    }
    res.writeHead(200, { "Content-Type": ct });
    res.end(data);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("Finance Pulse running locally at http://localhost:" + PORT);
});
