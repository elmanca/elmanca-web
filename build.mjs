import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Genera dist/ (paquete listo para subir a public_html/ en Hostinger)
const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist");

const items = ["index.html", "assets", "api", "uploads", "overlays", ".htaccess", "robots.txt", "sitemap.xml"];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const item of items) {
  const src = path.join(root, item);
  try {
    await cp(src, path.join(dist, item), { recursive: true });
  } catch (err) {
    console.warn(`Aviso: no se encontró "${item}" (${err.code})`);
  }
}

console.log("Build OK → dist/ listo para subir a public_html/ en Hostinger.");
console.log("Recordá: dist/api/config.json debe existir (o generarlo en el servidor) para que el login funcione.");