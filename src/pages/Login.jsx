import { Box, Button, TextField, Typography, Alert } from "@mui/material";
import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "8px",
    background: "rgba(74,222,128,0.03)",
    color: "#e8f5e9",
    fontFamily: "'DM Sans', sans-serif",
    "& fieldset": { borderColor: "rgba(74,222,128,0.15)" },
    "&:hover fieldset": { borderColor: "rgba(74,222,128,0.35)" },
    "&.Mui-focused fieldset": { borderColor: "#4ade80", borderWidth: 1 },
  },
  "& .MuiInputLabel-root": { color: "rgba(232,245,233,0.4)", fontFamily: "'DM Sans',sans-serif" },
  "& .MuiInputLabel-root.Mui-focused": { color: "#4ade80" },
  "& input:-webkit-autofill": {
    WebkitBoxShadow: "0 0 0 1000px #080f0a inset",
    WebkitTextFillColor: "#e8f5e9",
  },
};

export default function Login() {
  const navigate = useNavigate();
  const { login, error, setError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600)); // simulate API call
    const ok = login(email, password);
    setLoading(false);
    if (ok) navigate("/dashboard");
  };

  return (
    <Box sx={{
      minHeight: "100vh", background: "#040d08",
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Cormorant+Garamond:ital,wght@0,300;0,600;1,300&family=JetBrains+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;font-family:'DM Sans',sans-serif}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
      `}</style>

      {/* Background glow blobs */}
      <Box sx={{ position:"absolute",top:"10%",left:"5%",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(45,106,79,0.18) 0%,transparent 70%)",pointerEvents:"none" }} />
      <Box sx={{ position:"absolute",bottom:"10%",right:"5%",width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle,rgba(52,211,153,0.1) 0%,transparent 70%)",pointerEvents:"none" }} />

      {/* Grid bg */}
      <Box sx={{ position:"absolute",inset:0,opacity:0.025,backgroundImage:"linear-gradient(rgba(74,222,128,1) 1px,transparent 1px),linear-gradient(90deg,rgba(74,222,128,1) 1px,transparent 1px)",backgroundSize:"50px 50px" }} />

      {/* Card */}
      <Box component={motion.div} initial={{ opacity:0,scale:0.95 }} animate={{ opacity:1,scale:1 }} transition={{ duration:0.6,ease:[0.22,1,0.36,1] }}
        sx={{ width:"100%",maxWidth:440,mx:3,borderRadius:"18px",border:"1px solid rgba(74,222,128,0.14)",background:"rgba(8,15,10,0.85)",backdropFilter:"blur(24px)",boxShadow:"0 32px 80px rgba(0,0,0,0.6),inset 0 1px 0 rgba(74,222,128,0.08)",overflow:"hidden" }}>

        {/* Top accent bar */}
        <Box sx={{ height:2,background:"linear-gradient(90deg,transparent,#4ade80,transparent)" }} />

        <Box sx={{ p:{xs:4,md:5} }}>
          {/* Logo */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
            <Box sx={{ display:"flex",alignItems:"center",gap:1,mb:5 }}>
              <Box sx={{ width:32,height:32,borderRadius:"8px",background:"linear-gradient(135deg,#2d6a4f,#4ade80)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16 }}>🌿</Box>
              <Typography sx={{ fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:600,color:"#e8f5e9" }}>SmartCultivation</Typography>
            </Box>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
            <Typography sx={{ fontFamily:"'Cormorant Garamond',serif",fontSize:"2rem",fontWeight:300,color:"#e8f5e9",lineHeight:1.1,mb:0.8 }}>Welcome back</Typography>
            <Typography sx={{ fontSize:13.5,color:"rgba(232,245,233,0.4)",mb:4 }}>Sign in to your cultivation dashboard</Typography>
          </motion.div>

          {error && (
            <motion.div initial={{ opacity:0,y:-8 }} animate={{ opacity:1,y:0 }}>
              <Alert severity="error" sx={{ mb:3,borderRadius:"8px",background:"rgba(248,113,113,0.08)",color:"#fca5a5",border:"1px solid rgba(248,113,113,0.2)","& .MuiAlert-icon":{color:"#f87171"} }}>{error}</Alert>
            </motion.div>
          )}

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
            <TextField fullWidth label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              sx={{ ...inputSx, mb:2.5 }} />
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}>
            <TextField fullWidth label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              sx={{ ...inputSx, mb:3 }} />
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4}>
            <motion.div whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}>
              <Button fullWidth onClick={handleLogin} disabled={loading}
                sx={{ py:1.6,fontSize:14,borderRadius:"8px",fontWeight:500,background:"linear-gradient(135deg,#2d6a4f,#4ade80)",color:"#040d08",boxShadow:"0 8px 24px rgba(74,222,128,0.25)",mb:3,transition:"all 0.3s","&:hover":{boxShadow:"0 12px 32px rgba(74,222,128,0.45)"},"&:disabled":{opacity:0.5} }}>
                {loading ? "Signing in…" : "Sign In"}
              </Button>
            </motion.div>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={5}>
            <Box sx={{ pt:3,borderTop:"1px solid rgba(74,222,128,0.08)",textAlign:"center" }}>
              <Typography sx={{ fontSize:13.5,color:"rgba(232,245,233,0.35)" }}>
                Don't have an account?{" "}
                <Box component="span" onClick={() => navigate("/signup")} sx={{ color:"#4ade80",cursor:"pointer",fontWeight:500,"&:hover":{textDecoration:"underline"} }}>Sign Up</Box>
              </Typography>
              <Box component="span" onClick={() => navigate("/")} sx={{ display:"inline-flex",alignItems:"center",gap:0.5,mt:2,fontSize:12,color:"rgba(232,245,233,0.25)",cursor:"pointer","&:hover":{color:"rgba(232,245,233,0.5)"} }}>
                ← Back to Home
              </Box>
            </Box>
          </motion.div>
        </Box>
      </Box>
    </Box>
  );
}