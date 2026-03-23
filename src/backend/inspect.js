// inspect.js — run this ONCE to see your data structure
// Place in your backend folder and run: node inspect.js

const mongoose = require("mongoose");

require('dotenv').config();
const uri = process.env.MONGO_URI;

async function inspect() {
  try {
    console.log("⏳ Connecting to chamberDB...");
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    console.log("✅ Connected!\n");

    const db = mongoose.connection.db;

    // 1. List ALL collections
    const collections = await db.listCollections().toArray();
    console.log("📁 Collections found:");
    collections.forEach(c => console.log("   →", c.name));
    console.log("");

    // 2. Inspect telemetry
    const col = db.collection("telemetry");
    const total = await col.countDocuments();
    console.log(`📊 telemetry has ${total} documents\n`);

    // 3. Show 2 raw documents
    const docs = await col.find({}).sort({ _id: -1 }).limit(2).toArray();
    console.log("📄 Latest 2 documents:");
    docs.forEach((doc, i) => {
      console.log(`\n─── Document ${i + 1} ───────────────────`);
      Object.entries(doc).forEach(([key, val]) => {
        console.log(`   ${key}: ${JSON.stringify(val)}`);
      });
    });

    // 4. All unique keys
    const allDocs = await col.find({}).limit(20).toArray();
    const keys = new Set();
    allDocs.forEach(d => Object.keys(d).forEach(k => keys.add(k)));
    console.log("\n🔑 All field names in telemetry:");
    [...keys].forEach(k => console.log("   →", k));

    await mongoose.disconnect();
    console.log("\n✅ Done! Paste the output above to Claude.");
  } catch (err) {
    console.error("❌ Failed:", err.message);
  }
}

inspect();