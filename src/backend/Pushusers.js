// ────────────────────────────────────────────────────────────────────
//  pushUsers.js
//  Pushes users into your MongoDB 'users' collection
//
//  HOW TO RUN:
//    1. Place this file in your backend/ folder
//    2. Open terminal in that folder
//    3. Run:  node pushUsers.js
// ────────────────────────────────────────────────────────────────────

const mongoose = require("mongoose");

// ── Your MongoDB connection ──────────────────────────────────────────
const MONGO_URI =
  "mongodb://ChamberADmin:Chamber001@ac-i77d6qq-shard-00-00.zesblyi.mongodb.net:27017,ac-i77d6qq-shard-00-01.zesblyi.mongodb.net:27017,ac-i77d6qq-shard-00-02.zesblyi.mongodb.net:27017/chamberDB?ssl=true&replicaSet=atlas-tpytdm-shard-0&authSource=admin&retryWrites=true&w=majority&appName=CHAMBERS";

// ── ADD / EDIT YOUR USERS HERE ───────────────────────────────────────
// role: "admin"  → can see ALL chambers
// role: "user"   → can only see their assigned deviceId
// deviceId       → must match exactly what's in your telemetry collection
//                  your telemetry has: "chamber-001"

const USERS = [
  {
    name:      "Admin",
    email:     "admin@smartcultivation.com",
    password:  "admin123",
    role:      "admin",
    deviceId:  null,            // admin sees all devices
  },
  {
    name:      "Saniya",
    email:     "saniya@smartcultivation.com",
    password:  "saniya123",
    role:      "user",
    deviceId:  "chamber-001",   // must match telemetry deviceId exactly
  },
  {
    name:      "Member 2",
    email:     "member2@smartcultivation.com",
    password:  "member123",
    role:      "user",
    deviceId:  "chamber-001",
  },
  // ── Add more users below if needed ──────────────────────────────
  // {
  //   name:     "Member 3",
  //   email:    "member3@smartcultivation.com",
  //   password: "member123",
  //   role:     "user",
  //   deviceId: "chamber-001",
  // },
];

// ── Schema (matches your users collection) ───────────────────────────
const userSchema = new mongoose.Schema({
  name:      String,
  email:     { type: String, unique: true },
  password:  String,
  role:      { type: String, enum: ["user", "admin"] },
  deviceId:  String,
  createdAt: { type: Date, default: Date.now },
}, { collection: "users" });

const User = mongoose.model("User", userSchema);

// ── Main ─────────────────────────────────────────────────────────────
async function pushUsers() {
  console.log("\n──────────────────────────────────────");
  console.log("  SmartCultivation — Push Users Script");
  console.log("──────────────────────────────────────\n");

  try {
    console.log("⏳ Connecting to MongoDB Atlas...");
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 15000 });
    console.log("✅ Connected to chamberDB\n");

    let created = 0;
    let skipped = 0;

    for (const userData of USERS) {
      const exists = await User.findOne({ email: userData.email });

      if (exists) {
        console.log(`⏭  Already exists  → ${userData.email}`);
        skipped++;
      } else {
        await User.create(userData);
        console.log(`✅ Created  [${userData.role.padEnd(5)}]  → ${userData.email}`);
        created++;
      }
    }

    // ── Print summary ──────────────────────────────────────────────
    console.log("\n──────────────────────────────────────");
    console.log(`  ✅ Created : ${created} users`);
    console.log(`  ⏭  Skipped : ${skipped} users (already existed)`);
    console.log("──────────────────────────────────────\n");

    // ── Print login credentials table ─────────────────────────────
    console.log("🔐 LOGIN CREDENTIALS FOR YOUR APP:\n");
    console.log("  Role   │ Email                              │ Password    │ Device");
    console.log("  ───────┼────────────────────────────────────┼─────────────┼──────────────");
    USERS.forEach(u => {
      const role     = u.role.padEnd(6);
      const email    = u.email.padEnd(35);
      const password = u.password.padEnd(12);
      const device   = u.deviceId || "all devices";
      console.log(`  ${role} │ ${email} │ ${password} │ ${device}`);
    });

    console.log("\n──────────────────────────────────────");
    console.log("  Now start your server: node server.js");
    console.log("  Then login at: http://localhost:3000/login");
    console.log("──────────────────────────────────────\n");

    await mongoose.disconnect();

  } catch (err) {
    console.error("\n❌ ERROR:", err.message);
    console.log("\nPossible reasons:");
    console.log("  - MongoDB URI is wrong");
    console.log("  - No internet / VPN blocking Atlas");
    console.log("  - mongoose not installed → run: npm install mongoose");
    process.exit(1);
  }
}

pushUsers();