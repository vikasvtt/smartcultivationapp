// ── src/services/api.js ──────────────────────────────────────────────

const BASE = process.env.REACT_APP_API_URL + "/api";
const API_ORIGIN = (process.env.REACT_APP_API_URL || "").replace(/\/+$/, "");

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

export async function getSensorHistoryRange(deviceId, { days = 3, limit } = {}) {
  const params = new URLSearchParams();

  if (days) params.set("days", String(days));
  if (limit) params.set("limit", String(limit));

  const query = params.toString();
  const res = await fetch(
    `${BASE}/sensors/history/${deviceId}${query ? `?${query}` : ""}`,
    { headers: getAuthHeaders() }
  );

  if (res.status === 401) throw new Error("Unauthorized - please login again");
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}

export async function getEvidenceImages(deviceId, { limit = 6, skip = 0, category = "chamber", profileId = "", profileName = "" } = {}) {
  const params = new URLSearchParams({
    limit: String(limit),
    skip: String(skip),
    category,
  });
  if (profileId) params.set("profileId", profileId);
  if (profileName) params.set("profileName", profileName);

  const res = await fetch(`${BASE}/evidence/${deviceId}?${params.toString()}`, {
    headers: getAuthHeaders(),
  });

  if (res.status === 401) throw new Error("Unauthorized - please login again");
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || "Failed to fetch evidence images");
  return data;
}

export function getEvidenceImageUrl(deviceId, imageId, category = "chamber") {
  const token = localStorage.getItem("token");
  const params = new URLSearchParams({ category });
  if (token) params.set("token", token);
  return `${API_ORIGIN}/api/evidence/${deviceId}/${imageId}/file?${params.toString()}`;
}

export function getEvidenceExportUrl(deviceId, category = "chamber", profileId = "", profileName = "") {
  const token = localStorage.getItem("token");
  const params = new URLSearchParams({ category });
  if (profileId) params.set("profileId", profileId);
  if (profileName) params.set("profileName", profileName);
  if (token) params.set("token", token);
  return `${API_ORIGIN}/api/evidence/${deviceId}/export?${params.toString()}`;
}

export async function uploadEvidenceImage(deviceId, file, options = {}) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("category", options.category || "chamber");
    formData.append("attachmentMode", options.attachmentMode || "automatic");
    if (options.profileId) {
      formData.append("profileId", options.profileId);
    }
    if (options.profileName) {
      formData.append("profileName", options.profileName);
    }
    if (options.selectedDate) {
      formData.append("selectedDate", options.selectedDate);
    }
    if (options.manualTemperature !== undefined && options.manualTemperature !== "") {
      formData.append("manualTemperature", String(options.manualTemperature));
    }
    if (options.manualHumidity !== undefined && options.manualHumidity !== "") {
      formData.append("manualHumidity", String(options.manualHumidity));
    }
    if (options.manualRecordedAt) {
      formData.append("manualRecordedAt", options.manualRecordedAt);
    }

    const token = localStorage.getItem("token");
    const xhr = new XMLHttpRequest();

    xhr.open("POST", `${BASE}/evidence/${deviceId}`);

    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);

        if (xhr.status >= 400) {
          reject(new Error(data.error || "Image upload failed"));
        } else {
          resolve(data.image);
        }
      } catch {
        reject(new Error("Invalid server response"));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during image upload"));
    xhr.send(formData);
  });
}

export async function deleteEvidenceImage(deviceId, imageId, { category = "chamber" } = {}) {
  const params = new URLSearchParams({ category });
  const res = await fetch(`${BASE}/evidence/${deviceId}/${imageId}?${params.toString()}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (res.status === 401) throw new Error("Unauthorized - please login again");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to delete evidence image");
  return data;
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

export async function saveConfig(deviceId, relays, options = {}) {
  const res = await fetch(`${BASE}/config/${deviceId}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      relays,
      profileId: options.profileId || "",
      profileName: options.profileName || "",
    }),
  });
  if (res.status === 401) throw new Error("Unauthorized - please login again");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to save config");
  return data;
}

export async function getChamberProfiles() {
  const res = await fetch(`${BASE}/chamber-profiles`, {
    headers: getAuthHeaders(),
  });
  if (res.status === 401) throw new Error("Unauthorized - please login again");
  if (!res.ok) throw new Error("Failed to fetch chamber profiles");
  return res.json();
}

export async function createChamberProfile(profile) {
  const res = await fetch(`${BASE}/chamber-profiles`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(profile),
  });
  if (res.status === 401) throw new Error("Unauthorized - please login again");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to create chamber profile");
  return data.profile;
}

export async function updateChamberProfile(profileId, updates) {
  const res = await fetch(`${BASE}/chamber-profiles/${profileId}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });
  if (res.status === 401) throw new Error("Unauthorized - please login again");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update chamber profile");
  return data.profile;
}

export async function deleteChamberProfile(profileId) {
  const res = await fetch(`${BASE}/chamber-profiles/${profileId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (res.status === 401) throw new Error("Unauthorized - please login again");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to delete chamber profile");
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
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Server returned an invalid response");
  }
  if (!res.ok) throw new Error(data.error || "Login failed");
  return data;
}

export async function apiSignup(name, email, password) {
  const res = await fetch(`${BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Server returned an invalid response");
  }
  if (!res.ok) throw new Error(data.error || "Signup failed");
  return data;
}

export async function getAdminUsers() {
  const res = await fetch(`${BASE}/admin/users`, {
    headers: getAuthHeaders(),
  });
  if (res.status === 401) throw new Error("Unauthorized - please login again");
  if (res.status === 403) throw new Error("Admin access required");
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

export async function updateAdminUser(userId, updates) {
  const res = await fetch(`${BASE}/admin/users/${userId}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });
  if (res.status === 401) throw new Error("Unauthorized - please login again");
  if (res.status === 403) throw new Error("Admin access required");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update user");
  return data.user;
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
    formData.append("deviceId", "chamber-001"); // ✅ ADD THIS LINE

    const token = localStorage.getItem("token");
    const xhr = new XMLHttpRequest();

    xhr.open("POST", `${BASE}/firmware/upload`);

    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);

        if (xhr.status >= 400) {
          reject(new Error(data.error || "Upload failed"));
        } else {
          resolve(data);
        }
      } catch {
        reject(new Error("Invalid server response"));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));

    xhr.send(formData);
  });
}
