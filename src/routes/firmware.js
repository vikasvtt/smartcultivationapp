// ── routes/firmware.js ───────────────────────────────────────────────
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const AWS = require("aws-sdk");
const auth = require("../backend/middleware/auth");

module.exports = function (mongoose) {
  const router = express.Router();

  // ── AWS S3 CONFIG ──────────────────────────────────────────────────
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.AWS_REGION || "ap-south-1",
  });

  const BUCKET_NAME = process.env.S3_BUCKET_NAME;

  // ── Multer (temp storage only) ─────────────────────────────────────
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, "../backend/temp");
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname);
    },
  });

  // ── File-type guard ────────────────────────────────────────────────
  const fileFilter = (req, file, cb) => {
    if (
      file.originalname.endsWith(".bin") ||
      file.mimetype === "application/octet-stream"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only .bin firmware files are accepted"), false);
    }
  };

  const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  // ── Admin-only guard ───────────────────────────────────────────────
  function adminOnly(req, res, next) {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  }

  // ════════════════════════════════════════════════════════════════════
  // POST /api/firmware/upload
  // ════════════════════════════════════════════════════════════════════
  router.post(
    "/upload",
    auth,
    adminOnly,
    upload.single("file"),
    async (req, res) => {
      if (!req.file) {
        return res.status(400).json({ error: "No file received" });
      }

      try {
        // 🔥 Read file
        const fileContent = fs.readFileSync(req.file.path);

        // 🔥 Unique filename (IMPORTANT)
        const fileName = `firmware/esp32_${Date.now()}.bin`;

        // 🔥 Upload to S3
        const params = {
          Bucket: BUCKET_NAME,
          Key: fileName,
          Body: fileContent,
          ContentType: "application/octet-stream",
        };

        const data = await s3.upload(params).promise();

        // 🔥 S3 URL
        const firmwareUrl = data.Location;

        // 🔥 Version
        const version = fileName;

        // 🔥 Save in MongoDB
        const db = mongoose.connection.db;

        await db.collection("configs").updateMany(
          {},
          {
            $set: {
              "firmware.version": version,
              "firmware.url": firmwareUrl,
              "firmware.updatedAt": new Date(),
            },
          }
        );

        // 🔥 Delete temp file
        fs.unlinkSync(req.file.path);

        console.log(`📦 Firmware uploaded → ${version}`);
        console.log(`🔗 S3 URL → ${firmwareUrl}`);

        res.json({
          success: true,
          message: "Firmware uploaded to S3 successfully",
          version,
          url: firmwareUrl,
        });
      } catch (error) {
        console.error("Firmware upload error:", error.message);
        res.status(500).json({ error: "Firmware upload failed" });
      }
    }
  );

  // ════════════════════════════════════════════════════════════════════
  // GET /api/firmware/info
  // ════════════════════════════════════════════════════════════════════
  router.get("/info", auth, async (req, res) => {
    try {
      const doc = await mongoose.connection.db
        .collection("configs")
        .findOne({}, { projection: { firmware: 1 } });

      if (!doc?.firmware?.version) {
        return res.json({
          version: null,
          url: null,
          message: "No firmware uploaded yet",
        });
      }

      res.json({
        version: doc.firmware.version,
        url: doc.firmware.url,
        updatedAt: doc.firmware.updatedAt,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
