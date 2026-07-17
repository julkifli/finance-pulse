const http = require("http");
const fs = require("fs");
const path = require("path");
const PORT = 3000;
const ROOT = __dirname;
const MIME = {".html":"text/html",".css":"text/css",".js":"text/javascript",".json":"application/json",".png":"image/png",".jpg":"image/jpeg",".svg":"image/svg+xml",".ico":"image/x-icon",".pdf":"application/pdf"};
const server = http.createServer((req, res) => {
  let p = req.url.split("?")[0]; if (p === "/") p = "/index.html";
  const fp = path.join(ROOT, p); const ext = path.extname(fp);
  const ct = MIME[ext] || "application/octet-stream";
  fs.readFile(fp, (err, data) => { if (err) { res.writeHead(404); res.end("404"); return; } res.writeHead(200, {"Content-Type": ct}); res.end(data); });
});
server.listen(PORT, "127.0.0.1", () => { console.log("Finance Pulse running at http://localhost:" + PORT); });
