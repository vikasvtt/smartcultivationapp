import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Dialog,
  FormControl,
  MenuItem,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getAllLatest,
  deleteEvidenceImage,
  getEvidenceImages,
  getEvidenceImageUrl,
  getSensorHistoryRange,
  uploadEvidenceImage,
} from "../services/api";

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

function formatSelectedDate(value) {
  if (!value) return "";
  return formatDateTime(`${value}T00:00:00`);
}

function getImageSource(image) {
  if (!image?._id || !image?.deviceId) return "";
  return getEvidenceImageUrl(image.deviceId, image._id);
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

function SensorGrid({ record }) {
  return (
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
            {formatValue(record?.[field.key], field.unit)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

export default function History() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [records, setRecords] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [attachmentMode, setAttachmentMode] = useState("automatic");
  const [selectedDate, setSelectedDate] = useState("");
  const [zoomedImage, setZoomedImage] = useState(null);
  const [visibleImageCount, setVisibleImageCount] = useState(6);
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState("");
  const [imageSuccess, setImageSuccess] = useState("");

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

  const loadImages = useCallback(async (deviceId) => {
    if (!deviceId) return;

    try {
      setImagesLoading(true);
      setImageError("");
      const data = await getEvidenceImages(deviceId);
      setImages(data);
      setVisibleImageCount(6);
    } catch (err) {
      setImageError(err.message || "Failed to load evidence images");
      setImages([]);
    } finally {
      setImagesLoading(false);
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
            const [historyData, imageData] = await Promise.all([
              getSensorHistoryRange(initialDevice, { days: 3 }),
              getEvidenceImages(initialDevice),
            ]);
            setRecords(historyData);
            setImages(imageData);
          } else {
            setRecords([]);
            setImages([]);
          }
        } else {
          setDevices(user.deviceId ? [user.deviceId] : []);
          setSelectedDevice(user.deviceId || "");

          if (user.deviceId) {
            const [historyData, imageData] = await Promise.all([
              getSensorHistoryRange(user.deviceId, { days: 3 }),
              getEvidenceImages(user.deviceId),
            ]);
            setRecords(historyData);
            setImages(imageData);
          } else {
            setRecords([]);
            setImages([]);
          }
        }
      } catch (err) {
        setError(err.message || "Failed to load history");
        setImageError(err.message || "Failed to load evidence images");
        setRecords([]);
        setImages([]);
      } finally {
        setLoading(false);
        setImagesLoading(false);
      }
    };

    init();
  }, [navigate, user]);

  useEffect(() => {
    if (!user || !selectedDevice) return;
    if (user.role !== "admin") return;
    loadRecords(selectedDevice);
    loadImages(selectedDevice);
  }, [loadImages, loadRecords, selectedDevice, user]);

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
            Last 3 days of sensor, relay, and mushroom evidence data
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

          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
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
              Refresh History
            </Button>
            <Button
              onClick={() => loadImages(selectedDevice)}
              disabled={!selectedDevice || imagesLoading}
              sx={{
                color: "#38bdf8",
                border: "1px solid rgba(56,189,248,0.22)",
                borderRadius: "10px",
                px: 2,
              }}
            >
              Refresh Evidence
            </Button>
          </Box>
        </Box>

        <Box
          sx={{
            mb: 3,
            p: 2.5,
            borderRadius: "18px",
            border: "1px solid rgba(56,189,248,0.14)",
            background: "linear-gradient(180deg, rgba(8,18,24,0.92), rgba(8,15,10,0.82))",
          }}
        >
          <Typography sx={{ fontSize: 20, mb: 0.7 }}>Mushroom Evidence</Typography>
          <Typography sx={{ fontSize: 12, color: "rgba(232,245,233,0.45)", mb: 2 }}>
            Upload a mushroom image as evidence. Choose automatic mode to attach the nearest telemetry at upload time, or choose a custom date and match the nearest reading on that date for the upload time-of-day.
          </Typography>

          <Box sx={{ mb: 2, display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
            <ToggleButtonGroup
              exclusive
              value={attachmentMode}
              onChange={(_, value) => {
                if (value) setAttachmentMode(value);
              }}
              sx={{ gap: 1 }}
            >
              <ToggleButton
                value="automatic"
                sx={{
                  border: "1px solid rgba(74,222,128,0.16) !important",
                  borderRadius: "10px !important",
                  color: attachmentMode === "automatic" ? "#4ade80" : "rgba(232,245,233,0.55)",
                  background: attachmentMode === "automatic" ? "rgba(74,222,128,0.1)" : "transparent",
                  textTransform: "none",
                  px: 2,
                }}
              >
                Automatic Data
              </ToggleButton>
              <ToggleButton
                value="custom"
                sx={{
                  border: "1px solid rgba(56,189,248,0.16) !important",
                  borderRadius: "10px !important",
                  color: attachmentMode === "custom" ? "#38bdf8" : "rgba(232,245,233,0.55)",
                  background: attachmentMode === "custom" ? "rgba(56,189,248,0.1)" : "transparent",
                  textTransform: "none",
                  px: 2,
                }}
              >
                Custom Date Data
              </ToggleButton>
            </ToggleButtonGroup>

            {attachmentMode === "custom" && (
              <TextField
                type="date"
                size="small"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{
                  minWidth: 190,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "10px",
                    color: "#e8f5e9",
                    "& fieldset": { borderColor: "rgba(56,189,248,0.18)" },
                    "&:hover fieldset": { borderColor: "rgba(56,189,248,0.32)" },
                  },
                  "& input": { colorScheme: "dark" },
                }}
              />
            )}
          </Box>

          <Box sx={{ display: "flex", gap: 1.2, flexWrap: "wrap", alignItems: "center", mb: 1.5 }}>
            <Button
              component="label"
              sx={{
                color: "#e8f5e9",
                border: "1px solid rgba(74,222,128,0.18)",
                borderRadius: "10px",
                px: 2,
              }}
            >
              Choose Image
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
              />
            </Button>

            <Typography sx={{ fontSize: 12, color: "rgba(232,245,233,0.5)" }}>
              {selectedFile ? selectedFile.name : "No image selected"}
            </Typography>

            <Button
              onClick={async () => {
                if (!selectedDevice || !selectedFile) return;
                if (attachmentMode === "custom" && !selectedDate) {
                  setImageError("Please choose a custom date before uploading.");
                  return;
                }

                try {
                  setUploadingImage(true);
                  setImageError("");
                  setImageSuccess("");
                  const uploaded = await uploadEvidenceImage(selectedDevice, selectedFile, {
                    attachmentMode,
                    selectedDate,
                  });
                  setImages((prev) => [uploaded, ...prev]);
                  setVisibleImageCount((prev) => Math.max(prev, 6));
                  setSelectedFile(null);
                  setImageSuccess("Evidence image uploaded successfully");
                } catch (err) {
                  setImageError(err.message || "Failed to upload image");
                } finally {
                  setUploadingImage(false);
                }
              }}
              disabled={!selectedDevice || !selectedFile || uploadingImage}
              sx={{
                color: "#020c04",
                background: "linear-gradient(135deg,#4ade80,#86efac)",
                borderRadius: "10px",
                px: 2.5,
                "&:hover": { background: "linear-gradient(135deg,#4ade80,#bbf7d0)" },
                "&.Mui-disabled": { color: "rgba(2,12,4,0.4)", background: "rgba(74,222,128,0.3)" },
              }}
            >
              {uploadingImage ? "Uploading..." : "Upload Evidence"}
            </Button>
          </Box>

          {imageSuccess && <Alert severity="success" sx={{ mb: 1.5 }}>{imageSuccess}</Alert>}
          {imageError && <Alert severity="error" sx={{ mb: 1.5 }}>{imageError}</Alert>}

          {imagesLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress sx={{ color: "#38bdf8" }} />
            </Box>
          ) : images.length === 0 ? (
            <Box
              sx={{
                p: 3,
                borderRadius: "14px",
                border: "1px dashed rgba(56,189,248,0.18)",
                background: "rgba(56,189,248,0.04)",
              }}
            >
              <Typography sx={{ color: "rgba(232,245,233,0.55)" }}>
                No evidence images uploaded for this device yet.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "grid", gap: 2 }}>
              {images.slice(0, visibleImageCount).map((image) => (
                <Box
                  key={image._id}
                  sx={{
                    p: 2,
                    borderRadius: "16px",
                    border: "1px solid rgba(56,189,248,0.12)",
                    background: "rgba(8,15,10,0.72)",
                    display: "grid",
                    gap: 2,
                    gridTemplateColumns: { xs: "1fr", md: "320px 1fr" },
                  }}
                >
                  <Box
                    component="img"
                    src={getImageSource(image)}
                    alt={image.fileName || "Evidence"}
                    onClick={() => setZoomedImage(image)}
                    loading="lazy"
                    sx={{
                      width: "100%",
                      maxHeight: 320,
                      objectFit: "cover",
                      borderRadius: "14px",
                      border: "1px solid rgba(56,189,248,0.15)",
                      cursor: "zoom-in",
                      transition: "transform 0.2s ease, border-color 0.2s ease",
                      "&:hover": {
                        transform: "scale(1.01)",
                        borderColor: "rgba(56,189,248,0.32)",
                      },
                    }}
                  />

                  <Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap", alignItems: "flex-start" }}>
                      <Typography sx={{ fontSize: 18, mb: 0.4 }}>
                        {image.fileName || "Mushroom evidence"}
                      </Typography>
                      <Button
                        onClick={async () => {
                          try {
                            setDeletingImageId(image._id);
                            setImageError("");
                            await deleteEvidenceImage(image.deviceId || selectedDevice, image._id);
                            setImages((prev) => prev.filter((item) => item._id !== image._id));
                          } catch (err) {
                            setImageError(err.message || "Failed to delete evidence image");
                          } finally {
                            setDeletingImageId(null);
                          }
                        }}
                        disabled={deletingImageId === image._id}
                        sx={{
                          color: "#fca5a5",
                          border: "1px solid rgba(248,113,113,0.2)",
                          borderRadius: "10px",
                          px: 1.8,
                          py: 0.7,
                          minWidth: 110,
                        }}
                      >
                        {deletingImageId === image._id ? "Deleting..." : "Delete"}
                      </Button>
                    </Box>
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: "#38bdf8",
                        fontFamily: "'JetBrains Mono', monospace",
                        mb: 1.5,
                      }}
                    >
                      Uploaded: {formatDateTime(image.uploadedAt)}
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 11,
                        color: "rgba(232,245,233,0.5)",
                        fontFamily: "'JetBrains Mono', monospace",
                        mb: 1.2,
                      }}
                    >
                      Match mode: {image.attachmentMode === "custom" ? `custom date (${formatSelectedDate(image.selectedDate)})` : "automatic"}
                    </Typography>

                    <Typography sx={{ fontSize: 13, color: "rgba(232,245,233,0.55)", mb: 1 }}>
                      Nearest sensor snapshot at upload time
                    </Typography>

                    {image.telemetry ? (
                      <>
                        <Typography
                          sx={{
                            fontSize: 12,
                            color: "#4ade80",
                            fontFamily: "'JetBrains Mono', monospace",
                            mb: 1.5,
                          }}
                        >
                          Sensor timestamp: {formatDateTime(image.telemetry.time)}
                        </Typography>
                        <SensorGrid record={image.telemetry} />
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                          {RELAY_FIELDS.map((field) => (
                            <RelayPill
                              key={field.key}
                              label={field.label}
                              value={image.telemetry?.[field.key]}
                            />
                          ))}
                        </Box>
                      </>
                    ) : (
                      <Typography sx={{ color: "rgba(232,245,233,0.45)" }}>
                        No nearby telemetry reading was found for this upload.
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
              {images.length > visibleImageCount && (
                <Button
                  onClick={() => setVisibleImageCount((prev) => prev + 6)}
                  sx={{
                    justifySelf: "center",
                    color: "#38bdf8",
                    border: "1px solid rgba(56,189,248,0.22)",
                    borderRadius: "10px",
                    px: 2.5,
                  }}
                >
                  Load More Evidence
                </Button>
              )}
            </Box>
          )}
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

                <SensorGrid record={record} />

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

      <Dialog
        open={Boolean(zoomedImage)}
        onClose={() => setZoomedImage(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            background: "rgba(4,13,8,0.96)",
            border: "1px solid rgba(56,189,248,0.16)",
            borderRadius: "20px",
            overflow: "hidden",
            boxShadow: "0 24px 70px rgba(0,0,0,0.5)",
          },
        }}
      >
        {zoomedImage && (
          <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                gap: 2,
                alignItems: "flex-start",
                flexWrap: "wrap",
                mb: 2,
              }}
            >
              <Box>
                <Typography sx={{ fontSize: 20, mb: 0.5 }}>
                  {zoomedImage.fileName || "Mushroom evidence"}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 12,
                    color: "rgba(232,245,233,0.5)",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  Uploaded: {formatDateTime(zoomedImage.uploadedAt)}
                </Typography>
              </Box>

              <Button
                onClick={() => setZoomedImage(null)}
                sx={{
                  color: "#e8f5e9",
                  border: "1px solid rgba(232,245,233,0.16)",
                  borderRadius: "10px",
                  px: 1.8,
                }}
              >
                Close
              </Button>
            </Box>

            <Box
              component="img"
              src={getImageSource(zoomedImage)}
              alt={zoomedImage.fileName || "Evidence"}
              sx={{
                width: "100%",
                maxHeight: "78vh",
                objectFit: "contain",
                borderRadius: "16px",
                border: "1px solid rgba(56,189,248,0.15)",
                background: "rgba(8,15,10,0.92)",
              }}
            />
          </Box>
        )}
      </Dialog>
    </Box>
  );
}
