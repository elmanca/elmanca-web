var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_crypto = require("crypto");
// Sesiones locales (dev). En producción la autenticación la hace PHP (api/login.php).
const localSessions = /* @__PURE__ */ new Map();
function loadAdminConfig() {
  try {
    const cfgPath = import_path.default.join(process.cwd(), "api", "config.json");
    if (import_fs.default.existsSync(cfgPath)) {
      return JSON.parse(import_fs.default.readFileSync(cfgPath, "utf-8"));
    }
  } catch (err) {
    console.warn("Could not read api/config.json:", err);
  }
  return null;
}
function isAuthed(req) {
  try {
    const raw = req.headers.cookie || "";
    const match = raw.match(/manca_admin=([^;]+)/);
    if (!match) return false;
    const s = localSessions.get(match[1]);
    return !!(s && s.exp > Date.now());
  } catch {
    return false;
  }
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
  const workspaceDataDir = import_path.default.join(process.cwd(), "src", "data");
  const workspaceDataFile = import_path.default.join(workspaceDataDir, "siteContent.json");
  const distDataDir = import_path.default.join(process.cwd(), "dist", "data");
  const distDataFile = import_path.default.join(distDataDir, "siteContent.json");
  try {
    if (!import_fs.default.existsSync(workspaceDataDir)) {
      import_fs.default.mkdirSync(workspaceDataDir, { recursive: true });
    }
  } catch (err) {
    console.warn("Could not create workspace data dir:", err);
  }
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
  app.post(["/api/login.php", "/api/login"], (req, res) => {
    const cfg = loadAdminConfig();
    const { username = "", password = "" } = req.body || {};
    if (!cfg || !cfg.password_salt || !cfg.password_hash) {
      return res.status(500).json({ success: false, error: "Servidor mal configurado: falta api/config.json" });
    }
    if (!/^[0-9a-f]{64}$/i.test(cfg.password_hash)) {
      return res.status(500).json({ success: false, error: "Configuración de contraseña inválida en api/config.json" });
    }
    const expected = import_crypto.createHash("sha256").update(cfg.password_salt + password).digest("hex");
    const userOk = username === (cfg.admin_user || "admin");
    const passOk = import_crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(cfg.password_hash, "hex")
    );
    if (userOk && passOk) {
      const token = import_crypto.randomBytes(24).toString("hex");
      localSessions.set(token, { exp: Date.now() + 8 * 60 * 60 * 1e3 });
      res.setHeader("Set-Cookie", `manca_admin=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${8 * 3600}`);
      return res.json({ success: true, message: "Acceso autorizado" });
    }
    return res.status(401).json({ success: false, error: "Usuario o contraseña incorrectos. Verifique sus credenciales." });
  });
  app.get(["/api/health", "/api/health.php"], (req, res) => {
    res.json({ status: "ok", time: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.get(["/api/content", "/api/content.php"], (req, res) => {
    try {
      if (import_fs.default.existsSync(workspaceDataFile)) {
        const raw = import_fs.default.readFileSync(workspaceDataFile, "utf-8");
        return res.setHeader("Content-Type", "application/json; charset=utf-8").send(raw);
      }
      if (import_fs.default.existsSync(distDataFile)) {
        const raw = import_fs.default.readFileSync(distDataFile, "utf-8");
        return res.setHeader("Content-Type", "application/json; charset=utf-8").send(raw);
      }
      return res.status(404).json({ error: "No content found" });
    } catch (err) {
      console.error("Error reading site content:", err);
      return res.status(500).json({ error: "Error reading site content" });
    }
  });
  app.post(["/api/content", "/api/content.php"], (req, res) => {
    if (!isAuthed(req)) {
      return res.status(401).json({ error: "No autorizado. Iniciá sesión desde el panel de administración." });
    }
    try {
      const payload = req.body;
      if (!payload || typeof payload !== "object") {
        return res.status(400).json({ error: "Invalid payload" });
      }
      const contentString = JSON.stringify(payload, null, 2);
      try {
        if (!import_fs.default.existsSync(workspaceDataDir)) {
          import_fs.default.mkdirSync(workspaceDataDir, { recursive: true });
        }
        import_fs.default.writeFileSync(workspaceDataFile, contentString, "utf-8");
      } catch (e) {
        console.warn("Could not write to src/data/siteContent.json:", e);
      }
      try {
        if (import_fs.default.existsSync(import_path.default.join(process.cwd(), "dist"))) {
          if (!import_fs.default.existsSync(distDataDir)) {
            import_fs.default.mkdirSync(distDataDir, { recursive: true });
          }
          import_fs.default.writeFileSync(distDataFile, contentString, "utf-8");
        }
      } catch (e) {
        console.warn("Could not write to dist/data/siteContent.json:", e);
      }
      const timestamp = (/* @__PURE__ */ new Date()).toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
      return res.json({
        success: true,
        message: "Contenido guardado permanentemente en el servidor y c\xF3digo fuente.",
        timestamp
      });
    } catch (err) {
      console.error("Error saving site content:", err);
      return res.status(500).json({ error: "Error saving site content" });
    }
  });
  const publicUploadsDir = import_path.default.join(process.cwd(), "public", "uploads");
  const distUploadsDir = import_path.default.join(process.cwd(), "dist", "uploads");
  try {
    if (!import_fs.default.existsSync(publicUploadsDir)) {
      import_fs.default.mkdirSync(publicUploadsDir, { recursive: true });
    }
  } catch (err) {
    console.warn("Could not create public/uploads:", err);
  }
  app.post(["/api/upload", "/api/upload.php"], (req, res) => {
    if (!isAuthed(req)) {
      return res.status(401).json({ error: "No autorizado. Iniciá sesión desde el panel de administración." });
    }
    try {
      const { image, name } = req.body;
      if (!image || typeof image !== "string") {
        return res.status(400).json({ error: "No se envi\xF3 ninguna imagen." });
      }
      const match = image.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (!match) {
        return res.status(400).json({ error: "Formato de imagen inv\xE1lido. Debe ser base64." });
      }
      const extRaw = match[1].toLowerCase();
      const ext = extRaw === "svg+xml" ? "svg" : extRaw === "jpeg" ? "jpg" : extRaw;
      const base64Data = match[2];
      const buffer = Buffer.from(base64Data, "base64");
      const safePrefix = (name || "manca").replace(/[^a-zA-Z0-9-_]/g, "_").toLowerCase().slice(0, 30);
      const filename = `${safePrefix}_${Date.now()}_${Math.floor(Math.random() * 1e3)}.${ext}`;
      import_fs.default.writeFileSync(import_path.default.join(publicUploadsDir, filename), buffer);
      try {
        if (import_fs.default.existsSync(import_path.default.join(process.cwd(), "dist"))) {
          if (!import_fs.default.existsSync(distUploadsDir)) {
            import_fs.default.mkdirSync(distUploadsDir, { recursive: true });
          }
          import_fs.default.writeFileSync(import_path.default.join(distUploadsDir, filename), buffer);
        }
      } catch (e) {
        console.warn("Could not copy to dist/uploads:", e);
      }
      const url = `/uploads/${filename}`;
      return res.json({
        success: true,
        url,
        filename,
        message: "Imagen guardada con \xE9xito en el servidor."
      });
    } catch (err) {
      console.error("Error in /api/upload:", err);
      return res.status(500).json({ error: "Error procesando la imagen" });
    }
  });
  app.use("/uploads", import_express.default.static(publicUploadsDir));
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
