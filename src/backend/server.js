// ── server.js ────────────────────────────────────────────────────────
// Database   : chamberDB
// Collections: telemetry, users
//
// telemetry fields : deviceId, temperature, humidity, time
// users fields     : name, email, password, role, deviceId, createdAt
//
// Run: node server.js

const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");
const dotenv   = require("dotenv");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ── MongoDB Connection ───────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 })
  .then(() => {
    console.log("✅ Connected to chamberDB");
    startChangeStream();
  })
  .catch((err) => console.error("❌ MongoDB error:", err.message));

// ── Telemetry Schema ─────────────────────────────────────────────────
// Exact fields from your DB:
// { deviceId, temperature, humidity, time, _id }
const telemetrySchema = new mongoose.Schema(
  {
    deviceId:    String,
    temperature: Number,
    humidity:    Number,
    time:        Date,
  },
  { collection: "telemetry", strict: false }
);
const Telemetry = mongoose.model("Telemetry", telemetrySchema);

// ── User Schema ──────────────────────────────────────────────────────
// Exact fields from your DB:
// { name, email, password, role, deviceId, createdAt, _id }
const userSchema = new mongoose.Schema(
  {
    name:      String,
    email:     { type: String, unique: true },
    password:  String,
    role:      { type: String, enum: ["user", "admin"] },
    deviceId:  String,   // null for admin, "chamber-001" for users
    createdAt: Date,
  },
  { collection: "users", strict: false }
);
const User = mongoose.model("User", userSchema);

// ════════════════════════════════════════════════════════════════════
// SSE — Real-time push to frontend
// ════════════════════════════════════════════════════════════════════
const sseClients = [];

// Frontend connects here once — stays open forever receiving live data
app.get("/api/live", (req, res) => {
  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");
  res.flushHeaders();

  // Confirm connection immediately
  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

  sseClients.push(res);
  console.log(`📡 SSE client connected. Total: ${sseClients.length}`);

  req.on("close", () => {
    const i = sseClients.indexOf(res);
    if (i !== -1) sseClients.splice(i, 1);
    console.log(`📡 SSE disconnected. Total: ${sseClients.length}`);
  });
});

function pushToAllClients(data) {
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((c) => { try { c.write(msg); } catch (_) {} });
}

// ── MongoDB Change Stream ────────────────────────────────────────────
// Fires instantly when IoT pushes a new document to telemetry
function startChangeStream() {
  try {
    const stream = Telemetry.watch(
      [{ $match: { operationType: "insert" } }],
      { fullDocument: "updateLookup" }
    );
    stream.on("change", (change) => {
      const doc = change.fullDocument;
      console.log(`⚡ New reading → deviceId: ${doc.deviceId} | temp: ${doc.temperature} | humidity: ${doc.humidity} | time: ${doc.time}`);
      pushToAllClients({ type: "new_reading", data: doc });
    });
    stream.on("error", (e) => console.error("Change stream error:", e.message));
    console.log("👀 Watching telemetry collection for new inserts...");
  } catch (e) {
    console.error("Could not start change stream:", e.message);
  }
}

// ════════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ════════════════════════════════════════════════════════════════════

// POST /api/auth/login
// Matches user by email + password, returns user object with deviceId
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email, password: password }).lean();

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    console.log(`🔐 Login: ${user.email} [${user.role}] deviceId: ${user.deviceId}`);

    res.json({
      user: {
        id:       user._id,
        name:     user.name,
        email:    user.email,
        role:     user.role,
        deviceId: user.deviceId ?? null,
      },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/signup
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Auto-assign first available device to new users
    let assignedDevice = null;
    if (role === "user") {
      const devices = await Telemetry.distinct("deviceId");
      assignedDevice = devices.length > 0 ? devices[0] : null;
    }

    const newUser = await User.create({
      name,
      email,
      password,
      role,
      deviceId:  assignedDevice,
      createdAt: new Date(),
    });

    console.log(`✅ Signup: ${newUser.email} [${newUser.role}] deviceId: ${newUser.deviceId}`);

    res.json({
      user: {
        id:       newUser._id,
        name:     newUser.name,
        email:    newUser.email,
        role:     newUser.role,
        deviceId: newUser.deviceId ?? null,
      },
    });
  } catch (err) {
    console.error("Signup error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════
// SENSOR ROUTES
// ════════════════════════════════════════════════════════════════════

// GET /api/devices
// Returns all unique deviceIds  →  ["chamber-001"]
app.get("/api/devices", async (req, res) => {
  try {
    const devices = await Telemetry.distinct("deviceId");
    console.log("Devices:", devices);
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sensors/latest/:deviceId
// Returns most recent single doc for one device
// e.g. GET /api/sensors/latest/chamber-001
app.get("/api/sensors/latest/:deviceId", async (req, res) => {
  try {
    const { deviceId } = req.params;
    console.log(`Fetching latest for: ${deviceId}`);

    const doc = await Telemetry
      .findOne({ deviceId: deviceId })
      .sort({ time: -1 })
      .lean();

    if (!doc) {
      console.log(`No data found for deviceId: ${deviceId}`);
      return res.status(404).json({ error: `No data found for device: ${deviceId}` });
    }

    console.log(`Latest reading: temp=${doc.temperature} humidity=${doc.humidity} time=${doc.time}`);
    res.json(doc);
  } catch (err) {
    console.error("Latest error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sensors/history/:deviceId?limit=30
// Returns last N readings for chart
app.get("/api/sensors/history/:deviceId", async (req, res) => {
  try {
    const { deviceId } = req.params;
    const limit = parseInt(req.query.limit) || 30;

    const docs = await Telemetry
      .find({ deviceId: deviceId })
      .sort({ time: -1 })
      .limit(limit)
      .lean();

    console.log(`History for ${deviceId}: ${docs.length} docs`);
    res.json(docs.reverse()); // oldest → newest for chart
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sensors/all-latest
// Admin only: latest reading from EVERY device
app.get("/api/sensors/all-latest", async (req, res) => {
  try {
    const deviceIds = await Telemetry.distinct("deviceId");
    console.log("All device IDs:", deviceIds);

    const results = await Promise.all(
      deviceIds.map((id) =>
        Telemetry.findOne({ deviceId: id }).sort({ time: -1 }).lean()
      )
    );

    res.json(results.filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════
// UTILITY ROUTES
// ════════════════════════════════════════════════════════════════════

// GET /api/health  — check if server + DB are running
app.get("/api/health", (_, res) => {
  res.json({
    status: "ok",
    db:     mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    sseClients: sseClients.length,
  });
});

// GET /api/debug  — see raw docs (useful during development)
app.get("/api/debug", async (req, res) => {
  try {
    const telemetry = await Telemetry.find({}).sort({ time: -1 }).limit(3).lean();
    const users     = await User.find({}).lean();
    res.json({ telemetry, users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("─────────────────────────────────────────");
  console.log(`🚀 Server   → http://localhost:${PORT}`);
  console.log(`🔍 Debug    → http://localhost:${PORT}/api/debug`);
  console.log(`❤️  Health   → http://localhost:${PORT}/api/health`);
  console.log(`📡 SSE Live → http://localhost:${PORT}/api/live`);
  console.log("─────────────────────────────────────────");
});