import {
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAllLatest, getSensorHistoryRange } from "../services/api";

const SENSOR_FIELDS = [
  { key: "temperature", label: "Temperature", unit: "°C" },
  { key: "humidity", label: "Humidity", unit: "%" },
  { key: "soil", label: "Soil", unit: "" },
  { key: "soilStatus", label: "Soil Status", unit: "" },
];

const RELAY_FIELDS = [
  { key: "light", label: "Light" },
  { key: "fan", label: "Fan" },
  { key: "motor", label: "Motor" },
];

function formatDateTime(value) {
  if (!value) return "No timestamp";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Invalid timestamp";

  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatValue(value, unit = "") {
  if (value === null || value === undefined || value === "") return "—";
  return `${value}${unit}`;
}

function RelayPill({ label, value }) {
  const isOn = String(value).toUpperCase() === "ON";

  return (
    <Box
      sx={{
        px: 1.5,
        py: 1,
        borderRadius: "999px",
        border: `1px solid ${isOn ? "rgba(74,222,128,0.28)" : "rgba(248,113,113,0.25)"}`,
        background: isOn ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)",
      }}
    >
      <Typography
        sx={{
          fontSize: 11,
          color: isOn ? "#4ade80" : "#fca5a5",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {label}: {value ?? "—"}
      </Typography>
    </Box>
  );
}

export default function History() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRecords = useCallback(async (deviceId) => {
    if (!deviceId) return;

    try {
      setLoading(true);
      setError("");
      const data = await getSensorHistoryRange(deviceId, { days: 3 });
      setRecords(data);
    } catch (err) {
      setError(err.message || "Failed to load history");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const init = async () => {
      try {
        setLoading(true);
        setError("");

        if (user.role === "admin") {
          const latest = await getAllLatest();
          const deviceIds = latest.map((item) => item.deviceId).filter(Boolean);
          setDevices(deviceIds);

          const initialDevice = deviceIds[0] || "";
          setSelectedDevice(initialDevice);

          if (initialDevice) {
            const data = await getSensorHistoryRange(initialDevice, { days: 3 });
            setRecords(data);
          } else {
            setRecords([]);
          }
        } else {
          setDevices(user.deviceId ? [user.deviceId] : []);
          setSelectedDevice(user.deviceId || "");

          if (user.deviceId) {
            const data = await getSensorHistoryRange(user.deviceId, { days: 3 });
            setRecords(data);
          } else {
            setRecords([]);
          }
        }
      } catch (err) {
        setError(err.message || "Failed to load history");
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [navigate, user]);

  useEffect(() => {
    if (!user || !selectedDevice) return;
    if (user.role !== "admin") return;
    loadRecords(selectedDevice);
  }, [loadRecords, selectedDevice, user]);

  const summary = useMemo(() => {
    if (!records.length) return null;

    return {
      total: records.length,
      newest: formatDateTime(records[0]?.time),
      oldest: formatDateTime(records[records.length - 1]?.time),
    };
  }, [records]);

  if (!user) return null;

  return (
    <Box sx={{ minHeight: "100vh", background: "#040d08", color: "#e8f5e9" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Cormorant+Garamond:wght@400;600&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::selection { background: rgba(74,222,128,0.25); }
      `}</style>

      <Box
        sx={{
          px: { xs: 2, md: 5 },
          py: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
          borderBottom: "1px solid rgba(74,222,128,0.08)",
          background: "rgba(4,13,8,0.95)",
          position: "sticky",
          top: 0,
          zIndex: 20,
          backdropFilter: "blur(16px)",
        }}
      >
        <Box>
          <Typography sx={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28 }}>
            History
          </Typography>
          <Typography
            sx={{
              fontSize: 11,
              color: "rgba(232,245,233,0.45)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Last 3 days of sensor and relay data
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1.2, flexWrap: "wrap" }}>
          <Button
            onClick={() => navigate("/dashboard")}
            sx={{
              color: "#4ade80",
              border: "1px solid rgba(74,222,128,0.2)",
              borderRadius: "10px",
              px: 2,
            }}
          >
            Back to Dashboard
          </Button>
          <Button
            onClick={() => {
              logout();
              navigate("/");
            }}
            sx={{
              color: "#fca5a5",
              border: "1px solid rgba(248,113,113,0.2)",
              borderRadius: "10px",
              px: 2,
            }}
          >
            Sign Out
          </Button>
        </Box>
      </Box>

      <Box sx={{ px: { xs: 2, md: 5 }, py: { xs: 3, md: 4 } }}>
        <Box
          sx={{
            mb: 3,
            p: 2.5,
            borderRadius: "18px",
            border: "1px solid rgba(74,222,128,0.12)",
            background: "linear-gradient(180deg, rgba(10,24,14,0.95), rgba(8,15,10,0.8))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap", alignItems: "center" }}>
            <Box>
              <Typography sx={{ fontSize: 11, color: "rgba(232,245,233,0.4)", mb: 0.7 }}>
                Device
              </Typography>
              {user.role === "admin" ? (
                <FormControl size="small" sx={{ minWidth: 220 }}>
                  <Select
                    value={selectedDevice}
                    onChange={(event) => setSelectedDevice(event.target.value)}
                    sx={{
                      color: "#e8f5e9",
                      borderRadius: "10px",
                      fontFamily: "'JetBrains Mono', monospace",
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(74,222,128,0.2)",
                      },
                      "& .MuiSvgIcon-root": { color: "rgba(232,245,233,0.5)" },
                    }}
                  >
                    {devices.map((deviceId) => (
                      <MenuItem key={deviceId} value={deviceId}>
                        {deviceId}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", color: "#4ade80" }}>
                  {selectedDevice || "No device assigned"}
                </Typography>
              )}
            </Box>

            {summary && (
              <>
                <Box>
                  <Typography sx={{ fontSize: 11, color: "rgba(232,245,233,0.4)", mb: 0.7 }}>
                    Records
                  </Typography>
                  <Typography sx={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {summary.total}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11, color: "rgba(232,245,233,0.4)", mb: 0.7 }}>
                    Newest
                  </Typography>
                  <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                    {summary.newest}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11, color: "rgba(232,245,233,0.4)", mb: 0.7 }}>
                    Oldest
                  </Typography>
                  <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                    {summary.oldest}
                  </Typography>
                </Box>
              </>
            )}
          </Box>

          <Button
            onClick={() => loadRecords(selectedDevice)}
            disabled={!selectedDevice || loading}
            sx={{
              color: "#fbbf24",
              border: "1px solid rgba(251,191,36,0.22)",
              borderRadius: "10px",
              px: 2,
            }}
          >
            Refresh
          </Button>
        </Box>

        {error && (
          <Box
            sx={{
              mb: 3,
              p: 2,
              borderRadius: "14px",
              border: "1px solid rgba(248,113,113,0.2)",
              background: "rgba(248,113,113,0.08)",
            }}
          >
            <Typography sx={{ color: "#fca5a5" }}>{error}</Typography>
          </Box>
        )}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
            <CircularProgress sx={{ color: "#4ade80" }} />
          </Box>
        ) : records.length === 0 ? (
          <Box
            sx={{
              p: 4,
              borderRadius: "18px",
              border: "1px solid rgba(74,222,128,0.1)",
              background: "rgba(8,15,10,0.7)",
              textAlign: "center",
            }}
          >
            <Typography sx={{ fontSize: 18, mb: 1 }}>No history found</Typography>
            <Typography sx={{ color: "rgba(232,245,233,0.45)" }}>
              There are no records for the last 3 days for this device.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: "grid", gap: 2 }}>
            {records.map((record) => (
              <Box
                key={record._id || `${record.deviceId}-${record.time}`}
                sx={{
                  p: { xs: 2, md: 2.5 },
                  borderRadius: "18px",
                  border: "1px solid rgba(74,222,128,0.1)",
                  background: "linear-gradient(180deg, rgba(10,24,14,0.95), rgba(8,15,10,0.82))",
                  boxShadow: "0 18px 40px rgba(0,0,0,0.18)",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 2,
                    flexWrap: "wrap",
                    mb: 2,
                  }}
                >
                  <Box>
                    <Typography
                      sx={{
                        color: "#4ade80",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 12,
                        mb: 0.5,
                      }}
                    >
                      {record.deviceId || selectedDevice}
                    </Typography>
                    <Typography sx={{ fontSize: 18, fontWeight: 500 }}>
                      {formatDateTime(record.time)}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ borderColor: "rgba(74,222,128,0.08)", mb: 2 }} />

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
                    gap: 1.5,
                    mb: 2,
                  }}
                >
                  {SENSOR_FIELDS.map((field) => (
                    <Box
                      key={field.key}
                      sx={{
                        p: 1.5,
                        borderRadius: "14px",
                        background: "rgba(74,222,128,0.04)",
                        border: "1px solid rgba(74,222,128,0.08)",
                      }}
                    >
                      <Typography sx={{ fontSize: 11, color: "rgba(232,245,233,0.4)", mb: 0.5 }}>
                        {field.label}
                      </Typography>
                      <Typography sx={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15 }}>
                        {formatValue(record[field.key], field.unit)}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {RELAY_FIELDS.map((field) => (
                    <RelayPill key={field.key} label={field.label} value={record[field.key]} />
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
