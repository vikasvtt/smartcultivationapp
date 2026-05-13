// ── server.js ────────────────────────────────────────────────────────

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const path = require("path");
const AWS = require("aws-sdk");
// ✅ RESTORED ORIGINAL (IMPORTANT)
const auth = require("./middleware/auth");

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION,
});

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const allowedOrigins = new Set([
  "https://growio-eight.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "capacitor://localhost",
  "ionic://localhost",
  ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean) : []),
]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.has(origin) || origin.endsWith(".vercel.app")) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json());

// ── MongoDB Connection ────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Connected to chamberDB");

    app.listen(PORT, "0.0.0.0", () => {
      console.log("─────────────────────────────────────────");
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`❤️ Health → ${BASE_URL}health`);
      console.log(`📡 SSE → ${BASE_URL}api/live`);
      console.log("─────────────────────────────────────────");

      startPolling(); // ✅ now safe
    });
  })
  .catch((err) => console.error(err));
// ── Schemas ──────────────────────────────────────────────────────────
const telemetrySchema = new mongoose.Schema(
  {
    deviceId: String,
    temperature: Number,
    humidity: Number,
    soil: Number,
    soilStatus: String,
    light: String,
    fan: String,
    motor: String,
    time: Date,
  },
  { collection: "telemetry", strict: false }
);

const Telemetry = mongoose.model("Telemetry", telemetrySchema);

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  deviceId: String,
});

const User = mongoose.model("User", userSchema);

const configSchema = new mongoose.Schema(
  {
    deviceId: String,
    relays: Object,
    firmware: Object,
    profileId: String,
    profileName: String,
  },
  {
    collection: "configs", // 🔥 FORCE CORRECT COLLECTION
  }
);

const Config = mongoose.model("Config", configSchema);

const chamberProfileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    relays: { type: Object, default: {} },
    createdBy: { type: String, default: "" },
    updatedBy: { type: String, default: "" },
  },
  {
    collection: "chamberprofiles",
    timestamps: true,
  }
);

const ChamberProfile = mongoose.model("ChamberProfile", chamberProfileSchema);

const imageSchema = new mongoose.Schema(
  {
    deviceId: String,
    fileName: String,
    contentType: String,
    imageData: Buffer,
    uploadedAt: { type: Date, default: Date.now },
    attachmentMode: { type: String, default: "automatic" },
    selectedDate: { type: String, default: "" },
    profileId: { type: String, default: "" },
    profileName: { type: String, default: "" },
    telemetry: { type: Object, default: null },
  },
  {
    collection: "images",
  }
);

imageSchema.index({ deviceId: 1, profileId: 1, uploadedAt: -1 });

const ImageRecord = mongoose.model("ImageRecord", imageSchema);

const outerEnvironmentImageSchema = new mongoose.Schema(
  {
    deviceId: String,
    fileName: String,
    contentType: String,
    imageData: Buffer,
    uploadedAt: { type: Date, default: Date.now },
    attachmentMode: { type: String, default: "automatic" },
    selectedDate: { type: String, default: "" },
    profileId: { type: String, default: "" },
    profileName: { type: String, default: "" },
    telemetry: { type: Object, default: null },
  },
  {
    collection: "outerenvironmentimages",
  }
);

outerEnvironmentImageSchema.index({ deviceId: 1, profileId: 1, uploadedAt: -1 });

const OuterEnvironmentImageRecord = mongoose.model("OuterEnvironmentImageRecord", outerEnvironmentImageSchema);

function sanitizeUser(userDoc) {
  if (!userDoc) return null;

  return {
    _id: userDoc._id,
    name: userDoc.name,
    email: userDoc.email,
    role: userDoc.role || "pending",
    deviceId: userDoc.deviceId || "",
  };
}

async function requireAdmin(req, res) {
  const currentUser = await User.findById(req.user.id);

  if (!currentUser || currentUser.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return null;
  }

  return currentUser;
}

// ════════════════════════════════════════════════════════════════════
// SSE
// ════════════════════════════════════════════════════════════════════

const sseClients = [];

app.get("/api/live", (req, res) => {
  const token = req.query.token;

  if (!token) return res.status(401).json({ message: "No token" });

  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Connection", "keep-alive");

  sseClients.push(res);
});

// ════════════════════════════════════════════════════════════════════
// POLLING
// ════════════════════════════════════════════════════════════════════

const lastSeenTime = {};

async function pollForNewReadings() {
  try {
    const devices = await Telemetry.distinct("deviceId");

    for (const id of devices) {
      const doc = await Telemetry.findOne({ deviceId: id }).sort({ time: -1 });

      if (!doc) continue;

      const time = new Date(doc.time).getTime();

      if (lastSeenTime[id] !== time) {
        lastSeenTime[id] = time;

        sseClients.forEach((c) => {
          c.write(`data: ${JSON.stringify(doc)}\n\n`);
        });
      }
    }
  } catch (err) {
    console.error("Polling error:", err.message);
  }
}

function startPolling() {
  console.log("🔄 Polling started...");
  setInterval(pollForNewReadings, 7000);
}

// ════════════════════════════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════════════════════════════

app.post("/api/auth/login", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) return res.status(401).json({ error: "User not found" });

  if (!user.role || user.role === "pending") {
    return res.status(403).json({
      error: "Your account is pending admin approval. Please wait for device and role assignment.",
    });
  }

  const match = await bcrypt.compare(req.body.password, user.password);

  if (!match) return res.status(401).json({ error: "Wrong password" });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

  res.json({ user: sanitizeUser(user), token });
});

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "pending",
      deviceId: "",
    });

    res.status(201).json({
      success: true,
      message: "Account created. An admin will assign your role and chamber before login.",
      user: sanitizeUser(user),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/users", auth, async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const users = await User.find({}).sort({ email: 1 });
    res.json(users.map(sanitizeUser));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/admin/users/:id", auth, async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const { role, deviceId } = req.body;
    const updates = {};

    if (role) {
      if (!["pending", "user", "admin"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }
      updates.role = role;
    }

    if (deviceId !== undefined) {
      updates.deviceId = deviceId;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, user: sanitizeUser(updatedUser) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/chamber-profiles", auth, async (req, res) => {
  try {
    const profiles = await ChamberProfile.find({}).sort({ updatedAt: -1, name: 1 }).lean();
    res.json(profiles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/chamber-profiles", auth, async (req, res) => {
  try {
    const { name, description = "", relays } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "Profile name is required" });
    }

    if (!relays || typeof relays !== "object") {
      return res.status(400).json({ error: "Profile relays are required" });
    }

    const profile = await ChamberProfile.create({
      name: String(name).trim(),
      description: String(description || "").trim(),
      relays,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    res.status(201).json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/api/chamber-profiles/:id", auth, async (req, res) => {
  try {
    const updates = {};

    if (req.body.name !== undefined) {
      if (!String(req.body.name).trim()) {
        return res.status(400).json({ error: "Profile name is required" });
      }
      updates.name = String(req.body.name).trim();
    }

    if (req.body.description !== undefined) {
      updates.description = String(req.body.description || "").trim();
    }

    if (req.body.relays !== undefined) {
      if (!req.body.relays || typeof req.body.relays !== "object") {
        return res.status(400).json({ error: "Profile relays are required" });
      }
      updates.relays = req.body.relays;
    }

    updates.updatedBy = req.user.id;

    const profile = await ChamberProfile.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/chamber-profiles/:id", auth, async (req, res) => {
  try {
    const deleted = await ChamberProfile.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: "Profile not found" });
    }

    res.json({ success: true, profileId: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════
// SENSOR ROUTES (RESTORED)
// ════════════════════════════════════════════════════════════════════
app.get("/", (req, res) => {
  res.send("Server is running ✅");
});

app.get("/api/devices", auth, async (req, res) => {
  const devices = await Telemetry.distinct("deviceId");
  res.json(devices);
});

app.get("/api/sensors/latest/:deviceId", auth, async (req, res) => {
  const data = await Telemetry.findOne({ deviceId: req.params.deviceId }).sort({
    time: -1,
  });
  res.json(data);
});

app.get("/api/sensors/history/:deviceId", auth, async (req, res) => {
  try {
    const limit = Number.parseInt(req.query.limit, 10);
    const days = Number.parseInt(req.query.days, 10);
    const query = { deviceId: req.params.deviceId };

    if (Number.isFinite(days) && days > 0) {
      // Use whole calendar days instead of a strict rolling 72-hour window,
      // so "last 3 days" still includes records from the start of the third day.
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      since.setDate(since.getDate() - days);
      query.time = { $gte: since };
    }

    let telemetryQuery = Telemetry.find(query).sort({ time: -1 });

    if (Number.isFinite(limit) && limit > 0) {
      telemetryQuery = telemetryQuery.limit(limit);
    }

    const data = await telemetryQuery;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ THIS IS THE IMPORTANT ONE (RESTORED EXACT WORKING LOGIC)
app.get("/api/sensors/all-latest", auth, async (req, res) => {
  try {
    const deviceIds = await Telemetry.distinct("deviceId");

    const results = await Promise.all(
      deviceIds.map((id) =>
        Telemetry.findOne({ deviceId: id }).sort({ time: -1 })
      )
    );

    res.json(results.filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════════════════

app.get("/api/config/:deviceId", async (req, res) => {
  const config = await Config.findOne({ deviceId: req.params.deviceId });

  if (!config) {
    return res.json({
      deviceId: req.params.deviceId,
      relays: {},
    });
  }

  res.json(config);
});
// ✅ RESTORE THIS (VERY IMPORTANT)
app.post("/api/config/:deviceId", auth, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { relays, profileId = "", profileName = "" } = req.body;

    if (!relays || typeof relays !== "object") {
      return res.status(400).json({ error: "Invalid config: relays required" });
    }

    const config = await Config.findOneAndUpdate(
      { deviceId },
      {
        deviceId,
        relays,
        profileId: profileId || "",
        profileName: profileName || "",
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );
    await updateShadow(deviceId, config);

    console.log(`⚙️ Config saved for ${deviceId}`);

    res.json({ success: true, config });
  } catch (err) {
    console.error("❌ Config save error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════
// FIRMWARE
// ════════════════════════════════════════════════════════════════════

const EVIDENCE_MODELS = {
  chamber: ImageRecord,
  outer: OuterEnvironmentImageRecord,
};

function getEvidenceCategory(value) {
  return value === "outer" ? "outer" : "chamber";
}

function getEvidenceModel(category) {
  return EVIDENCE_MODELS[getEvidenceCategory(category)];
}

async function assignLegacyChamberEvidenceToButtonMushroom() {
  const buttonProfile = await ChamberProfile.findOne({
    name: { $regex: /^button mushroom$/i },
  })
    .select("_id name")
    .lean();

  if (!buttonProfile?._id) {
    return null;
  }

  await ImageRecord.updateMany(
    {
      $or: [
        { profileId: { $exists: false } },
        { profileId: "" },
      ],
    },
    {
      $set: {
        profileId: String(buttonProfile._id),
        profileName: buttonProfile.name || "Button Mushroom",
      },
    }
  );

  return buttonProfile;
}

async function resolveEvidenceProfile({ category, profileId, profileName }) {
  if (category === "chamber") {
    await assignLegacyChamberEvidenceToButtonMushroom();
  }

  if (profileId) {
    const profile = await ChamberProfile.findById(profileId).select("_id name").lean();
    if (!profile) {
      throw new Error("Selected profile was not found");
    }

    return {
      profileId: String(profile._id),
      profileName: profile.name || profileName || "",
    };
  }

  if (profileName) {
    const profile = await ChamberProfile.findOne({ name: profileName }).select("_id name").lean();
    if (profile?._id) {
      return {
        profileId: String(profile._id),
        profileName: profile.name || profileName,
      };
    }
  }

  return { profileId: "", profileName: profileName || "" };
}

function buildImageResponse(doc, category = "chamber") {
  return {
    _id: doc._id,
    deviceId: doc.deviceId,
    category: getEvidenceCategory(category),
    fileName: doc.fileName,
    contentType: doc.contentType,
    uploadedAt: doc.uploadedAt,
    attachmentMode: doc.attachmentMode || "automatic",
    selectedDate: doc.selectedDate || "",
    profileId: doc.profileId || "",
    profileName: doc.profileName || "",
    telemetry: doc.telemetry || null,
    imagePath: `/api/evidence/${doc.deviceId}/${doc._id}/file?category=${getEvidenceCategory(category)}`,
  };
}

function parseOptionalNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildManualOuterTelemetry(body, uploadedAt) {
  const temperature = parseOptionalNumber(body.manualTemperature);
  const humidity = parseOptionalNumber(body.manualHumidity);

  if (temperature === null || humidity === null) {
    throw new Error("Temperature and humidity are required for outer environment evidence");
  }

  const recordedAt = body.manualRecordedAt ? new Date(body.manualRecordedAt) : uploadedAt;
  const time = Number.isNaN(recordedAt.getTime()) ? uploadedAt : recordedAt;

  return {
    temperature,
    humidity,
    time,
    source: "manual",
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatTelemetryValue(value) {
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

function buildEvidenceExportHtml({ category, deviceId, profileName, items }) {
  const scopeLabel = category === "outer" ? "Outer Environment" : "Chamber";
  const title = `${deviceId} ${scopeLabel}${profileName ? ` - ${profileName}` : ""} Evidence Report`;
  const cards = items.map((item) => {
    const imageSrc = item.imageData
      ? `data:${item.contentType || "image/jpeg"};base64,${item.imageData.toString("base64")}`
      : "";
    const telemetry = item.telemetry || {};

    return `
      <section class="card">
        <div class="hero">
          ${imageSrc ? `<img src="${imageSrc}" alt="${escapeHtml(item.fileName || "Evidence image")}" />` : `<div class="empty">No image data</div>`}
        </div>
        <div class="content">
          <h2>${escapeHtml(item.fileName || "Evidence image")}</h2>
          <p class="meta"><strong>Profile:</strong> ${escapeHtml(item.profileName || "Unassigned")}</p>
          <p class="meta"><strong>Uploaded:</strong> ${escapeHtml(new Date(item.uploadedAt).toLocaleString())}</p>
          <p class="meta"><strong>Attachment mode:</strong> ${escapeHtml(item.attachmentMode || "automatic")}${item.selectedDate ? ` (${escapeHtml(item.selectedDate)})` : ""}</p>
          <p class="meta"><strong>Matched telemetry time:</strong> ${telemetry.time ? escapeHtml(new Date(telemetry.time).toLocaleString()) : "No telemetry matched"}</p>
          <table>
            <tbody>
              <tr><th>Temperature</th><td>${escapeHtml(formatTelemetryValue(telemetry.temperature))}</td></tr>
              <tr><th>Humidity</th><td>${escapeHtml(formatTelemetryValue(telemetry.humidity))}</td></tr>
              <tr><th>Soil</th><td>${escapeHtml(formatTelemetryValue(telemetry.soil))}</td></tr>
              <tr><th>Soil Status</th><td>${escapeHtml(formatTelemetryValue(telemetry.soilStatus))}</td></tr>
              <tr><th>Light</th><td>${escapeHtml(formatTelemetryValue(telemetry.light))}</td></tr>
              <tr><th>Fan</th><td>${escapeHtml(formatTelemetryValue(telemetry.fan))}</td></tr>
              <tr><th>Motor</th><td>${escapeHtml(formatTelemetryValue(telemetry.motor))}</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: Arial, sans-serif; background: #07110a; color: #e8f5e9; margin: 0; padding: 32px; }
      h1 { margin: 0 0 8px; font-size: 30px; }
      .sub { color: #9db5a2; margin-bottom: 28px; }
      .card { border: 1px solid rgba(74, 222, 128, 0.18); border-radius: 20px; overflow: hidden; margin-bottom: 24px; background: #0b1710; }
      .hero { background: #050b07; padding: 18px; text-align: center; }
      .hero img { max-width: 100%; max-height: 420px; border-radius: 14px; }
      .empty { padding: 48px 16px; color: #9db5a2; }
      .content { padding: 22px; }
      .meta { margin: 6px 0; color: #cde7d2; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th, td { border: 1px solid rgba(74, 222, 128, 0.12); padding: 10px 12px; text-align: left; }
      th { width: 180px; color: #8fe6ad; background: rgba(74, 222, 128, 0.06); }
      td { color: #e8f5e9; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <div class="sub">${escapeHtml(String(items.length))} evidence item(s) exported on ${escapeHtml(new Date().toLocaleString())}</div>
    ${cards || "<p>No evidence items found.</p>"}
  </body>
</html>`;
}

async function findNearestTelemetry(deviceId, targetTime) {
  const [before, after] = await Promise.all([
    Telemetry.findOne({ deviceId, time: { $lte: targetTime } }).sort({ time: -1 }).lean(),
    Telemetry.findOne({ deviceId, time: { $gte: targetTime } }).sort({ time: 1 }).lean(),
  ]);

  if (!before) return after || null;
  if (!after) return before || null;

  const beforeDiff = Math.abs(new Date(before.time).getTime() - targetTime.getTime());
  const afterDiff = Math.abs(new Date(after.time).getTime() - targetTime.getTime());

  return beforeDiff <= afterDiff ? before : after;
}

async function findNearestTelemetryForSelectedDate(deviceId, selectedDate, uploadTime) {
  const baseDate = new Date(selectedDate);

  if (Number.isNaN(baseDate.getTime())) {
    throw new Error("Invalid selected date");
  }

  const dayStart = new Date(baseDate);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const targetTime = new Date(dayStart);
  targetTime.setHours(
    uploadTime.getHours(),
    uploadTime.getMinutes(),
    uploadTime.getSeconds(),
    uploadTime.getMilliseconds()
  );

  const [before, after] = await Promise.all([
    Telemetry.findOne({
      deviceId,
      time: { $gte: dayStart, $lt: dayEnd, $lte: targetTime },
    }).sort({ time: -1 }).lean(),
    Telemetry.findOne({
      deviceId,
      time: { $gte: dayStart, $lt: dayEnd, $gte: targetTime },
    }).sort({ time: 1 }).lean(),
  ]);

  if (!before) return after || null;
  if (!after) return before || null;

  const beforeDiff = Math.abs(new Date(before.time).getTime() - targetTime.getTime());
  const afterDiff = Math.abs(new Date(after.time).getTime() - targetTime.getTime());

  return beforeDiff <= afterDiff ? before : after;
}

const multer = require("multer");
const fs = require("fs");
const os = require("os");

const upload = multer({ dest: os.tmpdir() });
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION,
});

app.get("/api/evidence/:deviceId", auth, async (req, res) => {
  try {
    const category = getEvidenceCategory(req.query.category);
    const EvidenceModel = getEvidenceModel(category);
    const profile = await resolveEvidenceProfile({
      category,
      profileId: req.query.profileId || "",
      profileName: req.query.profileName || "",
    });
    const limit = Math.min(
      30,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 6)
    );
    const skip = Math.max(0, Number.parseInt(req.query.skip, 10) || 0);
    const query = { deviceId: req.params.deviceId };
    if (profile.profileId) {
      query.profileId = profile.profileId;
    }

    const [images, total] = await Promise.all([
      EvidenceModel.find(query)
        .select("_id deviceId fileName contentType uploadedAt attachmentMode selectedDate profileId profileName telemetry")
        .sort({ uploadedAt: -1 })
        .skip(skip)
        .limit(limit)
        .allowDiskUse(true)
        .lean(),
      EvidenceModel.countDocuments(query),
    ]);

    res.json({
      items: images.map((image) => buildImageResponse(image, category)),
      total,
      hasMore: skip + images.length < total,
      nextSkip: skip + images.length,
      category,
      profile,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/evidence/:deviceId/export", auth, async (req, res) => {
  try {
    const category = getEvidenceCategory(req.query.category);
    const EvidenceModel = getEvidenceModel(category);
    const profile = await resolveEvidenceProfile({
      category,
      profileId: req.query.profileId || "",
      profileName: req.query.profileName || "",
    });
    const query = { deviceId: req.params.deviceId };
    if (profile.profileId) {
      query.profileId = profile.profileId;
    }
    const items = await EvidenceModel.find(query)
      .select("deviceId fileName contentType imageData uploadedAt attachmentMode selectedDate profileId profileName telemetry")
      .sort({ uploadedAt: -1 })
      .allowDiskUse(true);

    const html = buildEvidenceExportHtml({
      category,
      deviceId: req.params.deviceId,
      profileName: profile.profileName,
      items,
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${req.params.deviceId}-${category}-evidence-report.html"`
    );
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/evidence/:deviceId/:imageId/file", auth, async (req, res) => {
  try {
    const category = getEvidenceCategory(req.query.category);
    const EvidenceModel = getEvidenceModel(category);
    const image = await EvidenceModel.findOne({
      _id: req.params.imageId,
      deviceId: req.params.deviceId,
    }).select("fileName contentType imageData");

    if (!image || !image.imageData) {
      return res.status(404).json({ error: "Evidence image not found" });
    }

    res.setHeader("Content-Type", image.contentType || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${image.fileName || "evidence-image"}"`);
    res.setHeader("Cache-Control", "private, max-age=300");
    res.send(image.imageData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/evidence/:deviceId", auth, imageUpload.single("image"), async (req, res) => {
  try {
    const { deviceId } = req.params;
    const category = getEvidenceCategory(req.body.category);
    const EvidenceModel = getEvidenceModel(category);
    const requestedAttachmentMode = req.body.attachmentMode === "custom" ? "custom" : "automatic";
    const profile = await resolveEvidenceProfile({
      category,
      profileId: req.body.profileId || "",
      profileName: req.body.profileName || "",
    });

    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    if (!profile.profileId) {
      return res.status(400).json({ error: "Select a mushroom profile before uploading evidence" });
    }

    if (!req.file.mimetype?.startsWith("image/")) {
      return res.status(400).json({ error: "Only image uploads are allowed" });
    }

    const uploadedAt = new Date();
    const attachmentMode = category === "outer" ? "manual" : requestedAttachmentMode;
    const selectedDate = category === "chamber" ? (req.body.selectedDate || "") : "";
    const telemetry = category === "outer"
      ? buildManualOuterTelemetry(req.body, uploadedAt)
      : attachmentMode === "custom"
        ? await findNearestTelemetryForSelectedDate(deviceId, selectedDate, uploadedAt)
        : await findNearestTelemetry(deviceId, uploadedAt);

    const imageRecord = await EvidenceModel.create({
      deviceId,
      fileName: req.file.originalname,
      contentType: req.file.mimetype,
      imageData: req.file.buffer,
      uploadedAt,
      attachmentMode,
      selectedDate,
      profileId: profile.profileId,
      profileName: profile.profileName,
      telemetry,
    });

    res.json({
      success: true,
      image: buildImageResponse(imageRecord, category),
    });
  } catch (err) {
    console.error("Image upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/evidence/:deviceId/:imageId", auth, async (req, res) => {
  try {
    const category = getEvidenceCategory(req.query.category);
    const EvidenceModel = getEvidenceModel(category);
    const deleted = await EvidenceModel.findOneAndDelete({
      _id: req.params.imageId,
      deviceId: req.params.deviceId,
    });

    if (!deleted) {
      return res.status(404).json({ error: "Evidence image not found" });
    }

    res.json({ success: true, imageId: req.params.imageId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/images/:deviceId", auth, async (req, res) => {
  try {
    const limit = Math.min(30, Math.max(1, Number.parseInt(req.query.limit, 10) || 6));
    const skip = Math.max(0, Number.parseInt(req.query.skip, 10) || 0);
    const query = { deviceId: req.params.deviceId };

    const [images, total] = await Promise.all([
      ImageRecord.find(query)
        .select("_id deviceId fileName contentType uploadedAt attachmentMode selectedDate telemetry")
        .sort({ uploadedAt: -1 })
        .skip(skip)
        .limit(limit)
        .allowDiskUse(true)
        .lean(),
      ImageRecord.countDocuments(query),
    ]);

    res.json({
      items: images.map((image) => buildImageResponse(image, "chamber")),
      total,
      hasMore: skip + images.length < total,
      nextSkip: skip + images.length,
      category: "chamber",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/images/:deviceId/:imageId/file", auth, async (req, res) => {
  try {
    const image = await ImageRecord.findOne({
      _id: req.params.imageId,
      deviceId: req.params.deviceId,
    }).select("fileName contentType imageData");

    if (!image || !image.imageData) {
      return res.status(404).json({ error: "Evidence image not found" });
    }

    res.setHeader("Content-Type", image.contentType || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${image.fileName || "evidence-image"}"`);
    res.setHeader("Cache-Control", "private, max-age=300");
    res.send(image.imageData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/images/:deviceId", auth, imageUpload.single("image"), async (req, res) => {
  try {
    const { deviceId } = req.params;
    const attachmentMode = req.body.attachmentMode === "custom" ? "custom" : "automatic";
    const selectedDate = req.body.selectedDate || "";

    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    if (!req.file.mimetype?.startsWith("image/")) {
      return res.status(400).json({ error: "Only image uploads are allowed" });
    }

    const uploadedAt = new Date();
    const telemetry = attachmentMode === "custom"
      ? await findNearestTelemetryForSelectedDate(deviceId, selectedDate, uploadedAt)
      : await findNearestTelemetry(deviceId, uploadedAt);

    const imageRecord = await ImageRecord.create({
      deviceId,
      fileName: req.file.originalname,
      contentType: req.file.mimetype,
      imageData: req.file.buffer,
      uploadedAt,
      attachmentMode,
      selectedDate,
      telemetry,
    });

    res.json({
      success: true,
      image: buildImageResponse(imageRecord, "chamber"),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/images/:deviceId/:imageId", auth, async (req, res) => {
  try {
    const deleted = await ImageRecord.findOneAndDelete({
      _id: req.params.imageId,
      deviceId: req.params.deviceId,
    });

    if (!deleted) {
      return res.status(404).json({ error: "Evidence image not found" });
    }

    res.json({ success: true, imageId: req.params.imageId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(
  "/api/firmware/upload",
  auth,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      console.log("🔥 S3 UPLOAD STARTED");

      const fileContent = fs.readFileSync(req.file.path);
      const fileName = `firmware/esp32_${Date.now()}.bin`;

      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileName,
        Body: fileContent,
        ContentType: "application/octet-stream",
      };

      const data = await s3.upload(params).promise();

      const firmwareUrl = data.Location;

      const { deviceId } = req.body;
      if (!deviceId) {
        return res.status(400).json({ error: "deviceId required" });
      }

      const updated = await Config.findOneAndUpdate(
        { deviceId },
        {
          firmware: {
            version: fileName,
            url: firmwareUrl,
            updatedAt: new Date(),
          },
        },
        { new: true, upsert: true }
      );

      fs.unlinkSync(req.file.path);

      console.log("🔥 DB UPDATED:", updated.firmware);
      await updateShadow(deviceId, updated);

      res.json({
        success: true,
        version: fileName,
        url: firmwareUrl,
      });
    } catch (err) {
      console.error("❌ Upload error:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ════════════════════════════════════════════════════════════════════
// HEALTH
app.get("/health", (req, res) => {
  res.send("OK");
});
// ════════════════════════════════════════════════════════════════════
app.get("/api/firmware/info", async (req, res) => {
  const config = await Config.findOne({ deviceId: "chamber-001" });

  if (!config?.firmware) {
    return res.json({ version: null, url: null });
  }

  res.json(config.firmware);
});

const iotdata = new AWS.IotData({
  endpoint: process.env.AWS_IOT_ENDPOINT, // ⚠️ REQUIRED
});

async function updateShadow(deviceId, config) {
  try {
    const params = {
      thingName: deviceId,
      payload: JSON.stringify({
        state: {
          desired: {
            relays: config.relays || {},
            firmware: config.firmware || {},
          },
        },
      }),
    };

    await iotdata.updateThingShadow(params).promise();

    console.log(`☁️ Shadow updated for ${deviceId}`);
  } catch (err) {
    console.error("❌ Shadow update error:", err.message);
  }
}

// ════════════════════════════════════════════════════════════════════
// START
// ════════════════════════════════════════════════════════════════════
