// ── src/services/api.js ──────────────────────────────────────────────

const BASE = process.env.REACT_APP_API_URL + "/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

// ── Sensor REST calls ────────────────────────────────────────────────

export async function getLatestReading(deviceId) {
  const res = await fetch(`${BASE}/sensors/latest/${deviceId}`, {
    headers: getAuthHeaders(),
  });
  if (res.status === 401) throw new Error("Unauthorized - please login again");
  if (!res.ok) throw new Error("Failed to fetch latest reading");
  return res.json();
}

export async function getSensorHistory(deviceId, limit = 30) {
  const res = await fetch(
    `${BASE}/sensors/history/${deviceId}?limit=${limit}`,
    { headers: getAuthHeaders() }
  );
  if (res.status === 401) throw new Error("Unauthorized - please login again");
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}

export async function getAllLatest() {
  const res = await fetch(`${BASE}/sensors/all-latest`, {
    headers: getAuthHeaders(),
  });
  if (res.status === 401) throw new Error("Unauthorized - please login again");
  if (!res.ok) throw new Error("Failed to fetch all devices");
  return res.json();
}

export async function getDevices() {
  const res = await fetch(`${BASE}/devices`, { headers: getAuthHeaders() });
  if (res.status === 401) throw new Error("Unauthorized - please login again");
  if (!res.ok) throw new Error("Failed to fetch devices");
  return res.json();
}

// ── Config API ───────────────────────────────────────────────────────

export async function getConfig(deviceId) {
  const res = await fetch(`${BASE}/config/${deviceId}`, {
    headers: getAuthHeaders(),
    cache: "no-store",
  });
  if (res.status === 401) throw new Error("Unauthorized - please login again");
  if (!res.ok) throw new Error("Failed to fetch config");
  return res.json();
}

export async function saveConfig(deviceId, relays) {
  const res = await fetch(`${BASE}/config/${deviceId}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ relays }),
  });
  if (res.status === 401) throw new Error("Unauthorized - please login again");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to save config");
  return data;
}

// ── SSE ──────────────────────────────────────────────────────────────

export function subscribeToLive(onNewReading) {
  const token = localStorage.getItem("token");
  const evtSource = new EventSource(`${BASE}/live?token=${token}`);
  evtSource.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload.type === "new_reading") onNewReading(payload.data);
    } catch (_) {}
  };
  evtSource.onerror = () => {
    console.warn("SSE connection lost — will auto-reconnect");
  };
  return () => evtSource.close();
}

// ── Auth ─────────────────────────────────────────────────────────────

export async function apiLogin(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");
  return data;
}

export async function apiSignup(name, email, password, role) {
  const res = await fetch(`${BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, role }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Signup failed");
  return data; // returns { user, token }
}

// ── Firmware API ─────────────────────────────────────────────────────

export async function getFirmwareInfo() {
  const res = await fetch(`${BASE}/firmware/info`, {
    headers: getAuthHeaders(),
  });
  if (res.status === 401) throw new Error("Unauthorized - please login again");
  if (!res.ok) throw new Error("Failed to fetch firmware info");
  return res.json();
}

export async function uploadFirmware(file, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);

    const token = localStorage.getItem("token");
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE}/firmware/upload`);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 400) reject(new Error(data.error || "Upload failed"));
        else resolve(data);
      } catch {
        reject(new Error("Invalid server response"));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(formData);
  });
}
