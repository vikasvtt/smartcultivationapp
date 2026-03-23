import { Box, Button, Container, Typography, Grid, Chip } from "@mui/material";
import { motion, useMotionValue, useSpring, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

// ── Project info ─────────────────────────────────────────────────────
const TEAM = [
  { name: "Saniya",  role: "Frontend Developer" },
  { name: "Member 2", role: "Backend Developer" },
  { name: "Member 3", role: "IoT & Hardware" },
  { name: "Member 4", role: "Database & API" },
];

const SENSORS_PREVIEW = [
  { label: "Temperature", value: "26.4", unit: "°C",   ok: true  },
  { label: "Humidity",    value: "68.2", unit: "%",    ok: true  },
  { label: "Soil Moisture",value:"54.1", unit: "%",    ok: false },
  { label: "Light (PAR)", value: "1,240",unit: "µmol", ok: true  },
];

const HOW_IT_WORKS = [
  { step: "01", title: "IoT Sensors Collect Data", body: "Hardware sensors inside the cultivation chamber continuously measure temperature, humidity, soil moisture, and light levels." },
  { step: "02", title: "Data Stored in MongoDB Atlas", body: "Sensor readings are pushed to MongoDB Atlas cloud database in real time via a Node.js + Express backend API." },
  { step: "03", title: "Frontend Fetches & Displays", body: "This React app fetches the latest data and renders live charts and metric cards on the dashboard." },
  { step: "04", title: "Role-Based Access", body: "Admin accounts can view all chambers. User accounts are scoped to only their assigned chamber — secured with JWT authentication." },
];

const TECH_STACK = [
  { name: "React.js",       icon: "⚛",  desc: "Frontend UI" },
  { name: "Material UI",    icon: "🎨",  desc: "Component Library" },
  { name: "MongoDB Atlas",  icon: "🍃",  desc: "Cloud Database" },
  { name: "Node.js",        icon: "🟢",  desc: "Backend Runtime" },
  { name: "Express.js",     icon: "🚂",  desc: "REST API" },
  { name: "JWT Auth",       icon: "🔐",  desc: "Authentication" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function Home() {
  const navigate = useNavigate();

  const mouseX = useMotionValue(typeof window !== "undefined" ? window.innerWidth / 2 : 0);
  const mouseY = useMotionValue(typeof window !== "undefined" ? window.innerHeight / 2 : 0);
  const smoothX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const smoothY = useSpring(mouseY, { stiffness: 60, damping: 20 });

  useEffect(() => {
    const move = (e) => { mouseX.set(e.clientX - 200); mouseY.set(e.clientY - 200); };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const { scrollYProgress } = useScroll();
  const zoomRef = useRef();
  const { scrollYProgress: zP } = useScroll({ target: zoomRef, offset: ["start end", "end start"] });
  const scale   = useTransform(zP, [0, 0.6], [0.9, 1.05]);
  const opacity = useTransform(zP, [0, 0.25, 0.85, 1], [0, 1, 1, 0]);

  return (
    <Box sx={{ background: "#040d08", color: "#e8f5e9", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Cormorant+Garamond:ital,wght@0,300;0,600;1,300&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; font-family: 'DM Sans', sans-serif; }
        ::selection { background: rgba(74,222,128,0.25); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #040d08; }
        ::-webkit-scrollbar-thumb { background: #2d6a4f; border-radius: 2px; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.8)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      `}</style>

      {/* Scroll progress */}
      <motion.div style={{ position:"fixed",top:0,left:0,height:2,background:"linear-gradient(90deg,#2d6a4f,#4ade80)",width:"100%",scaleX:scrollYProgress,transformOrigin:"0%",zIndex:9999 }} />

      {/* Cursor glow */}
      <motion.div style={{ position:"fixed",width:350,height:350,borderRadius:"50%",background:"radial-gradient(circle,rgba(52,211,153,0.09) 0%,transparent 70%)",pointerEvents:"none",x:smoothX,y:smoothY,zIndex:0 }} />

      {/* ── NAVBAR ── */}
      <Box
        component={motion.div}
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        sx={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          px: { xs: 3, md: 6 }, py: 2.5,
          position: "fixed", width: "100%", zIndex: 100,
          background: scrolled ? "rgba(4,13,8,0.9)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(74,222,128,0.08)" : "none",
          transition: "all 0.4s ease",
        }}
      >
        {/* Logo */}
        <Box sx={{ display:"flex", alignItems:"center", gap:1.2 }}>
          <Box sx={{ width:30,height:30,borderRadius:"8px",background:"linear-gradient(135deg,#2d6a4f,#4ade80)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15 }}>🌿</Box>
          <Box>
            <Typography sx={{ fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:600,color:"#e8f5e9",lineHeight:1 }}>SmartCultivation</Typography>
            <Typography sx={{ fontSize:9,color:"rgba(232,245,233,0.35)",letterSpacing:1.5,fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase" }}>BCA Internship Project</Typography>
          </Box>
        </Box>

        {/* Nav links — project sections */}
        <Box sx={{ display:{ xs:"none",md:"flex" }, gap:0.5 }}>
          {[
            { label:"Overview",  href:"#overview"  },
            { label:"How It Works", href:"#how"   },
            { label:"Tech Stack",href:"#tech"      },
            { label:"Team",      href:"#team"      },
          ].map((n) => (
            <Button key={n.label} component="a" href={n.href}
              sx={{ color:"rgba(232,245,233,0.5)",fontSize:12.5,letterSpacing:0.3,
                "&:hover":{ color:"#4ade80",background:"transparent" } }}>
              {n.label}
            </Button>
          ))}
        </Box>

        {/* Auth buttons */}
        <Box sx={{ display:"flex", gap:1.5 }}>
          <motion.div whileHover={{ scale:1.04 }} whileTap={{ scale:0.97 }}>
            <Button onClick={() => navigate("/login")}
              sx={{ px:2.5,py:0.9,fontSize:13,borderRadius:"6px",color:"rgba(232,245,233,0.6)",border:"1px solid rgba(74,222,128,0.15)",
                "&:hover":{ borderColor:"rgba(74,222,128,0.4)",color:"#4ade80" } }}>
              Login
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale:1.04 }} whileTap={{ scale:0.97 }}>
            <Button onClick={() => navigate("/signup")}
              sx={{ px:2.5,py:0.9,fontSize:13,borderRadius:"6px",fontWeight:500,
                background:"linear-gradient(135deg,#1a5c3a,#2d6a4f)",color:"#a7f3d0",
                border:"1px solid rgba(74,222,128,0.25)",
                "&:hover":{ background:"linear-gradient(135deg,#2d6a4f,#4ade80)",color:"#040d08" },
                transition:"all 0.3s" }}>
              Sign Up
            </Button>
          </motion.div>
        </Box>
      </Box>

      {/* ── HERO ── */}
      <Box id="overview" sx={{ minHeight:"100vh",position:"relative",overflow:"hidden",display:"flex",alignItems:"center" }}>
        <video autoPlay muted loop playsInline
          style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover" }}>
          <source src="/video/farm.mp4" />
        </video>
        <Box sx={{ position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(4,13,8,0.7) 0%,rgba(4,13,8,0.4) 40%,rgba(4,13,8,0.95) 100%)" }} />
        <Box sx={{ position:"absolute",bottom:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(74,222,128,0.3),transparent)" }} />

        <Container maxWidth="xl" sx={{ position:"relative",px:{ xs:3,md:8 },pt:12 }}>
          <Grid container spacing={5} alignItems="center">

            {/* LEFT — project intro */}
            <Grid item xs={12} md={6}>
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
                {/* Project badge */}
                <Box sx={{ display:"inline-flex",alignItems:"center",gap:1,px:2,py:0.8,borderRadius:"6px",mb:3,
                  border:"1px solid rgba(74,222,128,0.2)",background:"rgba(74,222,128,0.05)" }}>
                  <Box sx={{ width:6,height:6,borderRadius:"50%",background:"#4ade80",animation:"pulse 2s infinite" }} />
                  <Typography sx={{ fontSize:11,letterSpacing:2,color:"#4ade80",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase" }}>
                    BCA 6th Sem · Internship Project · 2026
                  </Typography>
                </Box>
              </motion.div>

              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
                <Typography sx={{
                  fontFamily:"'Cormorant Garamond',serif",
                  fontSize:{ xs:"2.6rem",md:"4.2rem" },
                  fontWeight:300, lineHeight:1.1,
                }}>
                  IoT Cultivation<br />
                  <Box component="span" sx={{ fontStyle:"italic",background:"linear-gradient(90deg,#4ade80,#34d399)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>
                    Chamber Monitor
                  </Box>
                </Typography>
              </motion.div>

              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
                <Typography sx={{ mt:2.5,maxWidth:480,lineHeight:1.85,color:"rgba(232,245,233,0.55)",fontSize:15,fontWeight:300 }}>
                  A full-stack web application to monitor real-time environmental data from an IoT-powered cultivation chamber.
                  Built as an internship project integrating hardware sensors, cloud database, and a React dashboard.
                </Typography>
              </motion.div>

              {/* Project meta tags */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}>
                <Box sx={{ display:"flex",flexWrap:"wrap",gap:1,mt:3,mb:4 }}>
                  {["IoT Sensors","MongoDB Atlas","React.js","Node.js + Express","JWT Auth","PWA"].map((t) => (
                    <Box key={t} sx={{ px:1.8,py:0.5,borderRadius:"20px",border:"1px solid rgba(74,222,128,0.18)",
                      background:"rgba(74,222,128,0.05)",fontSize:11.5,color:"rgba(232,245,233,0.55)",
                      fontFamily:"'JetBrains Mono',monospace",letterSpacing:0.3 }}>
                      {t}
                    </Box>
                  ))}
                </Box>
              </motion.div>

              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4}>
                <Box sx={{ display:"flex",gap:2 }}>
                  <motion.div whileHover={{ scale:1.04 }} whileTap={{ scale:0.97 }}>
                    <Button onClick={() => navigate("/login")}
                      sx={{ px:4,py:1.4,fontSize:13.5,borderRadius:"7px",fontWeight:500,
                        background:"linear-gradient(135deg,#2d6a4f,#4ade80)",color:"#040d08",
                        boxShadow:"0 8px 24px rgba(74,222,128,0.3)",
                        "&:hover":{ boxShadow:"0 12px 32px rgba(74,222,128,0.5)" } }}>
                      Open Dashboard
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale:1.04 }} whileTap={{ scale:0.97 }}>
                    <Button onClick={() => navigate("/signup")}
                      sx={{ px:4,py:1.4,fontSize:13.5,borderRadius:"7px",color:"#a7f3d0",
                        border:"1px solid rgba(74,222,128,0.2)",
                        "&:hover":{ borderColor:"rgba(74,222,128,0.45)",background:"rgba(74,222,128,0.05)" } }}>
                      Create Account
                    </Button>
                  </motion.div>
                </Box>
                <Typography sx={{ mt:1.5,fontSize:11,color:"rgba(232,245,233,0.28)" }}>
                  Admin & User roles supported · Mock data included for demo
                </Typography>
              </motion.div>
            </Grid>

            {/* RIGHT — live sensor panel */}
            <Grid item xs={12} md={6}>
              <motion.div initial={{ opacity:0,x:50 }} animate={{ opacity:1,x:0 }} transition={{ duration:0.85,delay:0.3,ease:[0.22,1,0.36,1] }}>
                <Box sx={{ borderRadius:"16px",border:"1px solid rgba(74,222,128,0.14)",background:"rgba(4,13,8,0.75)",backdropFilter:"blur(24px)",overflow:"hidden",boxShadow:"0 24px 70px rgba(0,0,0,0.5),inset 0 1px 0 rgba(74,222,128,0.08)" }}>
                  <Box sx={{ px:3,py:2,borderBottom:"1px solid rgba(74,222,128,0.09)",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(74,222,128,0.025)" }}>
                    <Box>
                      <Typography sx={{ fontSize:11,letterSpacing:2,color:"#4ade80",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase" }}>
                        Chamber · CH-001
                      </Typography>
                      <Typography sx={{ fontSize:10,color:"rgba(232,245,233,0.3)",mt:0.3,fontFamily:"'JetBrains Mono',monospace" }}>
                        Demo data · MongoDB Atlas
                      </Typography>
                    </Box>
                    <Box sx={{ display:"flex",alignItems:"center",gap:0.7,px:1.5,py:0.5,borderRadius:"20px",background:"rgba(74,222,128,0.07)",border:"1px solid rgba(74,222,128,0.15)" }}>
                      <Box sx={{ width:5,height:5,borderRadius:"50%",background:"#4ade80",animation:"pulse 2s infinite" }} />
                      <Typography sx={{ fontSize:10,color:"#4ade80",fontFamily:"'JetBrains Mono',monospace" }}>LIVE</Typography>
                    </Box>
                  </Box>

                  <Box sx={{ p:3,display:"grid",gridTemplateColumns:"1fr 1fr",gap:2 }}>
                    {SENSORS_PREVIEW.map((s, i) => (
                      <motion.div key={i} initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.5+i*0.1 }}>
                        <Box sx={{ p:2.2,borderRadius:"10px",background:"rgba(74,222,128,0.04)",
                          border:`1px solid ${s.ok?"rgba(74,222,128,0.12)":"rgba(248,113,113,0.2)"}`,
                          transition:"all 0.2s","&:hover":{ borderColor:s.ok?"rgba(74,222,128,0.3)":"rgba(248,113,113,0.4)" } }}>
                          <Typography sx={{ fontSize:10,color:"rgba(232,245,233,0.4)",letterSpacing:1,textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace" }}>{s.label}</Typography>
                          <Box sx={{ display:"flex",alignItems:"baseline",gap:0.5,mt:0.5 }}>
                            <Typography sx={{ fontSize:24,fontWeight:500,color:"#e8f5e9",fontFamily:"'JetBrains Mono',monospace" }}>{s.value}</Typography>
                            <Typography sx={{ fontSize:11,color:"rgba(232,245,233,0.35)" }}>{s.unit}</Typography>
                          </Box>
                          <Box sx={{ display:"flex",alignItems:"center",gap:0.5,mt:0.4 }}>
                            <Box sx={{ width:6,height:6,borderRadius:"50%",background:s.ok?"#4ade80":"#f87171" }} />
                            <Typography sx={{ fontSize:10,color:s.ok?"#4ade80":"#f87171",fontFamily:"'JetBrains Mono',monospace" }}>{s.ok?"Normal":"Needs Attention"}</Typography>
                          </Box>
                        </Box>
                      </motion.div>
                    ))}
                  </Box>
                </Box>
              </motion.div>
            </Grid>
          </Grid>
        </Container>

        {/* Scroll hint */}
        <motion.div animate={{ y:[0,8,0] }} transition={{ duration:2,repeat:Infinity }}
          style={{ position:"absolute",bottom:28,left:"50%",transform:"translateX(-50%)" }}>
          <Box sx={{ display:"flex",flexDirection:"column",alignItems:"center",gap:0.5 }}>
            <Typography sx={{ fontSize:9,letterSpacing:3,color:"rgba(232,245,233,0.2)",textTransform:"uppercase" }}>scroll</Typography>
            <Box sx={{ width:1,height:32,background:"linear-gradient(180deg,rgba(74,222,128,0.35),transparent)" }} />
          </Box>
        </motion.div>
      </Box>

      {/* ── HOW IT WORKS ── */}
      <Box id="how" sx={{ py:{ xs:10,md:14 },position:"relative" }}>
        <Box sx={{ position:"absolute",inset:0,opacity:0.022,backgroundImage:"linear-gradient(rgba(74,222,128,1) 1px,transparent 1px),linear-gradient(90deg,rgba(74,222,128,1) 1px,transparent 1px)",backgroundSize:"50px 50px" }} />
        <Container maxWidth="xl" sx={{ px:{ xs:3,md:8 } }}>
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once:true }}>
            <Typography sx={{ fontSize:10,letterSpacing:3,color:"#4ade80",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace",mb:1.5 }}>
              System Architecture
            </Typography>
            <Typography sx={{ fontFamily:"'Cormorant Garamond',serif",fontSize:{ xs:"2rem",md:"3rem" },fontWeight:300,mb:8,maxWidth:500,lineHeight:1.2 }}>
              How the project works.
            </Typography>
          </motion.div>

          <Grid container spacing={3}>
            {HOW_IT_WORKS.map((item, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once:true }} custom={i*0.3}>
                  <Box sx={{ p:3.5,borderRadius:"12px",height:"100%",position:"relative",overflow:"hidden",
                    border:"1px solid rgba(74,222,128,0.08)",background:"rgba(255,255,255,0.013)",
                    transition:"all 0.3s","&:hover":{ borderColor:"rgba(74,222,128,0.25)",background:"rgba(74,222,128,0.04)",transform:"translateY(-3px)","& .step-line":{ width:"100%" } } }}>
                    <Box className="step-line" sx={{ position:"absolute",bottom:0,left:0,height:1,width:0,background:"linear-gradient(90deg,#4ade80,transparent)",transition:"width 0.45s ease" }} />
                    <Typography sx={{ fontFamily:"'Cormorant Garamond',serif",fontSize:"3rem",fontWeight:300,color:"rgba(74,222,128,0.2)",lineHeight:1,mb:2 }}>{item.step}</Typography>
                    <Typography sx={{ fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:600,color:"#e8f5e9",mb:1.2 }}>{item.title}</Typography>
                    <Typography sx={{ fontSize:13.5,color:"rgba(232,245,233,0.45)",lineHeight:1.75,fontWeight:300 }}>{item.body}</Typography>
                  </Box>
                </motion.div>
              </Grid>
            ))}
          </Grid>

          {/* Architecture flow diagram */}
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once:true }} custom={1}>
            <Box sx={{ mt:6,p:3,borderRadius:"12px",border:"1px solid rgba(74,222,128,0.1)",background:"rgba(74,222,128,0.03)" }}>
              <Typography sx={{ fontSize:10,letterSpacing:2,color:"rgba(232,245,233,0.3)",fontFamily:"'JetBrains Mono',monospace",mb:2,textTransform:"uppercase" }}>Data Flow</Typography>
              <Box sx={{ display:"flex",alignItems:"center",flexWrap:"wrap",gap:1 }}>
                {[
                  { label:"IoT Sensors", icon:"📡" },
                  { label:"→", icon:null },
                  { label:"Node.js API", icon:"🟢" },
                  { label:"→", icon:null },
                  { label:"MongoDB Atlas", icon:"🍃" },
                  { label:"→", icon:null },
                  { label:"React Dashboard", icon:"⚛" },
                  { label:"→", icon:null },
                  { label:"PWA Mobile", icon:"📱" },
                ].map((n, i) => (
                  n.icon ? (
                    <Box key={i} sx={{ px:2,py:1,borderRadius:"8px",border:"1px solid rgba(74,222,128,0.12)",background:"rgba(74,222,128,0.04)",display:"flex",alignItems:"center",gap:0.8 }}>
                      <Typography sx={{ fontSize:14 }}>{n.icon}</Typography>
                      <Typography sx={{ fontSize:12,color:"rgba(232,245,233,0.6)",fontFamily:"'JetBrains Mono',monospace" }}>{n.label}</Typography>
                    </Box>
                  ) : (
                    <Typography key={i} sx={{ fontSize:16,color:"rgba(74,222,128,0.4)" }}>→</Typography>
                  )
                ))}
              </Box>
            </Box>
          </motion.div>
        </Container>
      </Box>

      {/* ── SCROLL ZOOM ── */}
      <Box ref={zoomRef} sx={{ height:"120vh" }}>
        <motion.div style={{ scale,opacity,position:"sticky",top:"38%",textAlign:"center" }}>
          <Container maxWidth="md">
            <Typography sx={{ fontFamily:"'Cormorant Garamond',serif",fontSize:{ xs:"1.8rem",md:"3.5rem" },fontWeight:300,lineHeight:1.2 }}>
              From sensor to screen —{" "}
              <Box component="span" sx={{ fontStyle:"italic",background:"linear-gradient(90deg,#4ade80,#34d399)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>
                in real time.
              </Box>
            </Typography>
            <Typography sx={{ mt:2,fontSize:14,color:"rgba(232,245,233,0.35)",maxWidth:420,mx:"auto" }}>
              IoT Hardware → MongoDB Atlas → React Dashboard → PWA Mobile App
            </Typography>
          </Container>
        </motion.div>
      </Box>

      {/* ── TECH STACK ── */}
      <Box id="tech" sx={{ py:{ xs:10,md:14 },borderTop:"1px solid rgba(74,222,128,0.06)" }}>
        <Container maxWidth="xl" sx={{ px:{ xs:3,md:8 } }}>
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once:true }}>
            <Typography sx={{ fontSize:10,letterSpacing:3,color:"#4ade80",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace",mb:1.5 }}>Technologies Used</Typography>
            <Typography sx={{ fontFamily:"'Cormorant Garamond',serif",fontSize:{ xs:"2rem",md:"3rem" },fontWeight:300,mb:8,lineHeight:1.2 }}>
              Built with modern tools.
            </Typography>
          </motion.div>

          <Grid container spacing={2.5}>
            {TECH_STACK.map((t, i) => (
              <Grid item xs={6} sm={4} md={2} key={i}>
                <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once:true }} custom={i*0.2}>
                  <Box sx={{ p:3,borderRadius:"12px",textAlign:"center",height:"100%",
                    border:"1px solid rgba(74,222,128,0.08)",background:"rgba(255,255,255,0.015)",
                    transition:"all 0.3s","&:hover":{ borderColor:"rgba(74,222,128,0.3)",background:"rgba(74,222,128,0.05)",transform:"translateY(-4px)",boxShadow:"0 16px 40px rgba(0,0,0,0.3)" } }}>
                    <Typography sx={{ fontSize:28,mb:1.5 }}>{t.icon}</Typography>
                    <Typography sx={{ fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:600,color:"#e8f5e9",mb:0.5 }}>{t.name}</Typography>
                    <Typography sx={{ fontSize:11,color:"rgba(232,245,233,0.35)",fontFamily:"'JetBrains Mono',monospace" }}>{t.desc}</Typography>
                  </Box>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── TEAM ── */}
      <Box id="team" sx={{ py:{ xs:10,md:14 },borderTop:"1px solid rgba(74,222,128,0.06)",background:"rgba(74,222,128,0.015)" }}>
        <Container maxWidth="xl" sx={{ px:{ xs:3,md:8 } }}>
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once:true }}>
            <Typography sx={{ fontSize:10,letterSpacing:3,color:"#4ade80",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace",mb:1.5 }}>The Team</Typography>
            <Typography sx={{ fontFamily:"'Cormorant Garamond',serif",fontSize:{ xs:"2rem",md:"3rem" },fontWeight:300,mb:8,lineHeight:1.2 }}>
              Built by students, for learning.
            </Typography>
          </motion.div>

          <Grid container spacing={3}>
            {TEAM.map((member, i) => (
              <Grid item xs={6} md={3} key={i}>
                <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once:true }} custom={i*0.2}>
                  <Box sx={{ p:3,borderRadius:"12px",
                    border:"1px solid rgba(74,222,128,0.08)",background:"rgba(255,255,255,0.015)",
                    transition:"all 0.3s","&:hover":{ borderColor:"rgba(74,222,128,0.25)",background:"rgba(74,222,128,0.04)",transform:"translateY(-3px)" } }}>
                    {/* Avatar */}
                    <Box sx={{ width:48,height:48,borderRadius:"12px",background:"linear-gradient(135deg,#1a5c3a,#2d6a4f)",display:"flex",alignItems:"center",justifyContent:"center",mb:2,fontSize:20,fontWeight:600,color:"#4ade80",fontFamily:"'Cormorant Garamond',serif" }}>
                      {member.name[0]}
                    </Box>
                    <Typography sx={{ fontSize:15,fontWeight:500,color:"#e8f5e9",mb:0.4 }}>{member.name}</Typography>
                    <Typography sx={{ fontSize:11,color:"#4ade80",fontFamily:"'JetBrains Mono',monospace",letterSpacing:0.5 }}>{member.role}</Typography>
                  </Box>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── FINAL CTA ── */}
      <Box sx={{ py:{ xs:12,md:16 },textAlign:"center",position:"relative",borderTop:"1px solid rgba(74,222,128,0.06)" }}>
        <Box sx={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:450,height:450,borderRadius:"50%",background:"radial-gradient(circle,rgba(45,106,79,0.13) 0%,transparent 70%)",pointerEvents:"none" }} />
        <Container maxWidth="sm">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once:true }}>
            <Typography sx={{ fontFamily:"'Cormorant Garamond',serif",fontSize:{ xs:"2rem",md:"3.5rem" },fontWeight:300,lineHeight:1.15,mb:2 }}>
              Ready to explore the dashboard?
            </Typography>
            <Typography sx={{ fontSize:14,color:"rgba(232,245,233,0.38)",mb:5 }}>
              Create an account to view live chamber data and sensor readings.
            </Typography>
            <Box sx={{ display:"flex",gap:2,justifyContent:"center",flexWrap:"wrap" }}>
              <motion.div whileHover={{ scale:1.04 }} whileTap={{ scale:0.97 }}>
                <Button onClick={() => navigate("/signup")}
                  sx={{ px:5,py:1.5,fontSize:14,borderRadius:"7px",fontWeight:500,
                    background:"linear-gradient(135deg,#2d6a4f,#4ade80)",color:"#040d08",
                    boxShadow:"0 8px 28px rgba(74,222,128,0.3)",
                    "&:hover":{ boxShadow:"0 12px 36px rgba(74,222,128,0.5)" } }}>
                  Create Account
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale:1.04 }} whileTap={{ scale:0.97 }}>
                <Button onClick={() => navigate("/login")}
                  sx={{ px:5,py:1.5,fontSize:14,borderRadius:"7px",color:"#a7f3d0",
                    border:"1px solid rgba(74,222,128,0.2)",
                    "&:hover":{ borderColor:"rgba(74,222,128,0.45)",background:"rgba(74,222,128,0.05)" } }}>
                  Login
                </Button>
              </motion.div>
            </Box>
          </motion.div>
        </Container>
      </Box>

      {/* ── FOOTER ── */}
      <Box sx={{ borderTop:"1px solid rgba(74,222,128,0.07)",py:4,px:{ xs:3,md:8 } }}>
        <Box sx={{ display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:2 }}>
          <Box sx={{ display:"flex",alignItems:"center",gap:1 }}>
            <Box sx={{ width:22,height:22,borderRadius:"6px",background:"linear-gradient(135deg,#2d6a4f,#4ade80)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12 }}>🌿</Box>
            <Typography sx={{ fontFamily:"'Cormorant Garamond',serif",fontSize:14,color:"rgba(232,245,233,0.35)" }}>
              SmartCultivation · BCA Internship Project ·2026
            </Typography>
          </Box>
          <Typography sx={{ fontSize:11,color:"rgba(232,245,233,0.18)",fontFamily:"'JetBrains Mono',monospace" }}>
            React + MUI + MongoDB Atlas + IoT
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}