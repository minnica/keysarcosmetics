import { readFile } from "node:fs/promises";

const canonicalUrl = new URL("../prisma/schema.prisma", import.meta.url);
const compatibilityUrl = new URL(
  "../src/prisma/schema.prisma",
  import.meta.url,
);

const [canonical, compatibility] = await Promise.all([
  readFile(canonicalUrl, "utf8"),
  readFile(compatibilityUrl, "utf8"),
]);

if (canonical !== compatibility) {
  console.error(
    "Los schemas Prisma no coinciden. Actualiza backend/api/src/prisma/schema.prisma desde el schema canónico.",
  );
  process.exit(1);
}

console.log("Schemas Prisma sincronizados.");
