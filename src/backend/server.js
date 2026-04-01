// ── server.js ────────────────────────────────────────────────────────
// Database   : chamberDB
// Collections: telemetry, users, configs
//
// Run: node server.js

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const auth = require("./middleware/auth");

dotenv.config();

const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000", "https://your-frontend.vercel.app"],
    credentials: true,
  })
);
app.use(express.json());

// ── MongoDB Connection (single, fixed) ────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 })
  .then(() => {
    console.log("✅ Connected to chamberDB");
    startPolling();
  })
  .catch((err) => console.error("❌ MongoDB error:", err.message));

// ── Telemetry Schema ──────────────────────────────────────────────────
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

// ── User Schema ───────────────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, enum: ["user", "admin"] },
    deviceId: String,
    createdAt: Date,
  },
  { collection: "users", strict: false }
);
const User = mongoose.model("User", userSchema);

// ── Config Schema ─────────────────────────────────────────────────────
// ── Validation helpers ────────────────────────────────────────────────
const VALID_PARAMETERS = ["temperature", "humidity", "soil", "soilStatus"];
const VALID_OPERATORS = ["<", ">", "==", "<=", ">="];
const STRING_PARAMETERS = ["soilStatus"];

function validateConditions(conditions) {
  if (!Array.isArray(conditions) || conditions.length === 0)
    return "conditions must be a non-empty array";

  for (let i = 0; i < conditions.length; i++) {
    const c = conditions[i];
    if (!VALID_PARAMETERS.includes(c.parameter))
      return `condition[${i}]: invalid parameter "${
        c.parameter
      }". Valid: ${VALID_PARAMETERS.join(", ")}`;
    if (!VALID_OPERATORS.includes(c.operator))
      return `condition[${i}]: invalid operator "${
        c.operator
      }". Valid: ${VALID_OPERATORS.join(", ")}`;
    if (STRING_PARAMETERS.includes(c.parameter)) {
      if (typeof c.value !== "string" || c.value.trim() === "")
        return `condition[${i}]: parameter "${c.parameter}" requires a non-empty string value`;
    } else {
      if (typeof c.value !== "number" || isNaN(c.value))
        return `condition[${i}]: parameter "${c.parameter}" requires a numeric value`;
    }
  }
  return null;
}

function validateRelays(relays) {
  for (const key of ["fan", "motor", "light"]) {
    const relay = relays[key];
    if (!relay) return `missing relay definition for "${key}"`;
    if (typeof relay.enabled !== "boolean")
      return `relay "${key}": enabled must be boolean`;
    if (!["AND", "OR"].includes(relay.logic))
      return `relay "${key}": logic must be "AND" or "OR"`;
    const err = validateConditions(relay.conditions);
    if (err) return `relay "${key}": ${err}`;
  }
  return null;
}

// ── Config Schema ─────────────────────────────────────────────────────
// Uses Mixed so Mongoose never casts/strips the conditions[] array.
// Raw reads go through mongoose.connection.db (native driver) to guarantee
// the exact document shape stored in MongoDB is returned — no silent field drops.
const configSchema = new mongoose.Schema(
  {
    deviceId: { type: String, unique: true, required: true },
    relays: { type: mongoose.Schema.Types.Mixed, default: {} },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: "configs", strict: false }
);
const Config = mongoose.model("Config", configSchema);

// ════════════════════════════════════════════════════════════════════
// SSE — Real-time push to frontend
// ════════════════════════════════════════════════════════════════════
const sseClients = [];

app.get("/api/live", (req, res) => {
  const token = req.query.token;

  // ❌ No token
  if (!token) {
    return res.status(401).json({ message: "No token" });
  }

  // ❌ Invalid token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // optional
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }

  // ✅ SSE setup
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

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
  sseClients.forEach((c) => {
    try {
      c.write(msg);
    } catch (_) {}
  });
}

// ── Polling (time-series collections don't support change streams) ────
// Tracks the latest document seen per device to detect new inserts.
const lastSeenTime = {};

async function pollForNewReadings() {
  try {
    // Get the single most-recent doc per device
    const deviceIds = await Telemetry.distinct("deviceId");

    for (const deviceId of deviceIds) {
      const doc = await Telemetry.findOne({ deviceId })
        .sort({ time: -1 })
        .lean();

      if (!doc) continue;

      const docTime = new Date(doc.time).getTime();
      const prev = lastSeenTime[deviceId];

      if (prev === undefined) {
        // First poll — just record baseline, don't push
        lastSeenTime[deviceId] = docTime;
        continue;
      }

      if (docTime > prev) {
        lastSeenTime[deviceId] = docTime;
        console.log(
          `⚡ New reading → ${doc.deviceId} | temp: ${doc.temperature} | hum: ${doc.humidity} | soil: ${doc.soil}`
        );
        pushToAllClients({ type: "new_reading", data: doc });
      }
    }
  } catch (e) {
    console.error("Poll error:", e.message);
  }
}

function startPolling(intervalMs = 3000) {
  console.log(
    `🔄 Polling telemetry every ${intervalMs / 1000}s (time-series collection)`
  );
  // Seed the baseline immediately, then start the interval
  pollForNewReadings().then(() => {
    setInterval(pollForNewReadings, intervalMs);
  });
}

// ════════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ════════════════════════════════════════════════════════════════════

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).lean();
    if (!user) return res.status(401).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    console.log(`🔐 Login: ${user.email} [${user.role}]`);
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        deviceId: user.deviceId ?? null,
      },
      token,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ error: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    let assignedDevice = null;
    if (role === "user") {
      const devices = await Telemetry.distinct("deviceId");
      assignedDevice = devices.length > 0 ? devices[0] : null;
    }

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      deviceId: assignedDevice,
      createdAt: new Date(),
    });

    // ✅ Return token on signup (same as login)
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    console.log(`✅ Signup: ${newUser.email} [${newUser.role}]`);
    res.json({
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        deviceId: newUser.deviceId ?? null,
      },
      token,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════
// SENSOR ROUTES
// ════════════════════════════════════════════════════════════════════

app.get("/api/devices", auth, async (req, res) => {
  try {
    const devices = await Telemetry.distinct("deviceId");
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/sensors/latest/:deviceId", auth, async (req, res) => {
  try {
    const doc = await Telemetry.findOne({ deviceId: req.params.deviceId })
      .sort({ time: -1 })
      .lean();
    if (!doc)
      return res
        .status(404)
        .json({ error: `No data for device: ${req.params.deviceId}` });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/sensors/history/:deviceId", auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    const docs = await Telemetry.find({ deviceId: req.params.deviceId })
      .sort({ time: -1 })
      .limit(limit)
      .lean();
    res.json(docs.reverse());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/sensors/all-latest", auth, async (req, res) => {
  try {
    const deviceIds = await Telemetry.distinct("deviceId");
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
// CONFIG ROUTES
// ════════════════════════════════════════════════════════════════════

// GET /api/config/:deviceId
// Uses native MongoDB driver (not Mongoose) so the raw document is returned
// exactly as stored — no schema casting, no silent field drops.
app.get("/api/config/:deviceId", auth, async (req, res) => {
  try {
    const { deviceId } = req.params;

    // Native driver query — returns the BSON document exactly as MongoDB stores it
    const raw = await mongoose.connection.db
      .collection("configs")
      .findOne({ deviceId });

    if (!raw) {
      // No saved config → return hardcoded defaults (not persisted)
      return res.json({
        deviceId,
        relays: {
          fan: {
            enabled: true,
            logic: "AND",
            conditions: [
              { parameter: "temperature", operator: ">", value: 30 },
            ],
          },
          motor: {
            enabled: true,
            logic: "AND",
            conditions: [{ parameter: "soil", operator: ">", value: 1400 }],
          },
          light: {
            enabled: true,
            logic: "AND",
            conditions: [
              { parameter: "temperature", operator: "<", value: 34 },
            ],
          },
        },
      });
    }

    // Migrate old flat format { parameter, operator, value } → { conditions: [...] }
    const relays = raw.relays || {};
    for (const key of ["fan", "motor", "light"]) {
      const r = relays[key];
      if (r && !Array.isArray(r.conditions)) {
        relays[key] = {
          enabled: r.enabled ?? true,
          logic: r.logic ?? "AND",
          conditions:
            r.parameter !== undefined
              ? [
                  {
                    parameter: r.parameter || "temperature",
                    operator: r.operator || ">",
                    value: r.value ?? 0,
                  },
                ]
              : [],
        };
      }
    }

    // Serialise ObjectId → string so JSON.stringify works cleanly
    const doc = {
      deviceId: raw.deviceId,
      relays,
      updatedAt: raw.updatedAt,
    };

    console.log("[GET /api/config] returning:", JSON.stringify(doc, null, 2));
    res.json(doc);
  } catch (err) {
    console.error("[GET /api/config] error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/config/:deviceId
app.post("/api/config/:deviceId", auth, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { relays } = req.body;

    if (!relays || typeof relays !== "object")
      return res
        .status(400)
        .json({ error: "Invalid config: relays object required" });

    const validationError = validateRelays(relays);
    if (validationError)
      return res.status(400).json({ error: validationError });

    // Normalise values: coerce numeric condition values to Number
    const sanitised = {};
    for (const key of ["fan", "motor", "light"]) {
      const relay = relays[key];
      sanitised[key] = {
        enabled: relay.enabled,
        logic: relay.logic,
        conditions: relay.conditions.map((c) => ({
          parameter: c.parameter,
          operator: c.operator,
          value: STRING_PARAMETERS.includes(c.parameter)
            ? String(c.value)
            : Number(c.value),
        })),
      };
    }

    const config = await Config.findOneAndUpdate(
      { deviceId },
      { deviceId, relays: sanitised, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    console.log(
      `⚙️  Config saved for ${deviceId} —`,
      Object.entries(sanitised)
        .map(([k, v]) => `${k}(${v.conditions.length} cond, ${v.logic})`)
        .join(", ")
    );
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════════════
// UTILITY
// ════════════════════════════════════════════════════════════════════

app.get("/api/health", (_, res) => {
  res.json({
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    sseClients: sseClients.length,
  });
});

if (process.env.NODE_ENV === "development") {
  app.get("/api/debug", async (req, res) => {
    try {
      const telemetry = await Telemetry.find({})
        .sort({ time: -1 })
        .limit(3)
        .lean();
      res.json({ telemetry });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("─────────────────────────────────────────");
  console.log(`🚀 Server   → http://localhost:${PORT}`);
  console.log(`❤️  Health   → http://localhost:${PORT}/api/health`);
  console.log(`📡 SSE Live → http://localhost:${PORT}/api/live`);
  console.log("─────────────────────────────────────────");
});
