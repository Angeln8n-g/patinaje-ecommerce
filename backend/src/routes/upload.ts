import { Router } from "express";
import multer from "multer";
import { requireAuth, requireRole } from "../lib/auth.js";
import { uploadFile, deleteFile, isAllowedType, isConfigured } from "../lib/storage.js";
import { pool } from "../db/pool.js";

const router = Router();

// GET /api/upload/file/* — serve file from PostgreSQL database
router.get("/file/*", async (req, res) => {
  try {
    const key = (req.params as any)[0];
    if (!key) {
      res.status(400).json({ error: "Falta la clave del archivo" });
      return;
    }

    const { rows } = await pool.query(
      "SELECT data, mimetype FROM uploads WHERE key = $1",
      [key]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: "Archivo no encontrado" });
      return;
    }

    const file = rows[0];

    // Set cache control headers to optimize delivery
    res.setHeader("Content-Type", file.mimetype);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable"); // Cache for 1 year
    
    // Expose file cross-origin so the frontend can load it
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

    res.send(file.data);
  } catch (err: any) {
    console.error("Error serving file:", err);
    res.status(500).json({ error: "Error al recuperar el archivo" });
  }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (isAllowedType(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de archivo no permitido"));
    }
  },
});

// GET /api/upload/status — check if R2 is configured
router.get("/status", requireAuth, requireRole("ADMIN"), (_req, res) => {
  res.json({ configured: isConfigured() });
});

// POST /api/upload — upload single file
router.post("/", requireAuth, requireRole("ADMIN", "SELLER"), upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No se envió ningún archivo" });
      return;
    }

    const folder = (req.body.folder as string) || "uploads";
    const result = await uploadFile(req.file.buffer, req.file.mimetype, folder);

    res.status(201).json({
      success: true,
      url: result.url,
      key: result.key,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message || "Error al subir archivo" });
  }
});

// POST /api/upload/multiple — upload multiple files
router.post("/multiple", requireAuth, requireRole("ADMIN", "SELLER"), upload.array("files", 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: "No se enviaron archivos" });
      return;
    }

    const folder = (req.body.folder as string) || "uploads";
    const results = [];

    for (const file of files) {
      try {
        const result = await uploadFile(file.buffer, file.mimetype, folder);
        results.push({ success: true, url: result.url, key: result.key, name: file.originalname });
      } catch (err: any) {
        results.push({ success: false, name: file.originalname, error: err.message });
      }
    }

    res.status(201).json({
      total: files.length,
      uploaded: results.filter(r => r.success).length,
      results,
    });
  } catch (err: any) {
    console.error("Multiple upload error:", err);
    res.status(500).json({ error: err.message || "Error al subir archivos" });
  }
});

// DELETE /api/upload — delete a file by key
router.delete("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { key } = req.body;
    if (!key) {
      res.status(400).json({ error: "Se requiere la key del archivo" });
      return;
    }
    await deleteFile(key);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Delete file error:", err);
    res.status(500).json({ error: err.message || "Error al eliminar archivo" });
  }
});

export default router;
