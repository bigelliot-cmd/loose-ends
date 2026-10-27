// Local preview for Loose Ends · Web animations (no dependencies).
// From this folder: node serve.mjs, then open http://localhost:5173/
// ES modules and the .json loads need a real server; opening index.html from disk won't work.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".glb": "model/gltf-binary", ".svg": "image/svg+xml", ".mp4": "video/mp4", ".webm": "video/webm", ".md": "text/plain; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp" };
const port = Number(process.env.PORT) || 5173;

createServer(async (req, res) => {
  try {
    let path = normalize(join(root, decodeURIComponent(new URL(req.url, "http://x").pathname)));
    if (!path.startsWith(root)) throw new Error("outside");
    if ((await stat(path)).isDirectory()) path = join(path, "index.html");
    const body = await readFile(path);
    res.writeHead(200, { "Content-Type": types[extname(path)] ?? "application/octet-stream", "Cache-Control": "no-store" });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
}).listen(port, () => console.log(`Web animations: http://localhost:${port}/`));
