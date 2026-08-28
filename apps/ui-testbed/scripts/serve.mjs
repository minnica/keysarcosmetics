import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? "3010");
const root = join(process.cwd(), "out");
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

createServer(async (request, response) => {
  const requestPath = new URL(request.url ?? "/", `http://${host}`).pathname;
  const relativePath =
    requestPath === "/" ? "index.html" : requestPath.slice(1);
  const target = normalize(join(root, relativePath));

  if (
    !target.startsWith(root) ||
    !existsSync(target) ||
    !(await stat(target)).isFile()
  ) {
    response.writeHead(404).end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": contentTypes[extname(target)] ?? "application/octet-stream",
    "Cache-Control": "no-store",
  });
  createReadStream(target).pipe(response);
}).listen(port, host, () => {
  console.log(`UI testbed listening on http://${host}:${port}`);
});
