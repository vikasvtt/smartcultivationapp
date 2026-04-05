// ── src/pages/Dashboard.jsx ─────────────────────────────────────────
import {
  Box, Typography, Button, Avatar,
  Menu, MenuItem, Divider, LinearProgress, CircularProgress,
  Switch, Select, InputLabel, FormControl, TextField,
  Alert, Snackbar,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DeviceConfig from "../pages/Deviceconfig";
import FirmwareUpload from "../pages/firmwareUpload";
import { useAuth } from "../context/AuthContext";
import {
  getLatestReading, getSensorHistory,
  getAllLatest, subscribeToLive,
  getConfig, saveConfig,
} from "../services/api";
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// ── Sensor cards ─────────────────────────────────────────────────────
const SENSOR_META = [
  { key:"temperature", label:"Temperature", icon:"🌡", color:"#f97316", unit:"°C", min:15, max:45 },
  { key:"humidity",    label:"Humidity",    icon:"💧", color:"#38bdf8", unit:"%",  min:20, max:90 },
  { key:"soil",        label:"Soil Raw",    icon:"🪴", color:"#a3e635", unit:"",   min:0,  max:4095 },
];

// ── Chart tabs (now includes soil) ───────────────────────────────────
const CHART_META = [
  { key:"temperature", label:"Temperature", icon:"🌡", color:"#f97316", unit:"°C" },
  { key:"humidity",    label:"Humidity",    icon:"💧", color:"#38bdf8", unit:"%" },
  { key:"soil",        label:"Soil",        icon:"🪴", color:"#a3e635", unit:"" },
];

// ── Nav tabs ─────────────────────────────────────────────────────────
const NAV_TABS = [
  { key:"dashboard",  label:"Dashboard",        icon:"📊" },
  { key:"history",    label:"History",          icon:"🕘" },
  { key:"config",     label:"Device Config",    icon:"⚙️" },
  { key:"firmware",   label:"Firmware Update",  icon:"📦", adminOnly: true },
];

// ── Relay meta ───────────────────────────────────────────────────────
const RELAY_META = [
  { key:"fan",   icon:"🌀", label:"Fan",   color:"#38bdf8", borderColor:"rgba(56,189,248,0.3)",  bg:"rgba(56,189,248,0.05)"  },
  { key:"motor", icon:"⚙️",  label:"Motor", color:"#a3e635", borderColor:"rgba(163,230,53,0.3)",  bg:"rgba(163,230,53,0.05)"  },
  { key:"light", icon:"💡", label:"Light", color:"#fbbf24", borderColor:"rgba(251,191,36,0.3)",  bg:"rgba(251,191,36,0.05)"  },
];

const PARAMETERS = ["temperature", "humidity", "soil"];
const OPERATORS  = ["<", ">", "==", "<=", ">="];

const DEFAULT_RELAYS = {
  fan:   { enabled:true, parameter:"temperature", operator:">",  value:1  },
  motor: { enabled:true, parameter:"soil",        operator:">",  value:1 },
  light: { enabled:true, parameter:"temperature", operator:"<",  value:1   },
};

const fadeUp = {
  hidden:  { opacity:0, y:20 },
  visible: (i=0) => ({ opacity:1, y:0, transition:{ duration:0.5, delay:i*0.08 } }),
};

// ── Helpers ──────────────────────────────────────────────────────────
function soilStatusColor(status) {
  if (!status) return { bg:"rgba(74,222,128,0.08)", border:"rgba(74,222,128,0.2)", text:"#4ade80" };
  switch (status.toUpperCase()) {
    case "DRY":   return { bg:"rgba(251,191,36,0.1)",  border:"rgba(251,191,36,0.35)",  text:"#fbbf24" };
    case "WET":   return { bg:"rgba(56,189,248,0.1)",  border:"rgba(56,189,248,0.35)",  text:"#38bdf8" };
    case "MOIST": return { bg:"rgba(74,222,128,0.1)",  border:"rgba(74,222,128,0.35)",  text:"#4ade80" };
    default:      return { bg:"rgba(74,222,128,0.08)", border:"rgba(74,222,128,0.2)",   text:"#4ade80" };
  }
}

function statusIcon(val) {
  if (val === null || val === undefined) return { label:"—", color:"rgba(232,245,233,0.3)" };
  const s = String(val).toUpperCase();
  if (s === "ON")  return { label:"ON",  color:"#4ade80" };
  if (s === "OFF") return { label:"OFF", color:"#f87171" };
  return { label:String(val), color:"rgba(232,245,233,0.55)" };
}

// ── Custom Tooltip ───────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ background:"rgba(8,15,10,0.96)",border:"1px solid rgba(74,222,128,0.2)",borderRadius:"8px",px:2,py:1.5 }}>
      <Typography sx={{ fontSize:11,color:"rgba(232,245,233,0.45)",mb:0.5,fontFamily:"'JetBrains Mono',monospace" }}>{label}</Typography>
      {payload.map((p) => (
        <Typography key={p.name} sx={{ fontSize:13,color:p.color,fontFamily:"'JetBrains Mono',monospace" }}>
          {p.value} {p.name}
        </Typography>
      ))}
    </Box>
  );
};

// ── Sensor Card ──────────────────────────────────────────────────────
function SensorCard({ meta, value, i }) {
  const isOk = value !== null && value >= meta.min && value <= meta.max;
  const progress = value !== null
    ? Math.min(100, Math.max(0, ((value - meta.min) / (meta.max - meta.min)) * 100))
    : 0;
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={i}>
      <Box sx={{
        p:3, borderRadius:"14px", height:"100%",
        border:`1px solid ${isOk?"rgba(74,222,128,0.15)":"rgba(248,113,113,0.3)"}`,
        background:isOk?"rgba(74,222,128,0.03)":"rgba(248,113,113,0.05)",
        transition:"all 0.3s",
        "&:hover":{ borderColor:isOk?"rgba(74,222,128,0.35)":"rgba(248,113,113,0.5)",transform:"translateY(-3px)",boxShadow:"0 16px 40px rgba(0,0,0,0.35)" },
      }}>
        <Box sx={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",mb:2.5 }}>
          <Box>
            <Typography sx={{ fontSize:10,letterSpacing:2,color:"rgba(232,245,233,0.4)",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace",mb:0.8 }}>
              {meta.icon}  {meta.label}
            </Typography>
            <Box sx={{ display:"flex",alignItems:"baseline",gap:0.8 }}>
              <Typography sx={{ fontSize:36,fontWeight:500,color:"#e8f5e9",fontFamily:"'JetBrains Mono',monospace",lineHeight:1 }}>
                {value !== null ? value : "—"}
              </Typography>
              {meta.unit && <Typography sx={{ fontSize:14,color:"rgba(232,245,233,0.4)" }}>{meta.unit}</Typography>}
            </Box>
          </Box>
          <Box sx={{ px:1.5,py:0.6,borderRadius:"20px",background:isOk?"rgba(74,222,128,0.1)":"rgba(248,113,113,0.12)",border:`1px solid ${isOk?"rgba(74,222,128,0.3)":"rgba(248,113,113,0.35)"}` }}>
            <Typography sx={{ fontSize:10,color:isOk?"#4ade80":"#f87171",fontFamily:"'JetBrains Mono',monospace",letterSpacing:0.5 }}>
              {value===null?"NO DATA":isOk?"● NORMAL":"⚠ CHECK"}
            </Typography>
          </Box>
        </Box>
        <LinearProgress variant="determinate" value={progress}
          sx={{ height:3,borderRadius:2,background:"rgba(74,222,128,0.08)",mb:1.2,
            "& .MuiLinearProgress-bar":{ background:isOk?`linear-gradient(90deg,${meta.color},#4ade80)`:"#f87171",borderRadius:2 } }} />
        <Box sx={{ display:"flex",justifyContent:"space-between" }}>
          <Typography sx={{ fontSize:10,color:"rgba(232,245,233,0.28)",fontFamily:"'JetBrains Mono',monospace" }}>Min {meta.min}{meta.unit}</Typography>
          <Typography sx={{ fontSize:10,color:"rgba(232,245,233,0.28)",fontFamily:"'JetBrains Mono',monospace" }}>Max {meta.max}{meta.unit}</Typography>
        </Box>
      </Box>
    </motion.div>
  );
}

// ── Soil Status Card ─────────────────────────────────────────────────
function SoilStatusCard({ status }) {
  const c = soilStatusColor(status);
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}>
      <Box sx={{
        p:3, borderRadius:"14px", height:"100%",
        border:`1px solid ${c.border}`, background:c.bg,
        transition:"all 0.3s",
        "&:hover":{ transform:"translateY(-3px)",boxShadow:"0 16px 40px rgba(0,0,0,0.35)" },
      }}>
        <Box sx={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",mb:2 }}>
          <Box>
            <Typography sx={{ fontSize:10,letterSpacing:2,color:"rgba(232,245,233,0.4)",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace",mb:0.8 }}>
              🪴  Soil Status
            </Typography>
            <Typography sx={{ fontSize:36,fontWeight:500,color:c.text,fontFamily:"'JetBrains Mono',monospace",lineHeight:1 }}>
              {status ?? "—"}
            </Typography>
          </Box>
          <Box sx={{ px:1.5,py:0.6,borderRadius:"20px",background:c.bg,border:`1px solid ${c.border}` }}>
            <Typography sx={{ fontSize:10,color:c.text,fontFamily:"'JetBrains Mono',monospace",letterSpacing:0.5 }}>
              {!status?"NO DATA":
               status.toUpperCase()==="DRY"  ?"⚠ DRY":
               status.toUpperCase()==="WET"  ?"● WET":
               status.toUpperCase()==="MOIST"?"● MOIST":`● ${status}`}
            </Typography>
          </Box>
        </Box>
        <LinearProgress
          variant="determinate"
          value={!status?0:status.toUpperCase()==="DRY"?15:status.toUpperCase()==="MOIST"?55:status.toUpperCase()==="WET"?90:50}
          sx={{ height:3,borderRadius:2,background:"rgba(255,255,255,0.06)",mb:1.2,
            "& .MuiLinearProgress-bar":{ background:`linear-gradient(90deg,#1a5c3a,${c.text})`,borderRadius:2 } }}
        />
        <Box sx={{ display:"flex",justifyContent:"space-between" }}>
          <Typography sx={{ fontSize:10,color:"rgba(232,245,233,0.28)",fontFamily:"'JetBrains Mono',monospace" }}>DRY</Typography>
          <Typography sx={{ fontSize:10,color:"rgba(232,245,233,0.28)",fontFamily:"'JetBrains Mono',monospace" }}>MOIST</Typography>
          <Typography sx={{ fontSize:10,color:"rgba(232,245,233,0.28)",fontFamily:"'JetBrains Mono',monospace" }}>WET</Typography>
        </Box>
      </Box>
    </motion.div>
  );
}

// ── Device Controls Row ──────────────────────────────────────────────
function DeviceStatusRow({ light, fan, motor }) {
  const items = [
    { label:"Light", icon:"💡", value:light },
    { label:"Fan",   icon:"🌀", value:fan   },
    { label:"Motor", icon:"⚙️",  value:motor },
  ];
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4}>
      <Box sx={{ borderRadius:"14px",border:"1px solid rgba(74,222,128,0.1)",background:"rgba(8,15,10,0.6)",backdropFilter:"blur(12px)",p:2.5,mb:4 }}>
        <Typography sx={{ fontSize:10,letterSpacing:2,color:"rgba(232,245,233,0.35)",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace",mb:2 }}>
          Device Controls
        </Typography>
        <Box sx={{ display:"flex",gap:2,flexWrap:"wrap" }}>
          {items.map(({ label, icon, value }) => {
            const s = statusIcon(value);
            const isOn = String(value).toUpperCase() === "ON";
            return (
              <Box key={label} sx={{
                flex:"1 1 100px",px:2,py:2,borderRadius:"10px",
                border:`1px solid ${isOn?"rgba(74,222,128,0.25)":"rgba(248,113,113,0.2)"}`,
                background:isOn?"rgba(74,222,128,0.05)":"rgba(248,113,113,0.04)",
                display:"flex",alignItems:"center",justifyContent:"space-between",
                transition:"all 0.25s","&:hover":{ transform:"translateY(-2px)" },
              }}>
                <Box sx={{ display:"flex",alignItems:"center",gap:1 }}>
                  <Typography sx={{ fontSize:18 }}>{icon}</Typography>
                  <Typography sx={{ fontSize:12,color:"rgba(232,245,233,0.55)",fontFamily:"'JetBrains Mono',monospace" }}>{label}</Typography>
                </Box>
                <Box sx={{ display:"flex",alignItems:"center",gap:0.6,px:1.4,py:0.5,borderRadius:"20px",background:isOn?"rgba(74,222,128,0.1)":"rgba(248,113,113,0.1)",border:`1px solid ${isOn?"rgba(74,222,128,0.3)":"rgba(248,113,113,0.3)"}` }}>
                  <Box sx={{ width:5,height:5,borderRadius:"50%",background:s.color,animation:isOn?"pulse 2s infinite":"none" }} />
                  <Typography sx={{ fontSize:10,color:s.color,fontFamily:"'JetBrains Mono',monospace",letterSpacing:0.5 }}>{s.label}</Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </motion.div>
  );
}

// ── Select styling ───────────────────────────────────────────────────
const selectSx = (color) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius:"8px", color:"#e8f5e9",
    fontFamily:"'JetBrains Mono', monospace", fontSize:13,
    "& fieldset":{ borderColor:"rgba(74,222,128,0.15)" },
    "&:hover fieldset":{ borderColor:color||"rgba(74,222,128,0.35)" },
    "&.Mui-focused fieldset":{ borderColor:color||"#4ade80", borderWidth:1 },
  },
  "& .MuiInputLabel-root":{ color:"rgba(232,245,233,0.4)", fontSize:13 },
  "& .MuiInputLabel-root.Mui-focused":{ color:color||"#4ade80" },
  "& .MuiSelect-icon":{ color:"rgba(232,245,233,0.4)" },
});

const menuPaperSx = {
  background:"rgba(8,15,10,0.98)",
  border:"1px solid rgba(74,222,128,0.15)",
  borderRadius:"10px",
  "& .MuiMenuItem-root":{
    color:"rgba(232,245,233,0.7)",
    fontFamily:"'JetBrains Mono', monospace",
    fontSize:13,
    "&:hover":{ background:"rgba(74,222,128,0.08)", color:"#4ade80" },
    "&.Mui-selected":{ background:"rgba(74,222,128,0.12)", color:"#4ade80" },
  },
};

function handleNavAction(tabKey, navigate, setActiveTab) {
  if (tabKey === "history") {
    navigate("/history");
    return;
  }

  setActiveTab(tabKey);
}

// ── Relay Card (for Config screen) ───────────────────────────────────
function RelayCard({ meta, rule, onChange, onSave, saving, lastSaved }) {
  const [localRule, setLocalRule] = useState(rule);

  useEffect(() => { setLocalRule(rule); }, [rule]);

  const update = (field, val) => {
    const updated = { ...localRule, [field]:val };
    setLocalRule(updated);
    onChange(meta.key, updated);
  };

  const isValid = localRule.value !== "" && !isNaN(Number(localRule.value));

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={RELAY_META.findIndex(m => m.key === meta.key)}>
      <Box sx={{
        p:{ xs:2.5, md:3 },
        borderRadius:"16px",
        border:`1px solid ${localRule.enabled ? meta.borderColor : "rgba(74,222,128,0.08)"}`,
        background:localRule.enabled ? meta.bg : "rgba(8,15,10,0.4)",
        transition:"all 0.3s",
        height:"100%",
      }}>
        {/* Header */}
        <Box sx={{ display:"flex",justifyContent:"space-between",alignItems:"center",mb:2.5 }}>
          <Box sx={{ display:"flex",alignItems:"center",gap:1.5 }}>
            <Box sx={{
              width:40,height:40,borderRadius:"10px",
              background:localRule.enabled ? `${meta.color}18` : "rgba(74,222,128,0.05)",
              border:`1px solid ${localRule.enabled ? meta.color+"40" : "rgba(74,222,128,0.1)"}`,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,
              transition:"all 0.3s",
            }}>
              {meta.icon}
            </Box>
            <Box>
              <Typography sx={{ fontSize:15,fontWeight:600,color:"#e8f5e9",lineHeight:1.2 }}>{meta.label}</Typography>
              <Typography sx={{ fontSize:10,color:"rgba(232,245,233,0.35)",fontFamily:"'JetBrains Mono',monospace",letterSpacing:1 }}>
                RELAY CONTROL
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display:"flex",alignItems:"center",gap:1 }}>
            <Typography sx={{ fontSize:11,color:localRule.enabled?meta.color:"rgba(232,245,233,0.3)",fontFamily:"'JetBrains Mono',monospace",transition:"color 0.3s",display:{ xs:"none",sm:"block" } }}>
              {localRule.enabled?"ACTIVE":"OFF"}
            </Typography>
            <Switch
              checked={localRule.enabled}
              onChange={(e) => update("enabled", e.target.checked)}
              size="small"
              sx={{
                "& .MuiSwitch-switchBase.Mui-checked":{ color:meta.color },
                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":{ backgroundColor:meta.color },
              }}
            />
          </Box>
        </Box>

        <Divider sx={{ borderColor:"rgba(74,222,128,0.07)",mb:2.5 }} />

        <Typography sx={{ fontSize:10,letterSpacing:1.5,color:"rgba(232,245,233,0.3)",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace",mb:2 }}>
          Trigger condition
        </Typography>

        {/* Logic row */}
        <Box sx={{ display:"grid",gridTemplateColumns:{ xs:"1fr 80px",sm:"1fr 90px 120px" },gap:1.5,mb:2 }}>
          <FormControl sx={selectSx(meta.color)} size="small">
            <InputLabel>Parameter</InputLabel>
            <Select value={localRule.parameter} label="Parameter" onChange={(e) => update("parameter", e.target.value)}
              disabled={!localRule.enabled} MenuProps={{ PaperProps:{ sx:menuPaperSx } }}>
              {PARAMETERS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl sx={selectSx(meta.color)} size="small">
            <InputLabel>Op</InputLabel>
            <Select value={localRule.operator} label="Op" onChange={(e) => update("operator", e.target.value)}
              disabled={!localRule.enabled} MenuProps={{ PaperProps:{ sx:menuPaperSx } }}>
              {OPERATORS.map(op => <MenuItem key={op} value={op}>{op}</MenuItem>)}
            </Select>
          </FormControl>

          <TextField
            label="Threshold"
            type="number"
            value={localRule.value}
            onChange={(e) => update("value", e.target.value)}
            disabled={!localRule.enabled}
            size="small"
            error={!isValid && localRule.value !== ""}
            helperText={!isValid && localRule.value !== "" ? "Invalid number" : ""}
            sx={{
              gridColumn:{ xs:"1 / -1",sm:"auto" },
              "& .MuiOutlinedInput-root":{
                borderRadius:"8px",color:"#e8f5e9",
                fontFamily:"'JetBrains Mono', monospace",fontSize:13,
                "& fieldset":{ borderColor:"rgba(74,222,128,0.15)" },
                "&:hover fieldset":{ borderColor:meta.color },
                "&.Mui-focused fieldset":{ borderColor:meta.color,borderWidth:1 },
              },
              "& .MuiInputLabel-root":{ color:"rgba(232,245,233,0.4)",fontSize:13 },
              "& .MuiInputLabel-root.Mui-focused":{ color:meta.color },
              "& .MuiFormHelperText-root":{ color:"#f87171",fontSize:10 },
            }}
          />
        </Box>

        {/* Preview */}
        {localRule.enabled && isValid && (
          <Box sx={{ mb:2,px:1.5,py:1,borderRadius:"8px",background:`${meta.color}10`,border:`1px solid ${meta.color}25` }}>
            <Typography sx={{ fontSize:11,color:meta.color,fontFamily:"'JetBrains Mono',monospace" }}>
              {meta.icon} Turn {meta.label} ON when {localRule.parameter} {localRule.operator} {localRule.value}
            </Typography>
          </Box>
        )}

        {/* Save button */}
        <Button
          fullWidth onClick={onSave}
          disabled={saving || !isValid}
          sx={{
            py:1.2,fontSize:12,borderRadius:"8px",fontWeight:500,
            fontFamily:"'JetBrains Mono', monospace",
            background:saving?"rgba(74,222,128,0.08)":`linear-gradient(135deg, ${meta.color}22, ${meta.color}44)`,
            color:meta.color,
            border:`1px solid ${meta.color}40`,
            transition:"all 0.3s",
            "&:hover":{ background:`${meta.color}22`,boxShadow:`0 4px 16px ${meta.color}25` },
            "&:disabled":{ opacity:0.4 },
          }}
        >
          {saving
            ? <><CircularProgress size={12} sx={{ color:meta.color,mr:1 }} /> Saving…</>
            : lastSaved
            ? `✓ Saved at ${lastSaved}`
            : "Save Configuration"
          }
        </Button>
      </Box>
    </motion.div>
  );
}

// ── Device Config Panel ───────────────────────────────────────────────
// function DeviceConfig({ deviceId }) {
//   const [relays, setRelays]         = useState(DEFAULT_RELAYS);
//   const [loading, setLoading]       = useState(true);
//   const [saving, setSaving]         = useState({ fan:false, motor:false, light:false });
//   const [lastSaved, setLastSaved]   = useState({ fan:null, motor:null, light:null });
//   const [fetchError, setFetchError] = useState("");
//   const [toast, setToast]           = useState({ open:false, message:"", severity:"success" });

//   const showToast = (message, severity="success") => setToast({ open:true, message, severity });

//   const fetchConfig = useCallback(async () => {
//     if (!deviceId) return;
//     try {
//       setLoading(true);
//       setFetchError("");
//       const config = await getConfig(deviceId);
//       if (config.relays) setRelays(config.relays);
//     } catch (err) {
//       setFetchError(err.message || "Failed to load configuration");
//     } finally {
//       setLoading(false);
//     }
//   }, [deviceId]);

//   useEffect(() => { fetchConfig(); }, [fetchConfig]);

//   const handleRelayChange = (key, updated) => {
//     setRelays((prev) => ({ ...prev, [key]:updated }));
//   };

//   const handleSave = async (relayKey) => {
//     const rule = relays[relayKey];
//     if (rule.value === "" || isNaN(Number(rule.value))) {
//       showToast("Invalid threshold value", "error");
//       return;
//     }
//     setSaving((prev) => ({ ...prev, [relayKey]:true }));
//     try {
//       await saveConfig(deviceId, {
//         ...relays,
//         [relayKey]:{ ...rule, value:Number(rule.value) },
//       });
//       const time = new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
//       setLastSaved((prev) => ({ ...prev, [relayKey]:time }));
//       showToast(`${relayKey.charAt(0).toUpperCase() + relayKey.slice(1)} configuration saved!`);
//     } catch (err) {
//       showToast(err.message || "Failed to save", "error");
//     } finally {
//       setSaving((prev) => ({ ...prev, [relayKey]:false }));
//     }
//   };

//   const handleSaveAll = async () => {
//     for (const key of ["fan","motor","light"]) await handleSave(key);
//   };

//   const handleReset = () => {
//     setRelays(DEFAULT_RELAYS);
//     setLastSaved({ fan:null, motor:null, light:null });
//     showToast("Reset to defaults — click Save to apply", "info");
//   };

//   if (loading) {
//     return (
//       <Box sx={{ display:"flex",alignItems:"center",justifyContent:"center",py:12,flexDirection:"column",gap:2 }}>
//         <CircularProgress sx={{ color:"#4ade80" }} size={32} />
//         <Typography sx={{ fontSize:12,color:"rgba(232,245,233,0.4)",fontFamily:"'JetBrains Mono',monospace" }}>Loading configuration…</Typography>
//       </Box>
//     );
//   }

//   return (
//     <AnimatePresence mode="wait">
//       <motion.div key="config-panel" initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-16 }} transition={{ duration:0.4 }}>

//         {/* Header */}
//         <Box sx={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",mb:4,flexWrap:"wrap",gap:2 }}>
//           <Box>
//             <Typography sx={{ fontFamily:"'Cormorant Garamond',serif",fontSize:{ xs:"1.8rem",md:"2.4rem" },fontWeight:300,color:"#e8f5e9" }}>
//               Device Configuration
//             </Typography>
//             <Typography sx={{ fontSize:12,color:"rgba(232,245,233,0.38)",mt:0.4,fontFamily:"'JetBrains Mono',monospace" }}>
//               📡 {deviceId || "No device"} · Relay logic control
//             </Typography>
//           </Box>
//           <Box sx={{ display:"flex",gap:1.5,flexWrap:"wrap" }}>
//             <Button onClick={handleReset} size="small"
//               sx={{ fontSize:11,color:"rgba(232,245,233,0.4)",border:"1px solid rgba(74,222,128,0.15)",borderRadius:"8px",px:2,py:0.8,fontFamily:"'JetBrains Mono',monospace","&:hover":{ background:"rgba(74,222,128,0.05)",color:"#e8f5e9" } }}>
//               ↺ Reset
//             </Button>
//             <Button onClick={handleSaveAll} size="small"
//               sx={{ fontSize:11,color:"#4ade80",border:"1px solid rgba(74,222,128,0.3)",borderRadius:"8px",px:2,py:0.8,fontFamily:"'JetBrains Mono',monospace",background:"rgba(74,222,128,0.06)","&:hover":{ background:"rgba(74,222,128,0.12)" } }}>
//               ✓ Save All
//             </Button>
//             <Button onClick={fetchConfig} size="small"
//               sx={{ fontSize:11,color:"#4ade80",border:"1px solid rgba(74,222,128,0.2)",borderRadius:"8px",px:2,py:0.8,fontFamily:"'JetBrains Mono',monospace","&:hover":{ background:"rgba(74,222,128,0.06)" } }}>
//               ↻ Reload
//             </Button>
//           </Box>
//         </Box>

//         {fetchError && (
//           <Box sx={{ mb:3,p:2,borderRadius:"10px",background:"rgba(248,113,113,0.07)",border:"1px solid rgba(248,113,113,0.2)" }}>
//             <Typography sx={{ fontSize:13,color:"#f87171" }}>⚠ {fetchError}</Typography>
//             <Button size="small" onClick={fetchConfig} sx={{ mt:1,fontSize:11,color:"#f87171",border:"1px solid rgba(248,113,113,0.3)",borderRadius:"6px",px:1.5 }}>Retry</Button>
//           </Box>
//         )}

//         {/* Info box */}
//         <Box sx={{ mb:3.5,p:2.5,borderRadius:"12px",background:"rgba(74,222,128,0.04)",border:"1px solid rgba(74,222,128,0.1)" }}>
//           <Typography sx={{ fontSize:12,color:"rgba(232,245,233,0.5)",fontFamily:"'JetBrains Mono',monospace",lineHeight:1.8 }}>
//             ℹ️ Configure when each relay turns ON based on sensor readings. The ESP32 device reads these settings from MongoDB and applies relay logic automatically.
//           </Typography>
//         </Box>

//         {/* Relay cards grid */}
//         <Box sx={{ display:"grid",gridTemplateColumns:{ xs:"1fr",sm:"1fr",md:"repeat(3,1fr)" },gap:2.5,mb:4 }}>
//           {RELAY_META.map((meta) => (
//             <RelayCard
//               key={meta.key}
//               meta={meta}
//               rule={relays[meta.key] || DEFAULT_RELAYS[meta.key]}
//               onChange={handleRelayChange}
//               onSave={() => handleSave(meta.key)}
//               saving={saving[meta.key]}
//               lastSaved={lastSaved[meta.key]}
//             />
//           ))}
//         </Box>

//         {/* Summary table */}
//         <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}>
//           <Box sx={{ borderRadius:"14px",border:"1px solid rgba(74,222,128,0.1)",background:"rgba(8,15,10,0.6)",overflow:"hidden" }}>
//             <Box sx={{ px:3,py:2,borderBottom:"1px solid rgba(74,222,128,0.08)" }}>
//               <Typography sx={{ fontSize:13,fontWeight:500,color:"#e8f5e9" }}>Configuration Summary</Typography>
//               <Typography sx={{ fontSize:11,color:"rgba(232,245,233,0.3)",fontFamily:"'JetBrains Mono',monospace" }}>
//                 Current relay logic for {deviceId}
//               </Typography>
//             </Box>
//             <Box sx={{ overflowX:"auto" }}>
//               <Box component="table" sx={{ width:"100%",borderCollapse:"collapse" }}>
//                 <Box component="thead">
//                   <Box component="tr" sx={{ "& th":{ px:{ xs:2,md:3 },py:1.5,textAlign:"left",fontSize:10,letterSpacing:1.5,color:"rgba(232,245,233,0.3)",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace",fontWeight:400,borderBottom:"1px solid rgba(74,222,128,0.07)" } }}>
//                     <th>Relay</th><th>Status</th><th>Parameter</th><th>Op</th><th>Threshold</th><th>Condition</th>
//                   </Box>
//                 </Box>
//                 <Box component="tbody">
//                   {RELAY_META.map((meta) => {
//                     const r = relays[meta.key] || DEFAULT_RELAYS[meta.key];
//                     return (
//                       <Box component="tr" key={meta.key} sx={{ "& td":{ px:{ xs:2,md:3 },py:1.8,fontSize:12,color:"rgba(232,245,233,0.6)",borderBottom:"1px solid rgba(74,222,128,0.05)",fontFamily:"'JetBrains Mono',monospace" } }}>
//                         <Box component="td" sx={{ color:`${meta.color} !important`,fontWeight:500 }}>{meta.icon} {meta.label}</Box>
//                         <Box component="td">
//                           <Box sx={{ display:"inline-flex",alignItems:"center",gap:0.6,px:1.2,py:0.3,borderRadius:"20px",background:r.enabled?"rgba(74,222,128,0.1)":"rgba(248,113,113,0.1)",border:`1px solid ${r.enabled?"rgba(74,222,128,0.3)":"rgba(248,113,113,0.3)"}` }}>
//                             <Box sx={{ width:5,height:5,borderRadius:"50%",background:r.enabled?"#4ade80":"#f87171" }} />
//                             <Typography sx={{ fontSize:10,color:r.enabled?"#4ade80":"#f87171",fontFamily:"'JetBrains Mono',monospace" }}>{r.enabled?"ON":"OFF"}</Typography>
//                           </Box>
//                         </Box>
//                         <Box component="td">{r.parameter}</Box>
//                         <Box component="td" sx={{ color:`${meta.color} !important` }}>{r.operator}</Box>
//                         <Box component="td">{r.value}</Box>
//                         <Box component="td" sx={{ fontSize:"11px !important",color:"rgba(232,245,233,0.4) !important" }}>
//                           {r.enabled ? `ON when ${r.parameter} ${r.operator} ${r.value}` : "Disabled"}
//                         </Box>
//                       </Box>
//                     );
//                   })}
//                 </Box>
//               </Box>
//             </Box>
//           </Box>
//         </motion.div>

//         {/* Toast */}
//         <Snackbar
//           open={toast.open}
//           autoHideDuration={3500}
//           onClose={() => setToast((t) => ({ ...t, open:false }))}
//           anchorOrigin={{ vertical:"bottom", horizontal:"center" }}
//         >
//           <Alert
//             severity={toast.severity}
//             onClose={() => setToast((t) => ({ ...t, open:false }))}
//             sx={{
//               borderRadius:"10px",
//               background:toast.severity==="success"?"rgba(74,222,128,0.12)":toast.severity==="error"?"rgba(248,113,113,0.12)":"rgba(56,189,248,0.12)",
//               color:toast.severity==="success"?"#4ade80":toast.severity==="error"?"#f87171":"#38bdf8",
//               border:`1px solid ${toast.severity==="success"?"rgba(74,222,128,0.3)":toast.severity==="error"?"rgba(248,113,113,0.3)":"rgba(56,189,248,0.3)"}`,
//               "& .MuiAlert-icon":{ color:"inherit" },
//             }}
//           >
//             {toast.message}
//           </Alert>
//         </Snackbar>
//       </motion.div>
//     </AnimatePresence>
//   );
// }

// ════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab]         = useState("dashboard");
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [latest, setLatest]               = useState(null);
  const [history, setHistory]             = useState([]);
  const [allLatest, setAllLatest]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [lastUpdated, setLastUpdated]     = useState(null);
  const [activeChart, setActiveChart]     = useState("temperature");
  const [anchorEl, setAnchorEl]           = useState(null);
  const [fetchError, setFetchError]       = useState("");
  const [flashCards, setFlashCards]       = useState(false);
  const [liveCount, setLiveCount]         = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const unsubRef = useRef(null);

  useEffect(() => { if (!user) navigate("/login"); }, [user]);

  const formatForChart = (doc) => ({
    time:        new Date(doc.time).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }),
    temperature: doc.temperature ?? null,
    humidity:    doc.humidity    ?? null,
    soil:        doc.soil        ?? null,
  });

  const fetchDevice = useCallback(async (deviceId) => {
    if (!deviceId) return;
    try {
      setFetchError("");
      const [latestDoc, historyDocs] = await Promise.all([
        getLatestReading(deviceId),
        getSensorHistory(deviceId, 30),
      ]);
      setLatest(latestDoc);
      setHistory(historyDocs.map(formatForChart));
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setFetchError("Cannot reach backend. Is server.js running on port 5000?");
    }
  }, []);

  const fetchAllLatest = useCallback(async () => {
    try {
      const data = await getAllLatest();
      setAllLatest(data);
      if (data.length > 0 && !selectedDevice) setSelectedDevice(data[0].deviceId);
    } catch (err) {
      setFetchError("Cannot reach backend.");
    }
  }, [selectedDevice]);

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      setLoading(true);
      if (user.role === "admin") await fetchAllLatest();
      else setSelectedDevice(user.deviceId);
      setLoading(false);
    };
    init();
  }, [user]);

  useEffect(() => { if (selectedDevice) fetchDevice(selectedDevice); }, [selectedDevice]);

  useEffect(() => {
    if (!selectedDevice) return;
    if (unsubRef.current) unsubRef.current();
    unsubRef.current = subscribeToLive((newDoc) => {
      if (newDoc.deviceId !== selectedDevice) {
        if (user?.role === "admin")
          setAllLatest((prev) => prev.map((d) => d.deviceId===newDoc.deviceId ? newDoc : d));
        return;
      }
      setLatest(newDoc);
      setLastUpdated(new Date().toLocaleTimeString());
      setLiveCount((c) => c + 1);
      setFlashCards(true);
      setTimeout(() => setFlashCards(false), 500);
      setHistory((prev) => [...prev, formatForChart(newDoc)].slice(-30));
      if (user?.role === "admin")
        setAllLatest((prev) => prev.map((d) => d.deviceId===newDoc.deviceId ? newDoc : d));
    });
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, [selectedDevice, user]);

  if (!user) return null;
  const chartMeta = CHART_META.find((m) => m.key === activeChart);

  return (
    <Box sx={{ minHeight:"100vh",background:"#040d08",color:"#e8f5e9" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Cormorant+Garamond:ital,wght@0,300;0,600;1,300&family=JetBrains+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;font-family:'DM Sans',sans-serif}
        ::selection{background:rgba(74,222,128,0.25)}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#040d08}::-webkit-scrollbar-thumb{background:#2d6a4f;border-radius:2px}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}
      `}</style>

      {/* ── TOPBAR ── */}
      <Box sx={{ px:{ xs:2,md:5 },py:2,display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid rgba(74,222,128,0.08)",background:"rgba(4,13,8,0.95)",backdropFilter:"blur(16px)",position:"sticky",top:0,zIndex:100 }}>
        <Box sx={{ display:"flex",alignItems:"center",gap:{ xs:1.5,md:2 } }}>
          <Box sx={{ width:28,height:28,borderRadius:"7px",background:"linear-gradient(135deg,#2d6a4f,#4ade80)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0 }}>🌿</Box>
          <Typography sx={{ fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:600,color:"#e8f5e9",display:{ xs:"none",sm:"block" } }}>SmartCultivation</Typography>
          <Box sx={{ display:"flex",alignItems:"center",gap:0.7,px:1.5,py:0.5,borderRadius:"20px",background:"rgba(74,222,128,0.07)",border:"1px solid rgba(74,222,128,0.18)" }}>
            <Box sx={{ width:5,height:5,borderRadius:"50%",background:"#4ade80",animation:"pulse 2s infinite" }} />
            <Typography sx={{ fontSize:10,color:"#4ade80",fontFamily:"'JetBrains Mono',monospace" }}>LIVE</Typography>
          </Box>
          {liveCount > 0 && (
            <Box sx={{ px:1.5,py:0.4,borderRadius:"20px",background:"rgba(74,222,128,0.1)",border:"1px solid rgba(74,222,128,0.2)",display:{ xs:"none",sm:"block" } }}>
              <Typography sx={{ fontSize:10,color:"#4ade80",fontFamily:"'JetBrains Mono',monospace" }}>⚡ {liveCount}</Typography>
            </Box>
          )}
          {lastUpdated && (
            <Typography sx={{ fontSize:10,color:"rgba(232,245,233,0.28)",fontFamily:"'JetBrains Mono',monospace",display:{ xs:"none",md:"block" } }}>
              Last: {lastUpdated}
            </Typography>
          )}
        </Box>

        <Box sx={{ display:"flex",alignItems:"center",gap:{ xs:1,md:2 } }}>
          {/* Nav tabs — desktop */}
          <Box sx={{ display:{ xs:"none",sm:"flex" },gap:1 }}>
            {NAV_TABS.filter(tab => !tab.adminOnly || user.role === "admin").map((tab) => (
              <Box key={tab.key} onClick={() => handleNavAction(tab.key, navigate, setActiveTab)}
                sx={{ px:2,py:0.7,borderRadius:"8px",cursor:"pointer",display:"flex",alignItems:"center",gap:0.7,
                  border:`1px solid ${activeTab===tab.key?"rgba(74,222,128,0.4)":"rgba(74,222,128,0.1)"}`,
                  background:activeTab===tab.key?"rgba(74,222,128,0.1)":"transparent",
                  transition:"all 0.2s","&:hover":{ borderColor:"rgba(74,222,128,0.3)" } }}>
                <Typography sx={{ fontSize:11 }}>{tab.icon}</Typography>
                <Typography sx={{ fontSize:11,color:activeTab===tab.key?"#4ade80":"rgba(232,245,233,0.5)",fontFamily:"'JetBrains Mono',monospace" }}>{tab.label}</Typography>
              </Box>
            ))}
          </Box>

          <Box sx={{ px:1.5,py:0.5,borderRadius:"6px",background:user.role==="admin"?"rgba(251,191,36,0.1)":"rgba(74,222,128,0.08)",border:`1px solid ${user.role==="admin"?"rgba(251,191,36,0.25)":"rgba(74,222,128,0.2)"}`,display:{ xs:"none",md:"block" } }}>
            <Typography sx={{ fontSize:10,letterSpacing:1,textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace",color:user.role==="admin"?"#fbbf24":"#4ade80" }}>
              {user.role==="admin"?"🛡 Admin":"👤 User"}
            </Typography>
          </Box>

          <Avatar onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{ width:34,height:34,cursor:"pointer",background:"linear-gradient(135deg,#2d6a4f,#4ade80)",fontSize:13,fontWeight:600,color:"#040d08",flexShrink:0 }}>
            {user.name?.[0]?.toUpperCase()}
          </Avatar>

          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
            PaperProps={{ sx:{ background:"rgba(8,15,10,0.97)",border:"1px solid rgba(74,222,128,0.15)",borderRadius:"10px",mt:1,minWidth:200 } }}>
            <Box sx={{ px:2,py:1.5 }}>
              <Typography sx={{ fontSize:14,color:"#e8f5e9",fontWeight:500 }}>{user.name}</Typography>
              <Typography sx={{ fontSize:12,color:"rgba(232,245,233,0.4)" }}>{user.email}</Typography>
              {user.deviceId && (
                <Typography sx={{ fontSize:11,color:"#4ade80",fontFamily:"'JetBrains Mono',monospace",mt:0.5 }}>📡 {user.deviceId}</Typography>
              )}
            </Box>
            <Divider sx={{ borderColor:"rgba(74,222,128,0.1)" }} />
            {/* Mobile nav items in menu */}
            <Box sx={{ display:{ xs:"block",sm:"none" } }}>
              {NAV_TABS.filter(tab => !tab.adminOnly || user.role === "admin").map((tab) => (
                <MenuItem key={tab.key} onClick={() => { handleNavAction(tab.key, navigate, setActiveTab); setAnchorEl(null); }}
                  sx={{ color:activeTab===tab.key?"#4ade80":"rgba(232,245,233,0.7)",fontSize:13,"&:hover":{ background:"rgba(74,222,128,0.08)" } }}>
                  {tab.icon} &nbsp;{tab.label}
                </MenuItem>
              ))}
              <Divider sx={{ borderColor:"rgba(74,222,128,0.1)" }} />
            </Box>
            <MenuItem onClick={() => { setAnchorEl(null); logout(); navigate("/"); }}
              sx={{ color:"#f87171",fontSize:13,"&:hover":{ background:"rgba(248,113,113,0.08)" } }}>
              ⎋ Sign Out
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      <Box sx={{ display:"flex" }}>

        {/* ── SIDEBAR admin ── */}
        {user.role === "admin" && (
          <Box sx={{ width:220,minHeight:"calc(100vh - 57px)",borderRight:"1px solid rgba(74,222,128,0.08)",background:"rgba(4,13,8,0.6)",p:2,flexShrink:0,display:{ xs:"none",md:"block" },overflowY:"auto" }}>
            <Typography sx={{ fontSize:10,letterSpacing:2,color:"rgba(232,245,233,0.3)",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace",mb:2 }}>
              Devices ({allLatest.length})
            </Typography>
            {allLatest.map((d) => (
              <Box key={d.deviceId} onClick={() => setSelectedDevice(d.deviceId)}
                sx={{ p:1.5,borderRadius:"10px",cursor:"pointer",mb:1.5,transition:"all 0.2s",
                  border:`1px solid ${selectedDevice===d.deviceId?"rgba(74,222,128,0.4)":"rgba(74,222,128,0.08)"}`,
                  background:selectedDevice===d.deviceId?"rgba(74,222,128,0.08)":"rgba(74,222,128,0.02)",
                  "&:hover":{ borderColor:"rgba(74,222,128,0.25)" } }}>
                <Typography sx={{ fontSize:11,fontWeight:500,color:"#e8f5e9",fontFamily:"'JetBrains Mono',monospace",mb:0.3 }}>📡 {d.deviceId}</Typography>
                <Typography sx={{ fontSize:10,color:"rgba(232,245,233,0.45)" }}>🌡 {d.temperature ?? "—"}°C  💧 {d.humidity ?? "—"}%</Typography>
                {d.soilStatus && (
                  <Typography sx={{ fontSize:10,color:soilStatusColor(d.soilStatus).text,mt:0.3 }}>🪴 {d.soilStatus}</Typography>
                )}
                <Typography sx={{ fontSize:9,color:"rgba(232,245,233,0.25)",mt:0.5,fontFamily:"'JetBrains Mono',monospace" }}>
                  {d.time ? new Date(d.time).toLocaleTimeString() : "—"}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        {/* ── MAIN CONTENT ── */}
        <Box sx={{ flex:1,p:{ xs:2,sm:3,md:4 },overflowX:"hidden",maxWidth:"100%" }}>

          {fetchError && (
            <Box sx={{ mb:3,p:2.5,borderRadius:"10px",background:"rgba(248,113,113,0.07)",border:"1px solid rgba(248,113,113,0.2)" }}>
              <Typography sx={{ fontSize:13,color:"#f87171" }}>⚠ {fetchError}</Typography>
              <Typography sx={{ fontSize:11,color:"rgba(248,113,113,0.55)",mt:0.5,fontFamily:"'JetBrains Mono',monospace" }}>Check: Is server.js running? → node server.js</Typography>
            </Box>
          )}

          {loading ? (
            <Box sx={{ display:"flex",alignItems:"center",justifyContent:"center",height:"60vh",flexDirection:"column",gap:2 }}>
              <CircularProgress sx={{ color:"#4ade80" }} />
              <Typography sx={{ fontSize:13,color:"rgba(232,245,233,0.4)",fontFamily:"'JetBrains Mono',monospace" }}>Connecting to MongoDB Atlas…</Typography>
            </Box>
          ) : (
            <>
             {/* CONFIG TAB */}
              {activeTab === "config" && (
                <DeviceConfig deviceId={selectedDevice} />
              )}

              {/* ══════════ FIRMWARE TAB (admin only) ══════════ */}
              {activeTab === "firmware" && user.role === "admin" && (
                <FirmwareUpload />
              )}

              {/* ══════════ DASHBOARD TAB ══════════ */}
              {activeTab === "dashboard" && (
                <AnimatePresence mode="wait">
                  <motion.div key={selectedDevice}
                    initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-16 }}
                    transition={{ duration:0.4 }}>

                    {/* Header */}
                    <Box sx={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",mb:3,flexWrap:"wrap",gap:2 }}>
                      <Box sx={{ minWidth:0 }}>
                        <Typography sx={{ fontFamily:"'Cormorant Garamond',serif",fontSize:{ xs:"1.6rem",sm:"2rem",md:"2.4rem" },fontWeight:300,color:"#e8f5e9",wordBreak:"break-word" }}>
                          {selectedDevice || "No Device"}
                        </Typography>
                        <Typography sx={{ fontSize:{ xs:11,md:12 },color:"rgba(232,245,233,0.38)",mt:0.4,fontFamily:"'JetBrains Mono',monospace" }}>
                          {user.role==="admin" ? `Admin · ${allLatest.length} device(s)` : `${user.email} · SSE live stream`}
                        </Typography>
                      </Box>
                      <Box sx={{ display:"flex",gap:1,flexShrink:0 }}>
                        <Button onClick={() => fetchDevice(selectedDevice)}
                          sx={{ fontSize:12,color:"#4ade80",border:"1px solid rgba(74,222,128,0.2)",borderRadius:"8px",px:2,py:0.8,whiteSpace:"nowrap","&:hover":{ background:"rgba(74,222,128,0.06)" } }}>
                          ↻ Refresh
                        </Button>
                        <Button onClick={() => navigate("/history")}
                          sx={{ fontSize:12,color:"#38bdf8",border:"1px solid rgba(56,189,248,0.2)",borderRadius:"8px",px:2,py:0.8,whiteSpace:"nowrap","&:hover":{ background:"rgba(56,189,248,0.06)" } }}>
                          🕘 History
                        </Button>
                        <Button onClick={() => setActiveTab("config")}
                          sx={{ fontSize:12,color:"#fbbf24",border:"1px solid rgba(251,191,36,0.2)",borderRadius:"8px",px:2,py:0.8,whiteSpace:"nowrap","&:hover":{ background:"rgba(251,191,36,0.06)" } }}>
                          ⚙️ Config
                        </Button>
                      </Box>
                    </Box>

                    {/* Mobile device tabs */}
                    {user.role === "admin" && (
                      <Box sx={{ display:{ xs:"flex",md:"none" },gap:1,mb:3,overflowX:"auto",pb:1,
                        "&::-webkit-scrollbar":{ height:"2px" },"&::-webkit-scrollbar-thumb":{ background:"#2d6a4f" } }}>
                        {allLatest.map((d) => (
                          <Box key={d.deviceId} onClick={() => setSelectedDevice(d.deviceId)}
                            sx={{ px:2,py:1,borderRadius:"8px",cursor:"pointer",flexShrink:0,
                              border:`1px solid ${selectedDevice===d.deviceId?"rgba(74,222,128,0.4)":"rgba(74,222,128,0.1)"}`,
                              background:selectedDevice===d.deviceId?"rgba(74,222,128,0.08)":"transparent" }}>
                            <Typography sx={{ fontSize:11,color:selectedDevice===d.deviceId?"#4ade80":"rgba(232,245,233,0.5)",fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap" }}>
                              {d.deviceId}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    )}

                    {/* ── SENSOR CARDS ── */}
                    <Grid container spacing={{ xs:1.5,md:2.5 }} sx={{ mb:{ xs:3,md:4 } }}>
                      <Grid item xs={12} sm={6} md={4}>
                        <SensorCard meta={SENSOR_META[0]} value={latest?.temperature ?? null} i={0} />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <SensorCard meta={SENSOR_META[1]} value={latest?.humidity ?? null} i={1} />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <SensorCard meta={SENSOR_META[2]} value={latest?.soil ?? null} i={2} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <SoilStatusCard status={latest?.soilStatus ?? null} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4}>
                          <Box sx={{ p:3,borderRadius:"14px",border:"1px solid rgba(74,222,128,0.1)",background:"rgba(8,15,10,0.6)",backdropFilter:"blur(12px)",height:"100%",display:"flex",flexDirection:"column",justifyContent:"space-between" }}>
                            <Typography sx={{ fontSize:10,letterSpacing:2,color:"rgba(232,245,233,0.35)",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace",mb:1.5 }}>
                              Last IoT Reading
                            </Typography>
                            {latest?.time ? (
                              <>
                                <Box sx={{ display:"flex",alignItems:"center",gap:1,mb:1 }}>
                                  <Box sx={{ width:6,height:6,borderRadius:"50%",background:"#4ade80",animation:"pulse 2s infinite",flexShrink:0 }} />
                                  <Typography sx={{ fontSize:13,color:"#e8f5e9",fontFamily:"'JetBrains Mono',monospace" }}>
                                    {new Date(latest.time).toLocaleTimeString()}
                                  </Typography>
                                </Box>
                                <Typography sx={{ fontSize:11,color:"rgba(232,245,233,0.3)",fontFamily:"'JetBrains Mono',monospace" }}>
                                  {new Date(latest.time).toLocaleDateString()}
                                </Typography>
                                <Typography sx={{ fontSize:11,color:"rgba(232,245,233,0.3)",fontFamily:"'JetBrains Mono',monospace",mt:0.5 }}>
                                  📡 {latest.deviceId}
                                </Typography>
                              </>
                            ) : (
                              <Typography sx={{ fontSize:13,color:"rgba(232,245,233,0.3)",fontFamily:"'JetBrains Mono',monospace" }}>No data yet</Typography>
                            )}
                          </Box>
                        </motion.div>
                      </Grid>
                    </Grid>

                    {/* ── DEVICE CONTROLS ── */}
                    <DeviceStatusRow
                      light={latest?.light ?? null}
                      fan={latest?.fan ?? null}
                      motor={latest?.motor ?? null}
                    />

                    {/* ── CHART (now with soil tab) ── */}
                    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={5}>
                      <Box sx={{ borderRadius:"14px",border:"1px solid rgba(74,222,128,0.1)",background:"rgba(8,15,10,0.7)",backdropFilter:"blur(12px)",overflow:"hidden",mb:4 }}>
                        <Box sx={{ px:{ xs:2,md:3 },py:2.5,borderBottom:"1px solid rgba(74,222,128,0.08)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:2 }}>
                          <Box>
                            <Typography sx={{ fontSize:14,fontWeight:500,color:"#e8f5e9",mb:0.3 }}>Sensor History</Typography>
                            <Typography sx={{ fontSize:11,color:"rgba(232,245,233,0.35)",fontFamily:"'JetBrains Mono',monospace" }}>
                              {history.length} readings · updates automatically
                            </Typography>
                          </Box>
                          <Box sx={{ display:"flex",gap:1,flexWrap:"wrap" }}>
                            {CHART_META.map((m) => (
                              <Box key={m.key} onClick={() => setActiveChart(m.key)}
                                sx={{ px:{ xs:1.5,md:2 },py:0.7,borderRadius:"6px",cursor:"pointer",fontSize:12,fontFamily:"'JetBrains Mono',monospace",transition:"all 0.2s",
                                  border:`1px solid ${activeChart===m.key?m.color+"55":"rgba(74,222,128,0.1)"}`,
                                  background:activeChart===m.key?m.color+"18":"transparent",
                                  color:activeChart===m.key?m.color:"rgba(232,245,233,0.4)",
                                  "&:hover":{ color:m.color },
                                  whiteSpace:"nowrap" }}>
                                {m.icon} <Box component="span" sx={{ display:{ xs:"none",sm:"inline" } }}>{m.label}</Box>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                        <Box sx={{ p:{ xs:1.5,md:3 } }}>
                          {history.length === 0 ? (
                            <Box sx={{ textAlign:"center",py:7 }}>
                              <Typography sx={{ fontSize:13,color:"rgba(232,245,233,0.3)",fontFamily:"'JetBrains Mono',monospace" }}>
                                No history yet for {selectedDevice}
                              </Typography>
                            </Box>
                          ) : (
                            <ResponsiveContainer width="100%" height={240}>
                              <AreaChart data={history} margin={{ top:5,right:5,left:-20,bottom:0 }}>
                                <defs>
                                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%"  stopColor={chartMeta?.color} stopOpacity={0.28} />
                                    <stop offset="95%" stopColor={chartMeta?.color} stopOpacity={0}    />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(74,222,128,0.06)" />
                                <XAxis dataKey="time" tick={{ fill:"rgba(232,245,233,0.35)",fontSize:10,fontFamily:"JetBrains Mono" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                <YAxis tick={{ fill:"rgba(232,245,233,0.35)",fontSize:10,fontFamily:"JetBrains Mono" }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey={activeChart}
                                  stroke={chartMeta?.color} strokeWidth={2.5}
                                  fill="url(#grad)" dot={false}
                                  activeDot={{ r:5,fill:chartMeta?.color,stroke:"#040d08",strokeWidth:2 }}
                                  name={chartMeta?.unit}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          )}
                        </Box>
                      </Box>
                    </motion.div>

                    {/* ── ADMIN TABLE ── */}
                    {user.role==="admin" && allLatest.length > 0 && (
                      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={6}>
                        <Box sx={{ borderRadius:"14px",border:"1px solid rgba(74,222,128,0.1)",background:"rgba(8,15,10,0.7)",overflow:"hidden" }}>
                          <Box sx={{ px:3,py:2,borderBottom:"1px solid rgba(74,222,128,0.08)" }}>
                            <Typography sx={{ fontSize:14,fontWeight:500,color:"#e8f5e9" }}>All Devices</Typography>
                            <Typography sx={{ fontSize:11,color:"rgba(232,245,233,0.3)",fontFamily:"'JetBrains Mono',monospace" }}>Live from MongoDB Atlas · SSE streaming</Typography>
                          </Box>
                          <Box sx={{ overflowX:"auto" }}>
                            <Box component="table" sx={{ width:"100%",borderCollapse:"collapse" }}>
                              <Box component="thead">
                                <Box component="tr" sx={{ "& th":{ px:{ xs:1.5,md:3 },py:1.5,textAlign:"left",fontSize:10,letterSpacing:1.5,color:"rgba(232,245,233,0.3)",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace",fontWeight:400,borderBottom:"1px solid rgba(74,222,128,0.07)",whiteSpace:"nowrap" } }}>
                                  <th>Device</th><th>Temp</th><th>Hum</th><th>Soil</th><th>Status</th><th>Light</th><th>Fan</th><th>Motor</th><th>Time</th>
                                </Box>
                              </Box>
                              <Box component="tbody">
                                {allLatest.map((d) => {
                                  const sc = soilStatusColor(d.soilStatus);
                                  return (
                                    <Box component="tr" key={d.deviceId} onClick={() => setSelectedDevice(d.deviceId)}
                                      sx={{ cursor:"pointer","&:hover":{ background:"rgba(74,222,128,0.04)" },"& td":{ px:{ xs:1.5,md:3 },py:{ xs:1.5,md:2 },fontSize:{ xs:11,md:13 },color:"rgba(232,245,233,0.65)",borderBottom:"1px solid rgba(74,222,128,0.05)",fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap" } }}>
                                      <Box component="td" sx={{ color:"#4ade80 !important",fontWeight:500 }}>📡 {d.deviceId}</Box>
                                      <Box component="td">{d.temperature ?? "—"}°C</Box>
                                      <Box component="td">{d.humidity ?? "—"}%</Box>
                                      <Box component="td">{d.soil ?? "—"}</Box>
                                      <Box component="td">
                                        {d.soilStatus ? (
                                          <Box sx={{ display:"inline-flex",alignItems:"center",px:1.2,py:0.4,borderRadius:"20px",background:sc.bg,border:`1px solid ${sc.border}` }}>
                                            <Typography sx={{ fontSize:10,color:sc.text,fontFamily:"'JetBrains Mono',monospace" }}>{d.soilStatus}</Typography>
                                          </Box>
                                        ) : "—"}
                                      </Box>
                                      <Box component="td" sx={{ color:`${statusIcon(d.light).color} !important` }}>{d.light ?? "—"}</Box>
                                      <Box component="td" sx={{ color:`${statusIcon(d.fan).color} !important`   }}>{d.fan   ?? "—"}</Box>
                                      <Box component="td" sx={{ color:`${statusIcon(d.motor).color} !important` }}>{d.motor ?? "—"}</Box>
                                      <Box component="td" sx={{ fontSize:"10px !important",color:"rgba(232,245,233,0.35) !important" }}>
                                        {d.time ? new Date(d.time).toLocaleTimeString() : "—"}
                                      </Box>
                                    </Box>
                                  );
                                })}
                              </Box>
                            </Box>
                          </Box>
                        </Box>
                      </motion.div>
                    )}

                  </motion.div>
                </AnimatePresence>
              )}
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
