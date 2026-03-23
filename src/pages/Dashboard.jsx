// ── src/pages/Dashboard.jsx ─────────────────────────────────────────
// Real-time MongoDB data via SSE (Server-Sent Events)
// Fields: deviceId, temperature, humidity, time
// Auto-updates instantly when IoT pushes new data to MongoDB

import {
  Box, Typography, Grid, Button, Avatar,
  Menu, MenuItem, Divider, LinearProgress, CircularProgress,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getLatestReading, getSensorHistory,
  getAllLatest, subscribeToLive,
} from "../services/api";
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// ── Sensor display config (only temp + humidity — your actual fields) ─
const SENSOR_META = [
  { key:"temperature", label:"Temperature", icon:"🌡", color:"#f97316", unit:"°C", min:15, max:45 },
  { key:"humidity",    label:"Humidity",    icon:"💧", color:"#38bdf8", unit:"%",  min:20, max:90 },
];

const fadeUp = {
  hidden: { opacity:0, y:20 },
  visible: (i=0) => ({ opacity:1, y:0, transition:{ duration:0.5, delay:i*0.08 } }),
};

// ── Custom chart tooltip ─────────────────────────────────────────────
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

// ── Single Sensor Card ───────────────────────────────────────────────
function SensorCard({ meta, value, i, flash }) {
  const isOk     = value !== null && value >= meta.min && value <= meta.max;
  const progress = value !== null
    ? Math.min(100, Math.max(0, ((value - meta.min) / (meta.max - meta.min)) * 100))
    : 0;

  return (
    <motion.div
      variants={fadeUp} initial="hidden" animate="visible" custom={i}
      animate={flash ? { scale:[1, 1.04, 1] } : {}}
      transition={flash ? { duration:0.4 } : undefined}
    >
      <Box sx={{
        p:3, borderRadius:"14px",
        border:`1px solid ${isOk ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.3)"}`,
        background: isOk ? "rgba(74,222,128,0.03)" : "rgba(248,113,113,0.05)",
        transition:"all 0.3s",
        "&:hover":{ borderColor: isOk ? "rgba(74,222,128,0.35)" : "rgba(248,113,113,0.5)", transform:"translateY(-3px)", boxShadow:"0 16px 40px rgba(0,0,0,0.35)" },
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
              <Typography sx={{ fontSize:14,color:"rgba(232,245,233,0.4)" }}>{meta.unit}</Typography>
            </Box>
          </Box>
          <Box sx={{ px:1.5,py:0.6,borderRadius:"20px",background:isOk?"rgba(74,222,128,0.1)":"rgba(248,113,113,0.12)",border:`1px solid ${isOk?"rgba(74,222,128,0.3)":"rgba(248,113,113,0.35)"}` }}>
            <Typography sx={{ fontSize:10,color:isOk?"#4ade80":"#f87171",fontFamily:"'JetBrains Mono',monospace",letterSpacing:0.5 }}>
              {value === null ? "NO DATA" : isOk ? "● NORMAL" : "⚠ CHECK"}
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

// ════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [selectedDevice, setSelectedDevice] = useState(null);
  const [latest, setLatest]                 = useState(null);
  const [history, setHistory]               = useState([]);
  const [allLatest, setAllLatest]           = useState([]);
  const [loading, setLoading]               = useState(true);
  const [lastUpdated, setLastUpdated]       = useState(null);
  const [activeChart, setActiveChart]       = useState("temperature");
  const [anchorEl, setAnchorEl]             = useState(null);
  const [fetchError, setFetchError]         = useState("");
  const [flashCards, setFlashCards]         = useState(false); // animation on new data
  const [liveCount, setLiveCount]           = useState(0);     // counts live updates received
  const unsubRef = useRef(null);

  useEffect(() => { if (!user) navigate("/login"); }, [user]);

  // ── Format a raw MongoDB doc into chart-friendly shape ──────────
  const formatForChart = (doc) => ({
    time:        new Date(doc.time).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }),
    temperature: doc.temperature ?? null,
    humidity:    doc.humidity    ?? null,
  });

  // ── Fetch latest + history for selected device ───────────────────
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

  // ── Fetch all devices (admin) ────────────────────────────────────
  const fetchAllLatest = useCallback(async () => {
    try {
      const data = await getAllLatest();
      setAllLatest(data);
      if (data.length > 0 && !selectedDevice) {
        setSelectedDevice(data[0].deviceId);
      }
    } catch (err) {
      setFetchError("Cannot reach backend.");
    }
  }, [selectedDevice]);

  // ── Initial load ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const init = async () => {
      setLoading(true);
      if (user.role === "admin") {
        await fetchAllLatest();
      } else {
        // user.deviceId comes from login response e.g. "chamber-001"
        setSelectedDevice(user.deviceId);
      }
      setLoading(false);
    };
    init();
  }, [user]);

  // ── Fetch data when device selection changes ─────────────────────
  useEffect(() => {
    if (selectedDevice) fetchDevice(selectedDevice);
  }, [selectedDevice]);

  // ── SSE: subscribe to live updates ──────────────────────────────
  // When IoT pushes to MongoDB → Change Stream → SSE → this handler
  useEffect(() => {
    if (!selectedDevice) return;

    // Unsubscribe previous
    if (unsubRef.current) unsubRef.current();

    unsubRef.current = subscribeToLive((newDoc) => {
      // Only update if this reading belongs to the currently viewed device
      if (newDoc.deviceId !== selectedDevice) {
        // Still update admin sidebar counts
        if (user?.role === "admin") {
          setAllLatest((prev) =>
            prev.map((d) => d.deviceId === newDoc.deviceId ? newDoc : d)
          );
        }
        return;
      }

      console.log("⚡ Live update received:", newDoc);

      // Update the metric cards
      setLatest(newDoc);
      setLastUpdated(new Date().toLocaleTimeString());
      setLiveCount((c) => c + 1);

      // Flash animation on cards
      setFlashCards(true);
      setTimeout(() => setFlashCards(false), 500);

      // Append to chart history (keep last 30 points)
      setHistory((prev) => {
        const next = [...prev, formatForChart(newDoc)];
        return next.slice(-30);
      });

      // Update admin sidebar
      if (user?.role === "admin") {
        setAllLatest((prev) =>
          prev.map((d) => d.deviceId === newDoc.deviceId ? newDoc : d)
        );
      }
    });

    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, [selectedDevice, user]);

  if (!user) return null;
  const chartMeta = SENSOR_META.find((m) => m.key === activeChart);

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
      <Box sx={{ px:{xs:2,md:5},py:2,display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid rgba(74,222,128,0.08)",background:"rgba(4,13,8,0.95)",backdropFilter:"blur(16px)",position:"sticky",top:0,zIndex:100 }}>
        <Box sx={{ display:"flex",alignItems:"center",gap:2 }}>
          <Box sx={{ width:28,height:28,borderRadius:"7px",background:"linear-gradient(135deg,#2d6a4f,#4ade80)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14 }}>🌿</Box>
          <Typography sx={{ fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:600,color:"#e8f5e9",display:{xs:"none",sm:"block"} }}>SmartCultivation</Typography>

          {/* Live badge */}
          <Box sx={{ display:"flex",alignItems:"center",gap:0.7,px:1.5,py:0.5,borderRadius:"20px",background:"rgba(74,222,128,0.07)",border:"1px solid rgba(74,222,128,0.18)" }}>
            <Box sx={{ width:5,height:5,borderRadius:"50%",background:"#4ade80",animation:"pulse 2s infinite" }} />
            <Typography sx={{ fontSize:10,color:"#4ade80",fontFamily:"'JetBrains Mono',monospace" }}>LIVE</Typography>
          </Box>

          {/* Live update counter */}
          {liveCount > 0 && (
            <Box sx={{ px:1.5,py:0.4,borderRadius:"20px",background:"rgba(74,222,128,0.1)",border:"1px solid rgba(74,222,128,0.2)" }}>
              <Typography sx={{ fontSize:10,color:"#4ade80",fontFamily:"'JetBrains Mono',monospace" }}>
                ⚡ {liveCount} live update{liveCount !== 1 ? "s" : ""}
              </Typography>
            </Box>
          )}

          {lastUpdated && (
            <Typography sx={{ fontSize:10,color:"rgba(232,245,233,0.28)",fontFamily:"'JetBrains Mono',monospace",display:{xs:"none",md:"block"} }}>
              Last: {lastUpdated}
            </Typography>
          )}
        </Box>

        <Box sx={{ display:"flex",alignItems:"center",gap:2 }}>
          <Box sx={{ px:1.5,py:0.5,borderRadius:"6px",background:user.role==="admin"?"rgba(251,191,36,0.1)":"rgba(74,222,128,0.08)",border:`1px solid ${user.role==="admin"?"rgba(251,191,36,0.25)":"rgba(74,222,128,0.2)"}` }}>
            <Typography sx={{ fontSize:10,letterSpacing:1,textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace",color:user.role==="admin"?"#fbbf24":"#4ade80" }}>
              {user.role==="admin" ? "🛡 Admin" : "👤 User"}
            </Typography>
          </Box>
          <Avatar onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{ width:34,height:34,cursor:"pointer",background:"linear-gradient(135deg,#2d6a4f,#4ade80)",fontSize:13,fontWeight:600,color:"#040d08" }}>
            {user.name?.[0]?.toUpperCase()}
          </Avatar>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
            PaperProps={{ sx:{ background:"rgba(8,15,10,0.97)",border:"1px solid rgba(74,222,128,0.15)",borderRadius:"10px",mt:1,minWidth:200 } }}>
            <Box sx={{ px:2,py:1.5 }}>
              <Typography sx={{ fontSize:14,color:"#e8f5e9",fontWeight:500 }}>{user.name}</Typography>
              <Typography sx={{ fontSize:12,color:"rgba(232,245,233,0.4)" }}>{user.email}</Typography>
              {user.deviceId && (
                <Typography sx={{ fontSize:11,color:"#4ade80",fontFamily:"'JetBrains Mono',monospace",mt:0.5 }}>
                  📡 {user.deviceId}
                </Typography>
              )}
            </Box>
            <Divider sx={{ borderColor:"rgba(74,222,128,0.1)" }} />
            <MenuItem onClick={() => { setAnchorEl(null); logout(); navigate("/"); }}
              sx={{ color:"#f87171",fontSize:13,"&:hover":{ background:"rgba(248,113,113,0.08)" } }}>
              ⎋ Sign Out
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      <Box sx={{ display:"flex" }}>
        {/* ── SIDEBAR — admin only ── */}
        {user.role === "admin" && (
          <Box sx={{ width:240,minHeight:"calc(100vh - 57px)",borderRight:"1px solid rgba(74,222,128,0.08)",background:"rgba(4,13,8,0.6)",p:2.5,flexShrink:0,display:{xs:"none",md:"block"} }}>
            <Typography sx={{ fontSize:10,letterSpacing:2,color:"rgba(232,245,233,0.3)",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace",mb:2 }}>
              Devices ({allLatest.length})
            </Typography>
            {allLatest.map((d) => (
              <Box key={d.deviceId} onClick={() => setSelectedDevice(d.deviceId)}
                sx={{ p:2,borderRadius:"10px",cursor:"pointer",mb:1.5,transition:"all 0.2s",
                  border:`1px solid ${selectedDevice===d.deviceId?"rgba(74,222,128,0.4)":"rgba(74,222,128,0.08)"}`,
                  background:selectedDevice===d.deviceId?"rgba(74,222,128,0.08)":"rgba(74,222,128,0.02)",
                  "&:hover":{ borderColor:"rgba(74,222,128,0.25)" } }}>
                <Typography sx={{ fontSize:12,fontWeight:500,color:"#e8f5e9",fontFamily:"'JetBrains Mono',monospace",mb:0.5 }}>
                  📡 {d.deviceId}
                </Typography>
                <Typography sx={{ fontSize:11,color:"rgba(232,245,233,0.45)" }}>
                  🌡 {d.temperature ?? "—"}°C &nbsp; 💧 {d.humidity ?? "—"}%
                </Typography>
                <Typography sx={{ fontSize:10,color:"rgba(232,245,233,0.25)",mt:0.5,fontFamily:"'JetBrains Mono',monospace" }}>
                  {d.time ? new Date(d.time).toLocaleTimeString() : "—"}
                </Typography>
              </Box>
            ))}
          </Box>
        )}

        {/* ── MAIN CONTENT ── */}
        <Box sx={{ flex:1,p:{xs:2,md:4},overflowX:"hidden" }}>

          {/* Error */}
          {fetchError && (
            <Box sx={{ mb:3,p:2.5,borderRadius:"10px",background:"rgba(248,113,113,0.07)",border:"1px solid rgba(248,113,113,0.2)" }}>
              <Typography sx={{ fontSize:13,color:"#f87171" }}>⚠ {fetchError}</Typography>
              <Typography sx={{ fontSize:11,color:"rgba(248,113,113,0.55)",mt:0.5,fontFamily:"'JetBrains Mono',monospace" }}>
                Check: Is server.js running? → node server.js
              </Typography>
            </Box>
          )}

          {loading ? (
            <Box sx={{ display:"flex",alignItems:"center",justifyContent:"center",height:"60vh",flexDirection:"column",gap:2 }}>
              <CircularProgress sx={{ color:"#4ade80" }} />
              <Typography sx={{ fontSize:13,color:"rgba(232,245,233,0.4)",fontFamily:"'JetBrains Mono',monospace" }}>
                Connecting to MongoDB Atlas…
              </Typography>
            </Box>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={selectedDevice}
                initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-16 }}
                transition={{ duration:0.4 }}>

                {/* Header */}
                <Box sx={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",mb:4,flexWrap:"wrap",gap:2 }}>
                  <Box>
                    <Typography sx={{ fontFamily:"'Cormorant Garamond',serif",fontSize:{xs:"1.8rem",md:"2.4rem"},fontWeight:300,color:"#e8f5e9" }}>
                      {selectedDevice || "No Device"}
                    </Typography>
                    <Typography sx={{ fontSize:12,color:"rgba(232,245,233,0.38)",mt:0.4,fontFamily:"'JetBrains Mono',monospace" }}>
                      {user.role==="admin"
                        ? `Admin · ${allLatest.length} device(s) connected`
                        : `${user.email} · SSE live stream active`}
                    </Typography>
                  </Box>
                  <Button onClick={() => fetchDevice(selectedDevice)}
                    sx={{ fontSize:12,color:"#4ade80",border:"1px solid rgba(74,222,128,0.2)",borderRadius:"8px",px:2,py:0.8,"&:hover":{ background:"rgba(74,222,128,0.06)" } }}>
                    ↻ Refresh
                  </Button>
                </Box>

                {/* Mobile device tabs — admin */}
                {user.role === "admin" && (
                  <Box sx={{ display:{xs:"flex",md:"none"},gap:1,mb:3,overflowX:"auto",pb:1 }}>
                    {allLatest.map((d) => (
                      <Box key={d.deviceId} onClick={() => setSelectedDevice(d.deviceId)}
                        sx={{ px:2,py:1,borderRadius:"8px",cursor:"pointer",flexShrink:0,
                          border:`1px solid ${selectedDevice===d.deviceId?"rgba(74,222,128,0.4)":"rgba(74,222,128,0.1)"}`,
                          background:selectedDevice===d.deviceId?"rgba(74,222,128,0.08)":"transparent" }}>
                        <Typography sx={{ fontSize:11,color:selectedDevice===d.deviceId?"#4ade80":"rgba(232,245,233,0.5)",fontFamily:"'JetBrains Mono',monospace" }}>
                          {d.deviceId}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}

                {/* ── Sensor Cards ── */}
                <Grid container spacing={2.5} sx={{ mb:4 }}>
                  {SENSOR_META.map((meta, i) => (
                    <Grid item xs={12} sm={6} key={meta.key}>
                      <SensorCard
                        meta={meta}
                        value={latest ? (latest[meta.key] ?? null) : null}
                        i={i}
                        flash={flashCards}
                      />
                    </Grid>
                  ))}
                </Grid>

                {/* Last reading timestamp */}
                {latest?.time && (
                  <Box sx={{ mb:3,display:"flex",alignItems:"center",gap:1 }}>
                    <Box sx={{ width:6,height:6,borderRadius:"50%",background:"#4ade80",animation:"pulse 2s infinite" }} />
                    <Typography sx={{ fontSize:11,color:"rgba(232,245,233,0.35)",fontFamily:"'JetBrains Mono',monospace" }}>
                      Last reading from IoT: {new Date(latest.time).toLocaleString()}
                    </Typography>
                  </Box>
                )}

                {/* ── Chart ── */}
                <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}>
                  <Box sx={{ borderRadius:"14px",border:"1px solid rgba(74,222,128,0.1)",background:"rgba(8,15,10,0.7)",backdropFilter:"blur(12px)",overflow:"hidden",mb:4 }}>
                    <Box sx={{ px:3,py:2.5,borderBottom:"1px solid rgba(74,222,128,0.08)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:2 }}>
                      <Box>
                        <Typography sx={{ fontSize:14,fontWeight:500,color:"#e8f5e9",mb:0.3 }}>Sensor History</Typography>
                        <Typography sx={{ fontSize:11,color:"rgba(232,245,233,0.35)",fontFamily:"'JetBrains Mono',monospace" }}>
                          {history.length} readings · updates automatically
                        </Typography>
                      </Box>
                      <Box sx={{ display:"flex",gap:1 }}>
                        {SENSOR_META.map((m) => (
                          <Box key={m.key} onClick={() => setActiveChart(m.key)}
                            sx={{ px:2,py:0.7,borderRadius:"6px",cursor:"pointer",fontSize:12,fontFamily:"'JetBrains Mono',monospace",transition:"all 0.2s",
                              border:`1px solid ${activeChart===m.key?m.color+"55":"rgba(74,222,128,0.1)"}`,
                              background:activeChart===m.key?m.color+"18":"transparent",
                              color:activeChart===m.key?m.color:"rgba(232,245,233,0.4)",
                              "&:hover":{ color:m.color } }}>
                            {m.icon} {m.label}
                          </Box>
                        ))}
                      </Box>
                    </Box>

                    <Box sx={{ p:3 }}>
                      {history.length === 0 ? (
                        <Box sx={{ textAlign:"center",py:7 }}>
                          <Typography sx={{ fontSize:13,color:"rgba(232,245,233,0.3)",fontFamily:"'JetBrains Mono',monospace" }}>
                            No history yet for {selectedDevice}
                          </Typography>
                        </Box>
                      ) : (
                        <ResponsiveContainer width="100%" height={260}>
                          <AreaChart data={history} margin={{ top:5,right:10,left:-10,bottom:0 }}>
                            <defs>
                              <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%"  stopColor={chartMeta?.color} stopOpacity={0.28} />
                                <stop offset="95%" stopColor={chartMeta?.color} stopOpacity={0}    />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(74,222,128,0.06)" />
                            <XAxis dataKey="time" tick={{ fill:"rgba(232,245,233,0.35)",fontSize:11,fontFamily:"JetBrains Mono" }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill:"rgba(232,245,233,0.35)",fontSize:11,fontFamily:"JetBrains Mono" }} axisLine={false} tickLine={false} />
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

                {/* ── Admin overview table ── */}
                {user.role==="admin" && allLatest.length > 0 && (
                  <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4}>
                    <Box sx={{ borderRadius:"14px",border:"1px solid rgba(74,222,128,0.1)",background:"rgba(8,15,10,0.7)",overflow:"hidden" }}>
                      <Box sx={{ px:3,py:2,borderBottom:"1px solid rgba(74,222,128,0.08)" }}>
                        <Typography sx={{ fontSize:14,fontWeight:500,color:"#e8f5e9" }}>All Devices</Typography>
                        <Typography sx={{ fontSize:11,color:"rgba(232,245,233,0.3)",fontFamily:"'JetBrains Mono',monospace" }}>
                          Live from MongoDB Atlas · SSE streaming
                        </Typography>
                      </Box>
                      <Box sx={{ overflowX:"auto" }}>
                        <Box component="table" sx={{ width:"100%",borderCollapse:"collapse" }}>
                          <Box component="thead">
                            <Box component="tr" sx={{ "& th":{ px:3,py:1.5,textAlign:"left",fontSize:10,letterSpacing:1.5,color:"rgba(232,245,233,0.3)",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace",fontWeight:400,borderBottom:"1px solid rgba(74,222,128,0.07)" } }}>
                              <th>Device ID</th><th>Temperature</th><th>Humidity</th><th>Last Reading</th>
                            </Box>
                          </Box>
                          <Box component="tbody">
                            {allLatest.map((d) => (
                              <Box component="tr" key={d.deviceId} onClick={() => setSelectedDevice(d.deviceId)}
                                sx={{ cursor:"pointer","&:hover":{ background:"rgba(74,222,128,0.04)" },"& td":{ px:3,py:2,fontSize:13,color:"rgba(232,245,233,0.65)",borderBottom:"1px solid rgba(74,222,128,0.05)",fontFamily:"'JetBrains Mono',monospace" } }}>
                                <Box component="td" sx={{ color:"#4ade80 !important",fontWeight:500 }}>📡 {d.deviceId}</Box>
                                <Box component="td">{d.temperature ?? "—"}°C</Box>
                                <Box component="td">{d.humidity ?? "—"}%</Box>
                                <Box component="td" sx={{ fontSize:"11px !important",color:"rgba(232,245,233,0.35) !important" }}>
                                  {d.time ? new Date(d.time).toLocaleString() : "—"}
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  </motion.div>
                )}

              </motion.div>
            </AnimatePresence>
          )}
        </Box>
      </Box>
    </Box>
  );
}