// fullDiagnose.js — run this and paste ALL output to Claude
// node fullDiagnose.js

const mongoose = require("mongoose");

require('dotenv').config();
const uri = process.env.MONGO_URI;

async function diagnose() {
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  console.log("✅ Connected\n");
  const db = mongoose.connection.db;

  // ── telemetry: 2 latest docs ─────────────────────────────────────
  console.log("━━━ TELEMETRY (latest 2) ━━━━━━━━━━━━━━━");
  const tel = await db.collection("telemetry").find({}).sort({ _id: -1 }).limit(2).toArray();
  tel.forEach((d, i) => { console.log(`Doc ${i+1}:`); console.log(JSON.stringify(d, null, 2)); });

  // ── users: ALL docs ──────────────────────────────────────────────
  console.log("\n━━━ USERS (all) ━━━━━━━━━━━━━━━━━━━━━━━");
  const users = await db.collection("users").find({}).toArray();
  if (users.length === 0) {
    console.log("⚠️  NO USERS IN COLLECTION");
  } else {
    users.forEach((u, i) => { console.log(`User ${i+1}:`); console.log(JSON.stringify(u, null, 2)); });
  }

  await mongoose.disconnect();
  console.log("\n✅ Paste ALL of this output to Claude");
}

diagnose().catch(console.error);