// ── src/services/api.js ──────────────────────────────────────────────
// All backend calls in one place.
// Field names match your actual MongoDB: deviceId, time, temperature, humidity

const BASE = "http://localhost:5000/api";

// ── Sensor REST calls ────────────────────────────────────────────────

// Latest single reading for one device
export async function getLatestReading(deviceId) {
  const res = await fetch(`${BASE}/sensors/latest/${deviceId}`);
  if (!res.ok) throw new Error("Failed to fetch latest reading");
  return res.json();
}

// Last 30 readings for chart
export async function getSensorHistory(deviceId, limit = 30) {
  const res = await fetch(`${BASE}/sensors/history/${deviceId}?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}

// Admin: latest from ALL devices
export async function getAllLatest() {
  const res = await fetch(`${BASE}/sensors/all-latest`);
  if (!res.ok) throw new Error("Failed to fetch all devices");
  return res.json();
}

// All device IDs
export async function getDevices() {
  const res = await fetch(`${BASE}/devices`);
  if (!res.ok) throw new Error("Failed to fetch devices");
  return res.json();
}

// ── SSE — Real-time live updates ─────────────────────────────────────
// Connect ONCE → server pushes every new reading automatically
// Usage:
//   const close = subscribeToLive((doc) => {
//     console.log("new reading:", doc);
//   });
//   // call close() to stop listening

export function subscribeToLive(onNewReading) {
  const evtSource = new EventSource(`${BASE}/live`);

  evtSource.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload.type === "new_reading") {
        onNewReading(payload.data); // { deviceId, temperature, humidity, time }
      }
    } catch (_) {}
  };

  evtSource.onerror = () => {
    console.warn("SSE connection lost — will auto-reconnect");
  };

  // Return a cleanup function
  return () => evtSource.close();
}

// ── Auth ─────────────────────────────────────────────────────────────

export async function apiLogin(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");
  return data.user; // { id, name, email, role, deviceId }
}

export async function apiSignup(name, email, password, role) {
  const res = await fetch(`${BASE}/auth/signup`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ name, email, password, role }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Signup failed");
  return data.user;
}