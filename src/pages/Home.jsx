import { Box, Button, Container, Typography, Grid } from "@mui/material";
import {
  motion,
  useMotionValue,
  useSpring,
  useScroll,
  useTransform,
} from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

/* ─────────────────────────────────────────────
   DATA
───────────────────────────────────────────── */
const SENSORS = [
  { label: "Temperature",   value: 26.4,  unit: "°C",   ok: true,  icon: "🌡️", trend: [22,23,24,25,26,26.4] },
  { label: "Humidity",      value: 68.2,  unit: "%",    ok: true,  icon: "💧", trend: [60,63,65,67,68,68.2] },
  { label: "Soil Moisture", value: 54.1,  unit: "%",    ok: false, icon: "🪴", trend: [70,65,62,58,55,54.1] },
  { label: "Light (PAR)",   value: 1240,  unit: "µmol", ok: true,  icon: "☀️", trend: [800,950,1050,1150,1200,1240] },
];

const HOW = [
  { n:"01", icon:"📡", title:"Sensors collect",    body:"Hardware sensors continuously measure temperature, humidity, soil moisture, and PAR light levels inside the chamber." },
  { n:"02", icon:"🟢", title:"API processes",      body:"A Node.js + Express backend receives readings and pushes them to MongoDB Atlas cloud database in real time." },
  { n:"03", icon:"🍃", title:"Data is stored",     body:"MongoDB Atlas stores every reading with timestamps — enabling historical charts and trend analysis." },
  { n:"04", icon:"⚛",  title:"Dashboard displays", body:"This React PWA fetches live data and renders charts, alerts, and metric cards — accessible on any device." },
];

const STACK = [
  { icon:"⚛",  name:"React.js",      tag:"Frontend" },
  { icon:"🎨",  name:"Material UI",   tag:"UI Library" },
  { icon:"🍃",  name:"MongoDB Atlas", tag:"Cloud DB" },
  { icon:"🟢",  name:"Node.js",       tag:"Runtime" },
  { icon:"🚂",  name:"Express.js",    tag:"REST API" },
  { icon:"🔐",  name:"JWT Auth",      tag:"Security" },
];

const TEAM = [
  {
    name:"Saniya",
    role:"Frontend Developer",
    color:"#4ade80",
    imageUrl:"/team/saniya.jpg",
    linkedin:"#",
    github:"#",
  },
  {
    name:"Unnati",
    role:"Database & API",
    color:"#34d399",
    imageUrl:"/team/unnati.jpg",
    linkedin:"#",
    github:"#",
  },
  {
    name:"Darshan",
    role:"Backend Development",
    color:"#6ee7b7",
    imageUrl:"/team/darshan.jpg",
    linkedin:"#",
    github:"#",
  },
  {
    name:"Vikas",
    role:"IOT & Hardware",
    color:"#a7f3d0",
    imageUrl:"/team/vikas.jpg",
    linkedin:"#",
    github:"#",
  },
  {
    name:"Aditya",
    role:"DevOps & Deployment",
    color:"#bbf7d0",
    imageUrl:"/team/aditya.jpg",
    linkedin:"#",
    github:"#",
  },
];

const IMGS = {
  hero: "https://images.unsplash.com/photo-1585664811087-47f65abbad64?w=1920&q=90&auto=format&fit=crop",
  mid:  "https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=1920&q=80&auto=format&fit=crop",
  cta:  "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1920&q=80&auto=format&fit=crop",
  g1:   "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=700&q=80&auto=format&fit=crop",
  g2:   "https://images.unsplash.com/photo-1518335935020-cfd6580c1ab4?w=700&q=80&auto=format&fit=crop",
  g3:   "https://images.unsplash.com/photo-1492496913980-501348b61469?w=700&q=80&auto=format&fit=crop",
  g4:   "https://images.unsplash.com/photo-1525498128493-380d1990a112?w=700&q=80&auto=format&fit=crop",
};

const fadeUp = {
  hidden:  { opacity: 0, y: 50 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.8, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] },
  }),
};

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function CountUp({ target, decimals = 0, duration = 1800 }) {
  const [val, setVal] = useState(0);
  const triggered = useRef(false);
  const ref = useRef();
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !triggered.current) {
        triggered.current = true;
        const start = Date.now();
        const tick = () => {
          const p = Math.min((Date.now() - start) / duration, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          setVal(parseFloat((target * ease).toFixed(decimals)));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, decimals, duration]);
  return <span ref={ref}>{val.toLocaleString()}</span>;
}

function Spark({ data, ok }) {
  const min = Math.min(...data), max = Math.max(...data);
  const W = 80, H = 28;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / (max - min || 1)) * (H - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={ok ? "#4ade80" : "#f87171"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      <circle cx={data.length > 0 ? W : 0} cy={H - ((data[data.length-1] - min) / (max - min || 1)) * (H-4) - 2} r="2.5" fill={ok ? "#4ade80" : "#f87171"} opacity="0.9" />
    </svg>
  );
}

function Orb({ x, y, size, delay = 0 }) {
  return (
    <motion.div
      animate={{ y: [0, -22, 0], opacity: [0.25, 0.55, 0.25] }}
      transition={{ duration: 6 + delay, repeat: Infinity, ease: "easeInOut", delay }}
      style={{ position: "absolute", left: `${x}%`, top: `${y}%`, width: size, height: size, borderRadius: "50%", background: "radial-gradient(circle, rgba(74,222,128,0.45) 0%, transparent 70%)", pointerEvents: "none" }}
    />
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M6.94 8.5H3.56V20h3.38V8.5Zm.22-3.56A1.97 1.97 0 0 0 5.2 3a1.97 1.97 0 0 0-1.97 1.94c0 1.07.87 1.94 1.94 1.94h.03A1.96 1.96 0 0 0 7.16 4.94ZM20.44 13.01c0-3.46-1.85-5.07-4.32-5.07a3.74 3.74 0 0 0-3.35 1.84V8.5H9.39c.04.84 0 11.5 0 11.5h3.38v-6.42c0-.34.03-.68.13-.92.27-.68.88-1.39 1.9-1.39 1.34 0 1.88 1.03 1.88 2.54V20h3.38v-6.99Z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.05c-3.34.73-4.04-1.41-4.04-1.41-.55-1.38-1.33-1.75-1.33-1.75-1.09-.74.08-.72.08-.72 1.2.08 1.84 1.24 1.84 1.24 1.08 1.84 2.82 1.31 3.5 1 .11-.79.42-1.32.76-1.63-2.66-.3-5.46-1.33-5.46-5.94 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23A11.4 11.4 0 0 1 12 6.6c1.02 0 2.05.14 3.01.4 2.28-1.55 3.29-1.23 3.29-1.23.67 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.62-2.8 5.63-5.48 5.93.43.38.82 1.11.82 2.24v3.32c0 .32.22.69.83.57A12 12 0 0 0 12 .5Z" />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────── */
export default function Home() {
  const navigate = useNavigate();

  /* cursor glow */
  const mouseX = useMotionValue(400);
  const mouseY = useMotionValue(300);
  const glowX  = useSpring(mouseX, { stiffness: 40, damping: 15 });
  const glowY  = useSpring(mouseY, { stiffness: 40, damping: 15 });
  useEffect(() => {
    const m = e => { mouseX.set(e.clientX - 200); mouseY.set(e.clientY - 200); };
    window.addEventListener("mousemove", m);
    return () => window.removeEventListener("mousemove", m);
  }, []);

  /* navbar scroll */
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  /* scroll progress */
  const { scrollYProgress } = useScroll();

  /* hero parallax */
  const heroRef = useRef();
  const { scrollYProgress: hP } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroImgY  = useTransform(hP, [0, 1], ["0%", "40%"]);
  const heroTextY = useTransform(hP, [0, 1], ["0%", "18%"]);
  const heroAlpha = useTransform(hP, [0, 0.85], [1, 0]);

  /* zoom quote */
  const zoomRef = useRef();
  const { scrollYProgress: zP } = useScroll({ target: zoomRef, offset: ["start end", "end start"] });
  const zScale   = useTransform(zP, [0, 0.5], [0.84, 1.06]);
  const zOpacity = useTransform(zP, [0, 0.15, 0.85, 1], [0, 1, 1, 0]);

  /* typewriter */
  const words = ["Chamber Monitor", "Smart Farming", "Real-Time Insights", "Precision Agriculture"];
  const [wIdx, setWIdx]     = useState(0);
  const [chars, setChars]   = useState(0);
  const [erasing, setErasing] = useState(false);
  useEffect(() => {
    const word = words[wIdx];
    const speed = erasing ? 35 : 90;
    const timer = setTimeout(() => {
      if (!erasing && chars < word.length)  { setChars(c => c + 1); }
      else if (!erasing)                    { setTimeout(() => setErasing(true), 1600); }
      else if (chars > 0)                   { setChars(c => c - 1); }
      else { setErasing(false); setWIdx(i => (i + 1) % words.length); }
    }, speed);
    return () => clearTimeout(timer);
  }, [chars, erasing, wIdx]);

  /* live sensor tick */
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 3000);
    return () => clearInterval(id);
  }, []);
  const liveValues = SENSORS.map((s, i) => {
    const drift = +(Math.sin(tick * 0.7 + i * 1.3) * 0.4).toFixed(1);
    return (s.value + drift).toFixed(i === 3 ? 0 : 1);
  });

  return (
    <Box sx={{ background: "#020c04", color: "#e8f5e9", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Outfit:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        ::selection { background: rgba(74,222,128,0.3); }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #020c04; }
        ::-webkit-scrollbar-thumb { background: linear-gradient(180deg,#2d6a4f,#4ade80); border-radius: 2px; }
        .fd  { font-family: 'Playfair Display', serif !important; }
        .fs  { font-family: 'Outfit', sans-serif !important; }
        .fm  { font-family: 'JetBrains Mono', monospace !important; }
        @keyframes pulse    { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.25;transform:scale(.65)} }
        @keyframes rotatecw { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes rotateccw{ from{transform:rotate(0deg)} to{transform:rotate(-360deg)} }
        @keyframes scanln   { 0%{top:-80px} 100%{top:110%} }
        @keyframes grain    { 0%,100%{transform:translate(0,0)} 20%{transform:translate(-2%,-2%)} 40%{transform:translate(2%,-1%)} 60%{transform:translate(-1%,2%)} 80%{transform:translate(2%,1%)} }
        .sensor-card { transition: all 0.28s cubic-bezier(.22,1,.36,1) !important; }
        .sensor-card:hover { transform: translateY(-3px); box-shadow: 0 14px 40px rgba(0,0,0,0.5) !important; }
        .how-card   { transition: all 0.32s cubic-bezier(.22,1,.36,1); }
        .how-card:hover { transform: translateY(-5px); }
        .how-card:hover .how-n { color: rgba(74,222,128,0.5) !important; }
        .stack-card { transition: all 0.32s cubic-bezier(.22,1,.36,1); }
        .stack-card:hover { transform: translateY(-8px) scale(1.04); border-color: rgba(74,222,128,0.38) !important; background: rgba(74,222,128,0.05) !important; box-shadow: 0 20px 50px rgba(0,0,0,0.4), 0 0 40px rgba(74,222,128,0.07) !important; }
        .gallery-wrap img { transition: transform 0.65s cubic-bezier(.22,1,.36,1), filter 0.4s; }
        .gallery-wrap:hover img { transform: scale(1.09); filter: brightness(0.8) saturate(1.35); }
        .nav-link::after { content:''; position:absolute; bottom:-2px; left:0; width:0; height:1px; background:#4ade80; transition:width 0.3s; }
        .nav-link:hover::after { width:100%; }
        .cta-shine { position:relative; overflow:hidden; }
        .cta-shine::before { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent); transform:translateX(-100%); transition:transform 0.55s; }
        .cta-shine:hover::before { transform:translateX(100%); }
        .team-card { transition: all 0.32s cubic-bezier(.22,1,.36,1); }
        .team-card:hover { transform: translateY(-8px); border-color: rgba(74,222,128,0.24) !important; box-shadow: 0 28px 60px rgba(0,0,0,0.42) !important; }
        .team-card:hover .team-profile-ring { box-shadow: 0 0 0 8px rgba(74,222,128,0.08); transform: scale(1.02); }
        .team-card:hover .team-name { color: #86efac !important; }
        .team-social { transition: all 0.25s cubic-bezier(.22,1,.36,1); }
        .team-social:hover { transform: translateY(-2px) scale(1.08); }
        .chip { transition: all 0.2s; cursor:default; }
        .chip:hover { border-color: rgba(74,222,128,0.5) !important; color: #4ade80 !important; background: rgba(74,222,128,0.08) !important; }
      `}</style>

      {/* scroll progress bar */}
      <motion.div style={{ position:"fixed",top:0,left:0,height:"2px",background:"linear-gradient(90deg,#1a5c3a,#4ade80,#a7f3d0)",width:"100%",scaleX:scrollYProgress,transformOrigin:"0%",zIndex:9999 }} />

      {/* cursor glow */}
      <motion.div style={{ position:"fixed",width:380,height:380,borderRadius:"50%",background:"radial-gradient(circle,rgba(52,211,153,0.065) 0%,transparent 70%)",pointerEvents:"none",x:glowX,y:glowY,zIndex:0 }} />

      {/* ╔══════════════════════════════════════╗
          ║  NAVBAR                              ║
          ╚══════════════════════════════════════╝ */}
      <Box
        component={motion.nav}
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        sx={{
          position:"fixed", width:"100%", zIndex:200,
          display:"flex", justifyContent:"space-between", alignItems:"center",
          px:{ xs:3, md:6 }, py:2.5,
          background: scrolled ? "rgba(2,12,4,0.9)" : "transparent",
          backdropFilter: scrolled ? "blur(26px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(74,222,128,0.07)" : "none",
          transition:"all 0.5s cubic-bezier(.22,1,.36,1)",
        }}
      >
        {/* logo */}
        <Box sx={{ display:"flex", alignItems:"center", gap:1.5 }}>
          <motion.div animate={{ rotate:[0,8,-8,0] }} transition={{ duration:5, repeat:Infinity, ease:"easeInOut" }}>
            <Box sx={{ width:36,height:36,borderRadius:"10px",background:"linear-gradient(135deg,#1a5c3a,#4ade80)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,boxShadow:"0 4px 18px rgba(74,222,128,0.3)" }}>🌿</Box>
          </motion.div>
          <Box>
            <Typography className="fd" sx={{ fontSize:17,fontWeight:700,color:"#e8f5e9",lineHeight:1 }}>SmartCultivation</Typography>
            <Typography className="fm" sx={{ fontSize:8,color:"rgba(74,222,128,0.5)",letterSpacing:2,textTransform:"uppercase" }}>BCA Internship · 2026</Typography>
          </Box>
        </Box>

        {/* nav links */}
        <Box sx={{ display:{ xs:"none",md:"flex" }, gap:0.5 }}>
          {[["Overview","#overview"],["How It Works","#how"],["Tech Stack","#tech"],["Team","#team"]].map(([label, href]) => (
            <Button key={label} component="a" href={href} className="nav-link"
              sx={{ position:"relative",color:"rgba(232,245,233,0.55)",fontSize:13,fontFamily:"'Outfit',sans-serif",letterSpacing:0.3,textTransform:"none",px:2,
                "&:hover":{ color:"#4ade80",background:"transparent" } }}>
              {label}
            </Button>
          ))}
        </Box>

        {/* auth */}
        <Box sx={{ display:"flex", gap:1.5 }}>
          <motion.div whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }}>
            <Button onClick={() => navigate("/login")}
              sx={{ px:2.5,py:1,fontSize:13,borderRadius:"8px",textTransform:"none",fontFamily:"'Outfit',sans-serif",color:"rgba(232,245,233,0.6)",border:"1px solid rgba(74,222,128,0.18)","&:hover":{ borderColor:"rgba(74,222,128,0.45)",color:"#4ade80" },transition:"all 0.3s" }}>
              Login
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale:1.04 }} whileTap={{ scale:0.96 }}>
            <Button onClick={() => navigate("/signup")} className="cta-shine"
              sx={{ px:2.5,py:1,fontSize:13,borderRadius:"8px",textTransform:"none",fontFamily:"'Outfit',sans-serif",fontWeight:500,background:"linear-gradient(135deg,#1a5c3a,#2d6a4f)",color:"#a7f3d0",border:"1px solid rgba(74,222,128,0.3)","&:hover":{ background:"linear-gradient(135deg,#2d6a4f,#4ade80)",color:"#020c04" },transition:"all 0.3s" }}>
              Sign Up
            </Button>
          </motion.div>
        </Box>
      </Box>

      {/* ╔══════════════════════════════════════╗
          ║  HERO                                ║
          ╚══════════════════════════════════════╝ */}
      <Box id="overview" ref={heroRef} sx={{ minHeight:"100vh",position:"relative",overflow:"hidden",display:"flex",alignItems:"center" }}>

        {/* parallax bg */}
        <motion.div style={{ position:"absolute",inset:0,y:heroImgY }}>
          <Box component="img" src={IMGS.hero} alt="greenhouse" sx={{ width:"100%",height:"130%",objectFit:"cover",objectPosition:"center 30%",filter:"saturate(1.25) brightness(0.42)" }} />
        </motion.div>

        {/* gradient overlays */}
        <Box sx={{ position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(2,12,4,0.5) 0%,rgba(2,12,4,0.15) 35%,rgba(2,12,4,0.97) 100%)" }} />
        <Box sx={{ position:"absolute",inset:0,background:"linear-gradient(105deg,rgba(2,12,4,0.72) 0%,transparent 55%)" }} />

        {/* grain */}
        <Box sx={{ position:"absolute",inset:0,opacity:0.045,pointerEvents:"none",backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",backgroundSize:"200px",animation:"grain 0.9s steps(1) infinite" }} />

        {/* scanline */}
        <Box sx={{ position:"absolute",left:0,right:0,height:"90px",background:"linear-gradient(180deg,transparent,rgba(74,222,128,0.025),transparent)",animation:"scanln 12s linear infinite",pointerEvents:"none",zIndex:1 }} />

        {/* grid overlay */}
        <Box sx={{ position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(74,222,128,0.028) 1px,transparent 1px),linear-gradient(90deg,rgba(74,222,128,0.028) 1px,transparent 1px)",backgroundSize:"80px 80px",zIndex:1,pointerEvents:"none" }} />

        {/* floating orbs */}
        <Orb x={5}  y={22} size={180} delay={0}   />
        <Orb x={82} y={30} size={110} delay={1.5} />
        <Orb x={42} y={78} size={70}  delay={0.9} />

        {/* decorative rings */}
        <Box sx={{ position:"absolute",right:"4%",top:"15%",width:280,height:280,borderRadius:"50%",border:"1px solid rgba(74,222,128,0.09)",animation:"rotatecw 28s linear infinite",pointerEvents:"none",zIndex:2 }}>
          <Box sx={{ position:"absolute",top:"50%",left:"-5px",width:10,height:10,borderRadius:"50%",background:"#4ade80",transform:"translateY(-50%)",boxShadow:"0 0 14px #4ade80" }} />
        </Box>
        <Box sx={{ position:"absolute",right:"calc(4% + 35px)",top:"calc(15% + 35px)",width:210,height:210,borderRadius:"50%",border:"1px solid rgba(74,222,128,0.055)",animation:"rotateccw 20s linear infinite",pointerEvents:"none",zIndex:2 }} />

        <Container maxWidth="xl" sx={{ position:"relative",zIndex:5,px:{ xs:3,md:8 },pt:14 }}>
          <Grid container spacing={6} alignItems="center">

            {/* ── left text ── */}
            <Grid item xs={12} md={6}>
              <motion.div style={{ y:heroTextY, opacity:heroAlpha }}>

                {/* badge */}
                <motion.div initial={{ opacity:0,x:-30 }} animate={{ opacity:1,x:0 }} transition={{ duration:0.8,delay:0.2 }}>
                  <Box sx={{ display:"inline-flex",alignItems:"center",gap:1,px:2,py:0.85,mb:3.5,borderRadius:"40px",border:"1px solid rgba(74,222,128,0.25)",background:"rgba(74,222,128,0.07)",backdropFilter:"blur(10px)" }}>
                    <Box sx={{ width:6,height:6,borderRadius:"50%",background:"#4ade80",boxShadow:"0 0 8px #4ade80",animation:"pulse 2s infinite" }} />
                    <Typography className="fm" sx={{ fontSize:10,color:"#4ade80",letterSpacing:2,textTransform:"uppercase" }}>
                      BCA 6th Sem · Internship Project · 2026
                    </Typography>
                  </Box>
                </motion.div>

                {/* headline */}
                <motion.div initial={{ opacity:0,y:40 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.9,delay:0.3 }}>
                  <Typography className="fd" sx={{ fontSize:{ xs:"2.8rem",md:"5rem" },fontWeight:700,lineHeight:1.02,mb:0.4,textShadow:"0 4px 32px rgba(0,0,0,0.55)" }}>
                    IoT Cultivation
                  </Typography>
                  <Box sx={{ display:"flex",alignItems:"center",gap:0.8,mb:2.5,minHeight:{ xs:"3.5rem",md:"5.5rem" } }}>
                    <Typography className="fd" sx={{ fontSize:{ xs:"2.8rem",md:"5rem" },fontWeight:400,fontStyle:"italic",lineHeight:1.02,background:"linear-gradient(90deg,#4ade80,#34d399,#6ee7b7)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>
                      {words[wIdx].slice(0, chars)}
                    </Typography>
                    <Box sx={{ width:2.5,height:{ xs:"2.6rem",md:"4.2rem" },background:"#4ade80",borderRadius:1,animation:"pulse 1s infinite" }} />
                  </Box>
                </motion.div>

                {/* description */}
                <motion.div initial={{ opacity:0,y:30 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.8,delay:0.45 }}>
                  <Typography className="fs" sx={{ fontSize:15.5,lineHeight:1.9,color:"rgba(232,245,233,0.55)",maxWidth:500,fontWeight:300,mb:3.5 }}>
                    A full-stack web application that monitors real-time environmental data from an IoT-powered cultivation chamber — combining hardware sensors, MongoDB Atlas, and a React PWA dashboard.
                  </Typography>
                </motion.div>

                {/* chips */}
                <motion.div initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.7,delay:0.55 }}>
                  <Box sx={{ display:"flex",flexWrap:"wrap",gap:1,mb:4 }}>
                    {["📡 IoT Sensors","🍃 MongoDB Atlas","⚛ React.js","🟢 Node.js","🔐 JWT Auth","📱 PWA"].map(t => (
                      <Box key={t} className="fm chip" sx={{ px:2,py:0.6,borderRadius:"30px",border:"1px solid rgba(74,222,128,0.18)",background:"rgba(2,12,4,0.6)",backdropFilter:"blur(8px)",fontSize:11.5,color:"rgba(232,245,233,0.58)",letterSpacing:0.3 }}>{t}</Box>
                    ))}
                  </Box>
                </motion.div>

                {/* buttons */}
                <motion.div initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.7,delay:0.65 }}>
                  <Box sx={{ display:"flex",gap:2,flexWrap:"wrap",alignItems:"center" }}>
                    <motion.div whileHover={{ scale:1.06 }} whileTap={{ scale:0.96 }}>
                      <Button onClick={() => navigate("/login")} className="cta-shine"
                        sx={{ px:4.5,py:1.6,fontSize:14,borderRadius:"10px",fontWeight:600,textTransform:"none",fontFamily:"'Outfit',sans-serif",background:"linear-gradient(135deg,#2d6a4f,#4ade80)",color:"#020c04",boxShadow:"0 10px 32px rgba(74,222,128,0.38)","&:hover":{ boxShadow:"0 14px 44px rgba(74,222,128,0.6)" },transition:"box-shadow 0.3s" }}>
                        Open Dashboard →
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale:1.06 }} whileTap={{ scale:0.96 }}>
                      <Button onClick={() => navigate("/signup")}
                        sx={{ px:4.5,py:1.6,fontSize:14,borderRadius:"10px",textTransform:"none",fontFamily:"'Outfit',sans-serif",color:"#a7f3d0",border:"1px solid rgba(74,222,128,0.25)",backdropFilter:"blur(10px)",background:"rgba(2,12,4,0.4)","&:hover":{ borderColor:"rgba(74,222,128,0.5)",background:"rgba(74,222,128,0.08)" },transition:"all 0.3s" }}>
                        Create Account
                      </Button>
                    </motion.div>
                  </Box>
                  <Typography className="fm" sx={{ mt:1.5,fontSize:10,color:"rgba(232,245,233,0.2)",letterSpacing:0.5 }}>
                    Admin & User roles · Demo data included
                  </Typography>
                </motion.div>
              </motion.div>
            </Grid>

            {/* ── right panel ── */}
            <Grid item xs={12} md={6}>
              <motion.div initial={{ opacity:0,x:80,y:20 }} animate={{ opacity:1,x:0,y:0 }} transition={{ duration:1,delay:0.5,ease:[0.22,1,0.36,1] }}>
                <Box sx={{ position:"relative" }}>
                  {/* outer glow border */}
                  <Box sx={{ position:"absolute",inset:-1,borderRadius:"20px",background:"linear-gradient(135deg,rgba(74,222,128,0.22),transparent,rgba(74,222,128,0.12))",filter:"blur(0.5px)" }} />

                  <Box sx={{ position:"relative",borderRadius:"18px",border:"1px solid rgba(74,222,128,0.14)",background:"rgba(2,12,4,0.78)",backdropFilter:"blur(32px)",overflow:"hidden",boxShadow:"0 40px 100px rgba(0,0,0,0.72), 0 0 60px rgba(74,222,128,0.05), inset 0 1px 0 rgba(74,222,128,0.12)" }}>

                    {/* top bar */}
                    <Box sx={{ px:3,py:2,borderBottom:"1px solid rgba(74,222,128,0.08)",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(74,222,128,0.022)" }}>
                      <Box sx={{ display:"flex",alignItems:"center",gap:1.5 }}>
                        <Box sx={{ display:"flex",gap:0.6 }}>
                          {["#f87171","#fbbf24","#4ade80"].map(c => <Box key={c} sx={{ width:9,height:9,borderRadius:"50%",background:c,opacity:0.8 }} />)}
                        </Box>
                        <Box>
                          <Typography className="fm" sx={{ fontSize:10,color:"#4ade80",letterSpacing:1.5,textTransform:"uppercase" }}>Chamber CH-001</Typography>
                          <Typography className="fm" sx={{ fontSize:9,color:"rgba(232,245,233,0.28)",mt:0.2 }}>MongoDB Atlas · Demo feed</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display:"flex",alignItems:"center",gap:0.8,px:1.8,py:0.6,borderRadius:"20px",background:"rgba(74,222,128,0.08)",border:"1px solid rgba(74,222,128,0.2)" }}>
                        <Box sx={{ width:5,height:5,borderRadius:"50%",background:"#4ade80",boxShadow:"0 0 7px #4ade80",animation:"pulse 2s infinite" }} />
                        <Typography className="fm" sx={{ fontSize:9.5,color:"#4ade80",letterSpacing:1 }}>LIVE</Typography>
                      </Box>
                    </Box>

                    {/* sensor grid */}
                    <Box sx={{ p:2.5,display:"grid",gridTemplateColumns:"1fr 1fr",gap:1.8 }}>
                      {SENSORS.map((s, i) => (
                        <motion.div key={i} initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.7+i*0.1,duration:0.6 }}>
                          <Box className="sensor-card" sx={{ p:2,borderRadius:"12px",background:`rgba(${s.ok?"74,222,128":"248,113,113"},0.03)`,border:`1px solid ${s.ok?"rgba(74,222,128,0.12)":"rgba(248,113,113,0.18)"}` }}>
                            <Box sx={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                              <Box>
                                <Typography className="fm" sx={{ fontSize:9,color:"rgba(232,245,233,0.38)",letterSpacing:1.2,textTransform:"uppercase",mb:0.4 }}>{s.label}</Typography>
                                <Box sx={{ display:"flex",alignItems:"baseline",gap:0.5 }}>
                                  <Typography className="fm" sx={{ fontSize:24,fontWeight:500,color:"#e8f5e9",lineHeight:1 }}>{liveValues[i]}</Typography>
                                  <Typography className="fs" sx={{ fontSize:11,color:"rgba(232,245,233,0.38)" }}>{s.unit}</Typography>
                                </Box>
                              </Box>
                              <Spark data={s.trend} ok={s.ok} />
                            </Box>
                            {/* progress */}
                            <Box sx={{ height:2,borderRadius:1,background:"rgba(255,255,255,0.06)",mt:1.5,overflow:"hidden" }}>
                              <motion.div initial={{ width:0 }} animate={{ width:`${s.ok?70:35}%` }} transition={{ delay:0.9+i*0.1,duration:1 }}
                                style={{ height:"100%",borderRadius:2,background:s.ok?"linear-gradient(90deg,#1a5c3a,#4ade80)":"linear-gradient(90deg,#7f1d1d,#f87171)" }} />
                            </Box>
                            <Box sx={{ display:"flex",alignItems:"center",gap:0.5,mt:0.9 }}>
                              <Box sx={{ width:5,height:5,borderRadius:"50%",background:s.ok?"#4ade80":"#f87171" }} />
                              <Typography className="fm" sx={{ fontSize:9,color:s.ok?"#4ade80":"#f87171" }}>{s.ok?"Normal":"Needs attention"}</Typography>
                            </Box>
                          </Box>
                        </motion.div>
                      ))}
                    </Box>

                    {/* 24h bar chart */}
                    <Box sx={{ px:2.5,pb:2.5 }}>
                      <Box sx={{ display:"flex",justifyContent:"space-between",mb:1 }}>
                        <Typography className="fm" sx={{ fontSize:9,color:"rgba(232,245,233,0.22)",letterSpacing:1.5,textTransform:"uppercase" }}>24h Activity</Typography>
                        <Typography className="fm" sx={{ fontSize:9,color:"rgba(74,222,128,0.5)" }}>Temp · Humidity</Typography>
                      </Box>
                      <Box sx={{ display:"flex",alignItems:"flex-end",gap:"2px",height:44 }}>
                        {[42,55,48,62,58,72,64,80,88,74,78,85,68,82,70,90,76,92,68,80,85,72,78,88].map((h, i) => (
                          <motion.div key={i} initial={{ scaleY:0 }} animate={{ scaleY:1 }} transition={{ delay:0.9+i*0.018,duration:0.4,ease:"backOut" }} style={{ flex:1,transformOrigin:"bottom" }}>
                            <Box sx={{ width:"100%",height:`${h}%`,borderRadius:"2px 2px 0 0",background:h>80?"rgba(74,222,128,0.78)":h>60?"rgba(74,222,128,0.46)":"rgba(74,222,128,0.22)" }} />
                          </motion.div>
                        ))}
                      </Box>
                    </Box>

                    {/* bottom strip */}
                    <Box sx={{ borderTop:"1px solid rgba(74,222,128,0.07)",px:3,py:1.5,display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(74,222,128,0.012)" }}>
                      <Typography className="fm" sx={{ fontSize:9.5,color:"rgba(232,245,233,0.28)" }}>Last sync: just now</Typography>
                      <Box sx={{ display:"flex",gap:1.5 }}>
                        {[true,true,false,true].map((ok,i) => (
                          <Box key={i} sx={{ display:"flex",alignItems:"center",gap:0.4 }}>
                            <Box sx={{ width:4,height:4,borderRadius:"50%",background:ok?"#4ade80":"#f87171" }} />
                            <Typography className="fm" sx={{ fontSize:8.5,color:ok?"rgba(74,222,128,0.6)":"rgba(248,113,113,0.6)" }}>{["T","H","S","L"][i]}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </motion.div>
            </Grid>
          </Grid>
        </Container>

        {/* scroll hint */}
        <motion.div animate={{ y:[0,12,0] }} transition={{ duration:2.2,repeat:Infinity }} style={{ position:"absolute",bottom:30,left:"50%",transform:"translateX(-50%)",zIndex:6 }}>
          <Box sx={{ display:"flex",flexDirection:"column",alignItems:"center",gap:0.8 }}>
            <Typography className="fm" sx={{ fontSize:9,color:"rgba(232,245,233,0.2)",letterSpacing:3,textTransform:"uppercase" }}>scroll</Typography>
            <Box sx={{ width:"1px",height:40,background:"linear-gradient(180deg,rgba(74,222,128,0.5),transparent)" }} />
          </Box>
        </motion.div>
      </Box>

      {/* ╔══════════════════════════════════════╗
          ║  STATS STRIP                         ║
          ╚══════════════════════════════════════╝ */}
      <Box sx={{ py:{ xs:5,md:6 },borderTop:"1px solid rgba(74,222,128,0.06)",borderBottom:"1px solid rgba(74,222,128,0.06)",background:"rgba(74,222,128,0.012)" }}>
        <Container maxWidth="lg">
          <Box sx={{ display:"flex",justifyContent:"center",flexWrap:"wrap",gap:{ xs:4,md:9 } }}>
            {[
              { n:4,      suffix:"",       label:"Sensor Types",    dec:0 },
              { n:99.9,   suffix:"%",      label:"Uptime Target",   dec:1 },
              { n:24,     suffix:"/7",     label:"Live Monitoring", dec:0 },
              { n:2,      suffix:" Roles", label:"Admin & User",    dec:0 },
            ].map((s, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once:true }} custom={i*0.15}>
                <Box sx={{ textAlign:"center" }}>
                  <Typography className="fd" sx={{ fontSize:{ xs:"2.2rem",md:"3rem" },fontWeight:700,color:"#4ade80",lineHeight:1 }}>
                    <CountUp target={s.n} decimals={s.dec} />{s.suffix}
                  </Typography>
                  <Typography className="fs" sx={{ fontSize:12,color:"rgba(232,245,233,0.33)",mt:0.5,letterSpacing:0.5 }}>{s.label}</Typography>
                </Box>
              </motion.div>
            ))}
          </Box>
        </Container>
      </Box>

      {/* ╔══════════════════════════════════════╗
          ║  GALLERY                             ║
          ╚══════════════════════════════════════╝ */}
      <Box sx={{ py:{ xs:8,md:10 } }}>
        <Container maxWidth="xl" sx={{ px:{ xs:2,md:6 } }}>
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once:true }}>
            <Typography className="fm" sx={{ fontSize:10,color:"rgba(74,222,128,0.6)",letterSpacing:3,textTransform:"uppercase",mb:1,textAlign:"center" }}>Real-World Context</Typography>
            <Typography className="fd" sx={{ fontSize:{ xs:"1.6rem",md:"2.2rem" },fontWeight:400,textAlign:"center",color:"rgba(232,245,233,0.45)",mb:5 }}>What the system monitors</Typography>
          </motion.div>
          <Box sx={{ display:"grid",gap:2,gridTemplateColumns:{ xs:"1fr 1fr",md:"1.65fr 1fr 1fr" },gridTemplateRows:{ md:"220px 220px" } }}>
            {[
              { src:IMGS.g1, label:"Smart Greenhouse",   span:true  },
              { src:IMGS.g2, label:"Sensor Network",     span:false },
              { src:IMGS.g3, label:"Plant Growth",       span:false },
              { src:IMGS.g4, label:"Cultivation Control",span:false },
            ].map((g, i) => (
              <motion.div key={i} className="gallery-wrap"
                initial={{ opacity:0,scale:0.93 }} whileInView={{ opacity:1,scale:1 }}
                viewport={{ once:true }} transition={{ delay:i*0.1,duration:0.75,ease:[0.22,1,0.36,1] }}
                style={{ gridRow: g.span ? "1 / 3" : "auto" }}>
                <Box sx={{ position:"relative",borderRadius:"16px",overflow:"hidden",height:"100%",minHeight:180,border:"1px solid rgba(74,222,128,0.1)",cursor:"pointer" }}>
                  <Box component="img" src={g.src} alt={g.label} sx={{ width:"100%",height:"100%",objectFit:"cover",display:"block",filter:"brightness(0.68) saturate(1.1)" }} />
                  <Box sx={{ position:"absolute",inset:0,background:"linear-gradient(180deg,transparent 50%,rgba(2,12,4,0.88) 100%)" }} />
                  <Box sx={{ position:"absolute",bottom:14,left:14 }}>
                    <Typography className="fm" sx={{ fontSize:11,color:"#4ade80",letterSpacing:1 }}>{g.label}</Typography>
                  </Box>
                </Box>
              </motion.div>
            ))}
          </Box>
        </Container>
      </Box>

      {/* ╔══════════════════════════════════════╗
          ║  HOW IT WORKS                        ║
          ╚══════════════════════════════════════╝ */}
      <Box id="how" sx={{ py:{ xs:10,md:16 },position:"relative",overflow:"hidden" }}>
        {/* bg */}
        <Box sx={{ position:"absolute",inset:0 }}>
          <Box component="img" src={IMGS.mid} alt="" sx={{ width:"100%",height:"100%",objectFit:"cover",filter:"brightness(0.1) saturate(0.5)" }} />
          <Box sx={{ position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(2,12,4,1) 0%,rgba(2,12,4,0.58) 40%,rgba(2,12,4,1) 100%)" }} />
        </Box>
        <Box sx={{ position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(74,222,128,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(74,222,128,0.022) 1px,transparent 1px)",backgroundSize:"60px 60px" }} />

        <Container maxWidth="xl" sx={{ position:"relative",zIndex:2,px:{ xs:3,md:8 } }}>
          <Grid container spacing={6} alignItems="center">
            {/* left */}
            <Grid item xs={12} md={5}>
              <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once:true }}>
                <Typography className="fm" sx={{ fontSize:10,color:"#4ade80",letterSpacing:3,textTransform:"uppercase",mb:1.5 }}>System Architecture</Typography>
                <Typography className="fd" sx={{ fontSize:{ xs:"2.2rem",md:"3.5rem" },fontWeight:700,lineHeight:1.1,mb:2.5 }}>
                  From sensor<br />
                  <Box component="span" sx={{ fontStyle:"italic",fontWeight:400,color:"rgba(232,245,233,0.4)" }}>to dashboard.</Box>
                </Typography>
                <Typography className="fs" sx={{ fontSize:15,color:"rgba(232,245,233,0.42)",lineHeight:1.9,fontWeight:300,mb:4 }}>
                  A seamless pipeline carries each sensor reading from the cultivation chamber to your browser in real time — no delays, no data loss.
                </Typography>
                {/* pipeline visual */}
                <Box sx={{ display:"flex",flexDirection:"column",gap:0 }}>
                  {[["📡","IoT Sensors"],["🟢","Node.js API"],["🍃","MongoDB Atlas"],["⚛","React Dashboard"]].map(([icon, label], i) => (
                    <Box key={i} sx={{ display:"flex",alignItems:"center",gap:1.5 }}>
                      <Box sx={{ display:"flex",flexDirection:"column",alignItems:"center" }}>
                        <Box sx={{ width:34,height:34,borderRadius:"50%",border:"1px solid rgba(74,222,128,0.28)",background:"rgba(74,222,128,0.07)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15 }}>{icon}</Box>
                        {i < 3 && <Box sx={{ width:1,height:18,background:"linear-gradient(180deg,rgba(74,222,128,0.3),rgba(74,222,128,0.07))" }} />}
                      </Box>
                      <Typography className="fm" sx={{ fontSize:12,color:"rgba(232,245,233,0.52)" }}>{label}</Typography>
                    </Box>
                  ))}
                </Box>
              </motion.div>
            </Grid>

            {/* right cards */}
            <Grid item xs={12} md={7}>
              <Box sx={{ display:"grid",gridTemplateColumns:{ xs:"1fr",sm:"1fr 1fr" },gap:2 }}>
                {HOW.map((item, i) => (
                  <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once:true }} custom={i*0.15}>
                    <Box className="how-card" sx={{ p:3,borderRadius:"16px",height:"100%",border:"1px solid rgba(74,222,128,0.09)",background:"rgba(2,12,4,0.62)",backdropFilter:"blur(20px)",position:"relative",overflow:"hidden" }}>
                      <Box sx={{ position:"absolute",bottom:0,left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent,rgba(74,222,128,0.35),transparent)",opacity:0,transition:"opacity 0.35s",".how-card:hover &":{ opacity:1 } }} />
                      <Box sx={{ fontSize:22,mb:1.5 }}>{item.icon}</Box>
                      <Typography className="how-n fd" sx={{ fontSize:"3rem",fontWeight:700,color:"rgba(74,222,128,0.14)",lineHeight:1,mb:1,transition:"color 0.3s" }}>{item.n}</Typography>
                      <Typography className="fs" sx={{ fontSize:15,fontWeight:600,color:"#e8f5e9",mb:1 }}>{item.title}</Typography>
                      <Typography className="fs" sx={{ fontSize:13,color:"rgba(232,245,233,0.4)",lineHeight:1.8,fontWeight:300 }}>{item.body}</Typography>
                    </Box>
                  </motion.div>
                ))}
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ╔══════════════════════════════════════╗
          ║  ZOOM QUOTE                          ║
          ╚══════════════════════════════════════╝ */}
      <Box ref={zoomRef} sx={{ height:"110vh",position:"relative",overflow:"hidden" }}>
        <Box sx={{ position:"absolute",inset:0 }}>
          <Box component="img" src={IMGS.cta} alt="" sx={{ width:"100%",height:"120%",objectFit:"cover",filter:"brightness(0.15) saturate(0.55)" }} />
          <Box sx={{ position:"absolute",inset:0,background:"radial-gradient(ellipse at center,rgba(45,106,79,0.3) 0%,rgba(2,12,4,0.92) 70%)" }} />
        </Box>
        <motion.div style={{ scale:zScale,opacity:zOpacity,position:"sticky",top:"38%",textAlign:"center",zIndex:2 }}>
          <Container maxWidth="md">
            <Typography className="fd" sx={{ fontSize:{ xs:"2.2rem",md:"4.5rem" },fontWeight:700,lineHeight:1.1,mb:1.5 }}>From sensor to screen —</Typography>
            <Typography className="fd" sx={{ fontSize:{ xs:"2.2rem",md:"4.5rem" },fontWeight:400,fontStyle:"italic",background:"linear-gradient(90deg,#4ade80,#34d399,#6ee7b7)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1.1 }}>in real time.</Typography>
            <Typography className="fs" sx={{ mt:3,fontSize:14,color:"rgba(232,245,233,0.28)",letterSpacing:1 }}>IoT Hardware · MongoDB Atlas · React PWA</Typography>
          </Container>
        </motion.div>
      </Box>

      {/* ╔══════════════════════════════════════╗
          ║  TECH STACK                          ║
          ╚══════════════════════════════════════╝ */}
      <Box id="tech" sx={{ py:{ xs:10,md:14 },borderTop:"1px solid rgba(74,222,128,0.06)" }}>
        <Container maxWidth="xl" sx={{ px:{ xs:3,md:8 } }}>
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once:true }}>
            <Typography className="fm" sx={{ fontSize:10,color:"#4ade80",letterSpacing:3,textTransform:"uppercase",mb:1.5,textAlign:{ xs:"left",md:"center" } }}>Technologies Used</Typography>
            <Typography className="fd" sx={{ fontSize:{ xs:"2.2rem",md:"3.5rem" },fontWeight:700,mb:{ xs:6,md:8 },lineHeight:1.1,textAlign:{ xs:"left",md:"center" } }}>Built with modern tools.</Typography>
          </motion.div>
          <Box sx={{ display:"grid",gridTemplateColumns:{ xs:"1fr 1fr",sm:"repeat(3,1fr)",md:"repeat(6,1fr)" },gap:2 }}>
            {STACK.map((t, i) => (
              <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once:true }} custom={i*0.1}>
                <Box className="stack-card" sx={{ p:3,borderRadius:"16px",textAlign:"center",border:"1px solid rgba(74,222,128,0.08)",background:"rgba(255,255,255,0.012)",cursor:"default" }}>
                  <Box sx={{ fontSize:30,mb:1.5 }}>{t.icon}</Box>
                  <Typography className="fs" sx={{ fontSize:14,fontWeight:600,color:"#e8f5e9",mb:0.4 }}>{t.name}</Typography>
                  <Typography className="fm" sx={{ fontSize:10,color:"rgba(74,222,128,0.52)",letterSpacing:0.5 }}>{t.tag}</Typography>
                </Box>
              </motion.div>
            ))}
          </Box>
        </Container>
      </Box>

      {/* ╔══════════════════════════════════════╗
          ║  TEAM                                ║
          ╚══════════════════════════════════════╝ */}
      <Box
        id="team"
        sx={{
          py:{ xs:10,md:14 },
          borderTop:"1px solid rgba(74,222,128,0.06)",
          position:"relative",
          overflow:"hidden",
          background:"radial-gradient(circle at top, rgba(45,106,79,0.12), transparent 30%), linear-gradient(180deg, #020c04 0%, #07120b 48%, #020c04 100%)",
        }}
      >
        <Box
          sx={{
            position:"absolute",
            inset:0,
            opacity:0.28,
            backgroundImage:"radial-gradient(circle at 1px 1px, rgba(74,222,128,0.14) 1px, transparent 0)",
            backgroundSize:"20px 20px",
            pointerEvents:"none",
          }}
        />
        <Box sx={{ position:"absolute",top:"10%",left:"50%",transform:"translateX(-50%)",width:780,height:780,borderRadius:"50%",background:"radial-gradient(circle, rgba(74,222,128,0.09) 0%, transparent 68%)",pointerEvents:"none" }} />
        <Container maxWidth={false} sx={{ position:"relative",zIndex:1,px:{ xs:3,md:4,lg:6 } }}>
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once:true }}>
            <Box sx={{ textAlign:"center",maxWidth:980,mx:"auto",mb:{ xs:6,md:8 } }}>
              <Box sx={{ display:"inline-flex",alignItems:"center",gap:1,px:2.2,py:1,borderRadius:"999px",background:"rgba(74,222,128,0.1)",border:"1px solid rgba(74,222,128,0.14)",mb:3 }}>
                <Typography sx={{ fontSize:14 }}>👤</Typography>
                <Typography className="fs" sx={{ fontSize:13,fontWeight:600,color:"#86efac" }}>Meet Our Team</Typography>
              </Box>
              <Typography className="fs" sx={{ fontSize:{ xs:"2.5rem",md:"4.2rem",lg:"5rem" },fontWeight:700,color:"#f8fafc",lineHeight:1.04,mb:2.5,letterSpacing:"-0.04em" }}>
                Our Exceptional Team
              </Typography>
              <Typography className="fs" sx={{ fontSize:{ xs:17,md:20 },color:"rgba(232,245,233,0.78)",lineHeight:1.7,maxWidth:1180,mx:"auto",mb:1.5 }}>
                Meet our outstanding team, a synergy of talent, creativity, and dedication, crafting success together with passion and innovation.
              </Typography>
              <Typography className="fm" sx={{ fontSize:11,color:"rgba(74,222,128,0.56)",letterSpacing:0.8 }}>
                Add your own photos in `public/team/` and update the `imageUrl` values in the team list.
              </Typography>
            </Box>
          </motion.div>

          <Grid container spacing={2.5}>
            {TEAM.map((m, i) => (
              <Grid item xs={12} sm={6} lg={3} key={m.name}>
                <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once:true }} custom={i*0.12}>
                  <Box
                    className="team-card"
                    sx={{
                      p:{ xs:3,md:3.5 },
                      minHeight:420,
                      borderRadius:"26px",
                      border:"1px solid rgba(74,222,128,0.1)",
                      background:"linear-gradient(180deg, rgba(8,15,10,0.96), rgba(7,18,11,0.94))",
                      boxShadow:"0 10px 30px rgba(0,0,0,0.36)",
                      display:"flex",
                      flexDirection:"column",
                      alignItems:"center",
                      textAlign:"center",
                    }}
                  >
                    <Box
                      className="team-profile-ring"
                      sx={{
                        width:{ xs:152,md:168 },
                        height:{ xs:152,md:168 },
                        borderRadius:"50%",
                        p:"6px",
                        mb:3,
                        background:`linear-gradient(135deg, ${m.color}, #1a5c3a 65%)`,
                        transition:"all 0.32s cubic-bezier(.22,1,.36,1)",
                      }}
                    >
                      <Box
                        component={m.imageUrl ? "img" : "div"}
                        src={m.imageUrl || undefined}
                        alt={m.imageUrl ? m.name : undefined}
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                          const next = event.currentTarget.nextSibling;
                          if (next) next.style.display = "flex";
                        }}
                        sx={{
                          width:"100%",
                          height:"100%",
                          borderRadius:"50%",
                          objectFit:"cover",
                          display:"block",
                          background:"#07120b",
                          border:"4px solid rgba(7,18,11,0.95)",
                        }}
                      />
                      <Box
                        sx={{
                          display:m.imageUrl ? "none" : "flex",
                          width:"100%",
                          height:"100%",
                          borderRadius:"50%",
                          alignItems:"center",
                          justifyContent:"center",
                          background:"radial-gradient(circle, rgba(74,222,128,0.18), rgba(7,18,11,0.95))",
                          border:"4px solid rgba(7,18,11,0.95)",
                        }}
                      >
                        <Typography className="fd" sx={{ fontSize:40,fontWeight:700,color:"#e8f5e9" }}>
                          {m.name[0]}
                        </Typography>
                      </Box>
                    </Box>

                    <Typography className="team-name fs" sx={{ fontSize:{ xs:18,md:20 },fontWeight:700,color:"#f8fafc",mb:1,transition:"color 0.25s ease" }}>
                      {m.name}
                    </Typography>

                    <Box sx={{ px:2,py:0.8,borderRadius:"999px",background:"rgba(29,78,48,0.42)",border:"1px solid rgba(74,222,128,0.1)",mb:3 }}>
                      <Typography className="fs" sx={{ fontSize:13,fontWeight:600,color:"rgba(232,245,233,0.95)" }}>
                        {m.role}
                      </Typography>
                    </Box>

                    <Box sx={{ display:"flex",gap:1.3,mt:"auto" }}>
                      <Box
                        component="a"
                        href={m.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="team-social"
                        aria-label={`${m.name} LinkedIn`}
                        sx={{
                          width:42,
                          height:42,
                          borderRadius:"50%",
                          display:"flex",
                          alignItems:"center",
                          justifyContent:"center",
                          color:"rgba(232,245,233,0.72)",
                          background:"rgba(29,78,48,0.36)",
                          border:"1px solid rgba(74,222,128,0.1)",
                          "&:hover":{ color:"#fff", background:"#0a66c2" },
                        }}
                      >
                        <LinkedInIcon />
                      </Box>
                      <Box
                        component="a"
                        href={m.github}
                        target="_blank"
                        rel="noreferrer"
                        className="team-social"
                        aria-label={`${m.name} GitHub`}
                        sx={{
                          width:42,
                          height:42,
                          borderRadius:"50%",
                          display:"flex",
                          alignItems:"center",
                          justifyContent:"center",
                          color:"rgba(232,245,233,0.72)",
                          background:"rgba(29,78,48,0.36)",
                          border:"1px solid rgba(74,222,128,0.1)",
                          "&:hover":{ color:"#fff", background:"#111827" },
                        }}
                      >
                        <GitHubIcon />
                      </Box>
                    </Box>
                  </Box>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ╔══════════════════════════════════════╗
          ║  FINAL CTA                           ║
          ╚══════════════════════════════════════╝ */}
      <Box sx={{ position:"relative",overflow:"hidden",borderTop:"1px solid rgba(74,222,128,0.06)" }}>
        <Box sx={{ position:"absolute",inset:0 }}>
          <Box component="img" src={IMGS.cta} alt="" sx={{ width:"100%",height:"100%",objectFit:"cover",filter:"brightness(0.12) saturate(0.45)" }} />
          <Box sx={{ position:"absolute",inset:0,background:"linear-gradient(180deg,rgba(2,12,4,1) 0%,rgba(2,12,4,0.6) 50%,rgba(2,12,4,1) 100%)" }} />
        </Box>
        <Box sx={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:560,height:560,borderRadius:"50%",background:"radial-gradient(circle,rgba(45,106,79,0.22) 0%,transparent 70%)",pointerEvents:"none",zIndex:1 }} />
        <Container maxWidth="md" sx={{ position:"relative",zIndex:2,textAlign:"center",py:{ xs:14,md:18 } }}>
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once:true }}>
            <Typography className="fm" sx={{ fontSize:10,color:"#4ade80",letterSpacing:3,textTransform:"uppercase",mb:2 }}>Get Started</Typography>
            <Typography className="fd" sx={{ fontSize:{ xs:"2.2rem",md:"4.2rem" },fontWeight:700,lineHeight:1.08,mb:1 }}>Ready to explore</Typography>
            <Typography className="fd" sx={{ fontSize:{ xs:"2.2rem",md:"4.2rem" },fontWeight:400,fontStyle:"italic",color:"rgba(232,245,233,0.4)",lineHeight:1.08,mb:3 }}>the dashboard?</Typography>
            <Typography className="fs" sx={{ fontSize:15,color:"rgba(232,245,233,0.33)",mb:6,maxWidth:420,mx:"auto",lineHeight:1.85 }}>
              Create an account to view live chamber data, sensor readings, and historical charts.
            </Typography>
            <Box sx={{ display:"flex",gap:2.5,justifyContent:"center",flexWrap:"wrap" }}>
              <motion.div whileHover={{ scale:1.06 }} whileTap={{ scale:0.96 }}>
                <Button onClick={() => navigate("/signup")} className="cta-shine"
                  sx={{ px:5.5,py:1.7,fontSize:15,borderRadius:"12px",fontWeight:600,textTransform:"none",fontFamily:"'Outfit',sans-serif",background:"linear-gradient(135deg,#2d6a4f,#4ade80)",color:"#020c04",boxShadow:"0 10px 38px rgba(74,222,128,0.42)","&:hover":{ boxShadow:"0 16px 52px rgba(74,222,128,0.62)" },transition:"box-shadow 0.3s" }}>
                  Create Account →
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale:1.06 }} whileTap={{ scale:0.96 }}>
                <Button onClick={() => navigate("/login")}
                  sx={{ px:5.5,py:1.7,fontSize:15,borderRadius:"12px",textTransform:"none",fontFamily:"'Outfit',sans-serif",color:"#a7f3d0",border:"1px solid rgba(74,222,128,0.25)",backdropFilter:"blur(10px)","&:hover":{ borderColor:"rgba(74,222,128,0.5)",background:"rgba(74,222,128,0.07)" },transition:"all 0.3s" }}>
                  Login
                </Button>
              </motion.div>
            </Box>
          </motion.div>
        </Container>
      </Box>

      {/* ╔══════════════════════════════════════╗
          ║  FOOTER                              ║
          ╚══════════════════════════════════════╝ */}
      <Box sx={{ borderTop:"1px solid rgba(74,222,128,0.07)",py:4,px:{ xs:3,md:8 } }}>
        <Box sx={{ display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:2 }}>
          <Box sx={{ display:"flex",alignItems:"center",gap:1.2 }}>
            <Box sx={{ width:24,height:24,borderRadius:"7px",background:"linear-gradient(135deg,#2d6a4f,#4ade80)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13 }}>🌿</Box>
            <Typography className="fs" sx={{ fontSize:13,color:"rgba(232,245,233,0.26)" }}>SmartCultivation · BCA Internship Project · 2026</Typography>
          </Box>
          <Typography className="fm" sx={{ fontSize:10,color:"rgba(232,245,233,0.14)",letterSpacing:0.5 }}>React · MUI · MongoDB Atlas · IoT</Typography>
        </Box>
      </Box>
    </Box>
  );
}
