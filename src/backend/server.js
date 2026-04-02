// ── server.js ────────────────────────────────────────────────────────

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const path = require("path");

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
app.use(
  cors({
    origin: ["https://growio-eight.vercel.app"],
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
  },
  {
    collection: "configs", // 🔥 FORCE CORRECT COLLECTION
  }
);

const Config = mongoose.model("Config", configSchema);

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

  const match = await bcrypt.compare(req.body.password, user.password);

  if (!match) return res.status(401).json({ error: "Wrong password" });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

  res.json({ user, token });
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
  const data = await Telemetry.find({ deviceId: req.params.deviceId })
    .sort({ time: -1 })
    .limit(30);
  res.json(data);
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
    const { relays } = req.body;

    if (!relays || typeof relays !== "object") {
      return res.status(400).json({ error: "Invalid config: relays required" });
    }

    const config = await Config.findOneAndUpdate(
      { deviceId },
      {
        deviceId,
        relays,
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
const AWS = require("aws-sdk");
const multer = require("multer");
const fs = require("fs");
const os = require("os");

const upload = multer({ dest: os.tmpdir() });

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION,
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
