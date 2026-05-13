import {
  Alert,
  Box,
  Button,
  CircularProgress,
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
  deleteEvidenceImage,
  getAllLatest,
  getChamberProfiles,
  getEvidenceExportUrl,
  getEvidenceImageUrl,
  getEvidenceImages,
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
  return new Date(`${value}T00:00:00`).toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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

export default function Evidence() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("chamber");
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [selectedProfileName, setSelectedProfileName] = useState("");
  const [images, setImages] = useState([]);
  const [hasMoreImages, setHasMoreImages] = useState(false);
  const [nextImageSkip, setNextImageSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [attachmentMode, setAttachmentMode] = useState("automatic");
  const [selectedDate, setSelectedDate] = useState("");
  const [manualTemperature, setManualTemperature] = useState("");
  const [manualHumidity, setManualHumidity] = useState("");
  const [manualRecordedDate, setManualRecordedDate] = useState("");
  const [zoomedImage, setZoomedImage] = useState(null);
  const [imageError, setImageError] = useState("");
  const [imageSuccess, setImageSuccess] = useState("");

  const categoryLabel = useMemo(
    () => (selectedCategory === "outer" ? "Outer Environment" : "Chamber"),
    [selectedCategory]
  );

  const loadImages = useCallback(async (deviceId, category, { append = false, skip = 0, profileId = "", profileName = "" } = {}) => {
    if (!deviceId) return;

    try {
      setImagesLoading(true);
      setImageError("");
      const data = await getEvidenceImages(deviceId, {
        limit: 6,
        skip,
        category,
        profileId,
        profileName,
      });
      const items = (Array.isArray(data) ? data : data.items || []).filter((item) => {
        if (profileId && item.profileId) return item.profileId === profileId;
        if (profileName && item.profileName) {
          return String(item.profileName).trim().toLowerCase() === String(profileName).trim().toLowerCase();
        }
        return true;
      });
      setImages((prev) => (append ? [...prev, ...items] : items));
      setHasMoreImages(Array.isArray(data) ? false : Boolean(data.hasMore));
      setNextImageSkip(Array.isArray(data) ? items.length : data.nextSkip || items.length);
    } catch (err) {
      setImageError(err.message || "Failed to fetch evidence images");
      if (!append) setImages([]);
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

        const [profileList, latest] = await Promise.all([
          getChamberProfiles(),
          user.role === "admin" ? getAllLatest() : Promise.resolve([]),
        ]);

        setProfiles(profileList || []);
        const buttonProfile = (profileList || []).find(
          (profile) => String(profile.name || "").trim().toLowerCase() === "button mushroom"
        );
        const initialProfileId = buttonProfile?._id || profileList?.[0]?._id || "";
        const initialProfileName = buttonProfile?.name || profileList?.[0]?.name || "";
        setSelectedProfileId(initialProfileId);
        setSelectedProfileName(initialProfileName);

        if (user.role === "admin") {
          const deviceIds = latest.map((item) => item.deviceId).filter(Boolean);
          const initialDevice = deviceIds[0] || "";
          setDevices(deviceIds);
          setSelectedDevice(initialDevice);
          if (initialDevice) {
            await loadImages(initialDevice, "chamber", {
              profileId: initialProfileId,
              profileName: initialProfileName,
            });
          }
        } else {
          const assigned = user.deviceId || "";
          setDevices(assigned ? [assigned] : []);
          setSelectedDevice(assigned);
          if (assigned) {
            await loadImages(assigned, "chamber", {
              profileId: initialProfileId,
              profileName: initialProfileName,
            });
          }
        }
      } catch (err) {
        setImageError(err.message || "Failed to fetch evidence images");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [loadImages, navigate, user]);

  useEffect(() => {
    if (!user || !selectedDevice || !selectedProfileId) return;
    loadImages(selectedDevice, selectedCategory, {
      profileId: selectedProfileId,
      profileName: selectedProfileName,
    });
  }, [loadImages, selectedCategory, selectedDevice, selectedProfileId, selectedProfileName, user]);

  const triggerDownload = useCallback(() => {
    if (!selectedDevice || !selectedProfileId) return;
    const url = getEvidenceExportUrl(
      selectedDevice,
      selectedCategory,
      selectedProfileId,
      selectedProfileName
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selectedDevice}-${selectedCategory}-${(selectedProfileName || "profile").replace(/\s+/g, "-").toLowerCase()}-evidence-report.html`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }, [selectedCategory, selectedDevice, selectedProfileId, selectedProfileName]);

  const isOuterCategory = selectedCategory === "outer";
  const chamberToggleSx = {
    border: "1px solid rgba(74,222,128,0.16) !important",
    borderRadius: "10px !important",
    color: "rgba(232,245,233,0.72)",
    background: "transparent",
    textTransform: "none",
    px: 2,
    "&.Mui-selected, &.Mui-selected:hover": {
      color: "#f5fff7",
      background: "linear-gradient(135deg, rgba(74,222,128,0.28), rgba(34,197,94,0.18))",
    },
  };
  const outerToggleSx = {
    border: "1px solid rgba(56,189,248,0.16) !important",
    borderRadius: "10px !important",
    color: "rgba(232,245,233,0.72)",
    background: "transparent",
    textTransform: "none",
    px: 2,
    "&.Mui-selected, &.Mui-selected:hover": {
      color: "#f5fcff",
      background: "linear-gradient(135deg, rgba(56,189,248,0.28), rgba(14,165,233,0.18))",
    },
  };
  const selectSx = {
    color: "#f5fff7",
    borderRadius: "10px",
    fontFamily: "'JetBrains Mono', monospace",
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: "rgba(74,222,128,0.2)",
    },
    "& .MuiSvgIcon-root": { color: "rgba(232,245,233,0.78)" },
    "& .MuiSelect-select": { color: "#f5fff7" },
  };
  const selectMenuProps = {
    PaperProps: {
      sx: {
        background: "#08150d",
        color: "#e8f5e9",
        border: "1px solid rgba(74,222,128,0.16)",
        "& .MuiMenuItem-root": {
          color: "#dff7e3",
        },
        "& .MuiMenuItem-root.Mui-selected": {
          color: "#ffffff",
          background: "rgba(74,222,128,0.2)",
        },
        "& .MuiMenuItem-root.Mui-selected:hover": {
          background: "rgba(74,222,128,0.28)",
        },
      },
    },
  };

  if (!user) return null;

  return (
    <Box sx={{ minHeight: "100vh", background: "#040d08", color: "#e8f5e9" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Cormorant+Garamond:wght@400;600&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
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
            Evidence
          </Typography>
          <Typography
            sx={{
              fontSize: 11,
              color: "rgba(232,245,233,0.45)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Separate chamber and outer-environment evidence with downloadable reports
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
                    sx={selectSx}
                    MenuProps={selectMenuProps}
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

            <Box>
              <Typography sx={{ fontSize: 11, color: "rgba(232,245,233,0.4)", mb: 0.7 }}>
                Evidence Type
              </Typography>
              <ToggleButtonGroup
                exclusive
                value={selectedCategory}
                onChange={(_, value) => {
                  if (value) setSelectedCategory(value);
                }}
                sx={{ gap: 1 }}
              >
                <ToggleButton
                  value="chamber"
                  sx={chamberToggleSx}
                >
                  Chamber
                </ToggleButton>
                <ToggleButton
                  value="outer"
                  sx={outerToggleSx}
                >
                  Outer Environment
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Box>
              <Typography sx={{ fontSize: 11, color: "rgba(232,245,233,0.4)", mb: 0.7 }}>
                Mushroom Profile
              </Typography>
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <Select
                  value={selectedProfileId}
                  onChange={(event) => {
                    const nextId = event.target.value;
                    const nextProfile = profiles.find((profile) => profile._id === nextId);
                    setSelectedProfileId(nextId);
                    setSelectedProfileName(nextProfile?.name || "");
                  }}
                  sx={{
                    ...selectSx,
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(251,191,36,0.2)",
                    },
                  }}
                  MenuProps={selectMenuProps}
                >
                  {profiles.map((profile) => (
                    <MenuItem key={profile._id} value={profile._id}>
                      {profile.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button
              onClick={() =>
                loadImages(selectedDevice, selectedCategory, {
                  profileId: selectedProfileId,
                  profileName: selectedProfileName,
                })
              }
              disabled={!selectedDevice || !selectedProfileId || imagesLoading}
              sx={{
                color: "#38bdf8",
                border: "1px solid rgba(56,189,248,0.22)",
                borderRadius: "10px",
                px: 2,
              }}
            >
              Refresh Evidence
            </Button>
            <Button
              onClick={triggerDownload}
              disabled={!selectedDevice || !selectedProfileId}
              sx={{
                color: "#fbbf24",
                border: "1px solid rgba(251,191,36,0.22)",
                borderRadius: "10px",
                px: 2,
              }}
            >
              Download Report
            </Button>
          </Box>
        </Box>

        <Box
          sx={{
            mb: 3,
            p: 2.5,
            borderRadius: "18px",
            border: `1px solid ${selectedCategory === "outer" ? "rgba(56,189,248,0.14)" : "rgba(74,222,128,0.14)"}`,
            background: selectedCategory === "outer"
              ? "linear-gradient(180deg, rgba(8,18,24,0.92), rgba(8,15,10,0.82))"
              : "linear-gradient(180deg, rgba(10,24,14,0.95), rgba(8,15,10,0.82))",
          }}
        >
          <Typography sx={{ fontSize: 20, mb: 0.7 }}>{categoryLabel} Evidence</Typography>
          <Typography sx={{ fontSize: 12, color: "rgba(232,245,233,0.45)", mb: 2 }}>
            {isOuterCategory
              ? "Upload outer environment images under the selected mushroom profile and enter temperature and humidity manually for each evidence item."
              : `Upload images for the ${categoryLabel.toLowerCase()} under the selected mushroom profile and attach the nearest telemetry automatically, or pick a custom date to match the upload time-of-day on that date.`}
          </Typography>

          <Box sx={{ mb: 2, display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
            {isOuterCategory ? (
              <>
                <TextField
                  type="number"
                  size="small"
                  label="Temperature"
                  value={manualTemperature}
                  onChange={(event) => setManualTemperature(event.target.value)}
                  sx={{
                    minWidth: 190,
                    "& .MuiInputLabel-root": { color: "rgba(232,245,233,0.62)" },
                    "& .MuiInputLabel-root.Mui-focused": { color: "#7dd3fc" },
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "10px",
                      color: "#e8f5e9",
                      "& fieldset": { borderColor: "rgba(56,189,248,0.18)" },
                      "&:hover fieldset": { borderColor: "rgba(56,189,248,0.32)" },
                    },
                  }}
                />
                <TextField
                  type="number"
                  size="small"
                  label="Humidity"
                  value={manualHumidity}
                  onChange={(event) => setManualHumidity(event.target.value)}
                  sx={{
                    minWidth: 190,
                    "& .MuiInputLabel-root": { color: "rgba(232,245,233,0.62)" },
                    "& .MuiInputLabel-root.Mui-focused": { color: "#7dd3fc" },
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "10px",
                      color: "#e8f5e9",
                      "& fieldset": { borderColor: "rgba(56,189,248,0.18)" },
                      "&:hover fieldset": { borderColor: "rgba(56,189,248,0.32)" },
                    },
                  }}
                />
                <TextField
                  type="date"
                  size="small"
                  label="Recorded Date"
                  value={manualRecordedDate}
                  onChange={(event) => setManualRecordedDate(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    minWidth: 190,
                    "& .MuiInputLabel-root": { color: "rgba(232,245,233,0.62)" },
                    "& .MuiInputLabel-root.Mui-focused": { color: "#7dd3fc" },
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "10px",
                      color: "#e8f5e9",
                      "& fieldset": { borderColor: "rgba(56,189,248,0.18)" },
                      "&:hover fieldset": { borderColor: "rgba(56,189,248,0.32)" },
                    },
                    "& input": { colorScheme: "dark" },
                  }}
                />
              </>
            ) : (
              <>
                <ToggleButtonGroup
                  exclusive
                  value={attachmentMode}
                  onChange={(_, value) => {
                    if (value) setAttachmentMode(value);
                  }}
                  sx={{ gap: 1 }}
                >
                  <ToggleButton value="automatic" sx={chamberToggleSx}>
                    Automatic Data
                  </ToggleButton>
                  <ToggleButton value="custom" sx={outerToggleSx}>
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
              </>
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
                if (!selectedDevice || !selectedFile || !selectedProfileId) return;
                if (!isOuterCategory && attachmentMode === "custom" && !selectedDate) {
                  setImageError("Please choose a custom date before uploading.");
                  return;
                }
                if (isOuterCategory && (!manualTemperature || !manualHumidity || !manualRecordedDate)) {
                  setImageError("Please enter temperature, humidity, and date for outer environment evidence.");
                  return;
                }

                try {
                  setUploadingImage(true);
                  setImageError("");
                  setImageSuccess("");
                  const uploaded = await uploadEvidenceImage(selectedDevice, selectedFile, {
                    category: selectedCategory,
                    attachmentMode: isOuterCategory ? "manual" : attachmentMode,
                    selectedDate: isOuterCategory ? "" : selectedDate,
                    profileId: selectedProfileId,
                    profileName: selectedProfileName,
                    manualTemperature: isOuterCategory ? manualTemperature : "",
                    manualHumidity: isOuterCategory ? manualHumidity : "",
                    manualRecordedAt: isOuterCategory && manualRecordedDate ? `${manualRecordedDate}T12:00:00` : "",
                  });
                  setImages((prev) => [uploaded, ...prev]);
                  setSelectedFile(null);
                  if (isOuterCategory) {
                    setManualTemperature("");
                    setManualHumidity("");
                    setManualRecordedDate("");
                  }
                  setImageSuccess(`${categoryLabel} evidence uploaded successfully for ${selectedProfileName}`);
                } catch (err) {
                  setImageError(err.message || "Failed to upload image");
                } finally {
                  setUploadingImage(false);
                }
              }}
              disabled={
                !selectedDevice ||
                !selectedFile ||
                !selectedProfileId ||
                uploadingImage ||
                (isOuterCategory && (!manualTemperature || !manualHumidity || !manualRecordedDate))
              }
              sx={{
                color: "#020c04",
                background: "linear-gradient(135deg,#4ade80,#86efac)",
                borderRadius: "10px",
                px: 2.5,
                "&:hover": { background: "linear-gradient(135deg,#4ade80,#bbf7d0)" },
                "&.Mui-disabled": { color: "rgba(2,12,4,0.4)", background: "rgba(74,222,128,0.3)" },
              }}
            >
              {uploadingImage ? "Uploading..." : `Upload ${categoryLabel}`}
            </Button>
          </Box>

          {imageSuccess && <Alert severity="success" sx={{ mb: 1.5 }}>{imageSuccess}</Alert>}
          {imageError && <Alert severity="error" sx={{ mb: 1.5 }}>{imageError}</Alert>}

          {loading || imagesLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress sx={{ color: selectedCategory === "outer" ? "#38bdf8" : "#4ade80" }} />
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
                No {categoryLabel.toLowerCase()} evidence uploaded for {selectedProfileName || "this profile"} on this device yet.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "grid", gap: 2 }}>
              {images.map((image) => (
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
                    src={getEvidenceImageUrl(image.deviceId, image._id, image.category || selectedCategory)}
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
                        {image.fileName || `${categoryLabel} evidence`}
                      </Typography>
                      <Button
                        onClick={async () => {
                          try {
                            setDeletingImageId(image._id);
                            setImageError("");
                            await deleteEvidenceImage(image.deviceId || selectedDevice, image._id, {
                              category: image.category || selectedCategory,
                            });
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
                        color: "rgba(232,245,233,0.5)",
                        fontFamily: "'JetBrains Mono', monospace",
                        mb: 1,
                      }}
                    >
                      Uploaded: {formatDateTime(image.uploadedAt)}
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 11,
                        color: "#fbbf24",
                        fontFamily: "'JetBrains Mono', monospace",
                        mb: 0.8,
                      }}
                    >
                      Profile: {image.profileName || selectedProfileName || "Unassigned"}
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 11,
                        color: image.category === "outer" ? "#38bdf8" : "#4ade80",
                        fontFamily: "'JetBrains Mono', monospace",
                        mb: 1.2,
                      }}
                    >
                      Match mode: {image.attachmentMode === "manual"
                        ? "manual entry"
                        : image.attachmentMode === "custom"
                          ? `custom date (${formatSelectedDate(image.selectedDate)})`
                          : "automatic"}
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

              {hasMoreImages && (
                <Button
                  onClick={() =>
                    loadImages(selectedDevice, selectedCategory, {
                      append: true,
                      skip: nextImageSkip,
                      profileId: selectedProfileId,
                      profileName: selectedProfileName,
                    })
                  }
                  disabled={imagesLoading}
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
                  {zoomedImage.fileName || `${categoryLabel} evidence`}
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
              src={getEvidenceImageUrl(zoomedImage.deviceId, zoomedImage._id, zoomedImage.category || selectedCategory)}
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
