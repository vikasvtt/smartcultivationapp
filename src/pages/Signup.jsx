import { Box, Button, TextField, Typography, Alert, ToggleButton, ToggleButtonGroup, CircularProgress } from "@mui/material";
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

export default function Signup() {
  const navigate = useNavigate();
  const { signup, error, setError } = useAuth();

  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [role, setRole]         = useState("user");
  const [loading, setLoading]   = useState(false);

  const handleSignup = async () => {
    setError("");
    if (!name || !email || !password || !confirm) { setError("Please fill in all fields."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    const ok = await signup(name, email, password, role); // ✅ no fake delay
    setLoading(false);
    if (ok) navigate("/dashboard");
  };

  return (
    <Box sx={{
      minHeight: "100vh", background: "#040d08",
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden", py: 6, px: 2,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Cormorant+Garamond:ital,wght@0,300;0,600;1,300&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; font-family: 'DM Sans', sans-serif; }
      `}</style>

      <Box sx={{ position:"absolute",top:"5%",right:"8%",width:{xs:180,md:350},height:{xs:180,md:350},borderRadius:"50%",background:"radial-gradient(circle,rgba(45,106,79,0.16) 0%,transparent 70%)",pointerEvents:"none" }} />
      <Box sx={{ position:"absolute",bottom:"5%",left:"5%",width:{xs:140,md:280},height:{xs:140,md:280},borderRadius:"50%",background:"radial-gradient(circle,rgba(52,211,153,0.09) 0%,transparent 70%)",pointerEvents:"none" }} />
      <Box sx={{ position:"absolute",inset:0,opacity:0.025,backgroundImage:"linear-gradient(rgba(74,222,128,1) 1px,transparent 1px),linear-gradient(90deg,rgba(74,222,128,1) 1px,transparent 1px)",backgroundSize:"50px 50px" }} />

      <Box component={motion.div} initial={{ opacity:0,scale:0.95 }} animate={{ opacity:1,scale:1 }} transition={{ duration:0.6,ease:[0.22,1,0.36,1] }}
        sx={{ width:"100%",maxWidth:480,borderRadius:"18px",border:"1px solid rgba(74,222,128,0.14)",background:"rgba(8,15,10,0.85)",backdropFilter:"blur(24px)",boxShadow:"0 32px 80px rgba(0,0,0,0.6),inset 0 1px 0 rgba(74,222,128,0.08)",overflow:"hidden" }}>

        <Box sx={{ height:2,background:"linear-gradient(90deg,transparent,#4ade80,transparent)" }} />

        <Box sx={{ p:{xs:3,md:5} }}>
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
            <Box sx={{ display:"flex",alignItems:"center",gap:1,mb:{xs:4,md:5} }}>
              <Box sx={{ width:32,height:32,borderRadius:"8px",background:"linear-gradient(135deg,#2d6a4f,#4ade80)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16 }}>🌿</Box>
              <Typography sx={{ fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:600,color:"#e8f5e9" }}>SmartCultivation</Typography>
            </Box>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
            <Typography sx={{ fontFamily:"'Cormorant Garamond',serif",fontSize:{xs:"1.7rem",md:"2rem"},fontWeight:300,color:"#e8f5e9",lineHeight:1.1,mb:0.8 }}>Create Account</Typography>
            <Typography sx={{ fontSize:13.5,color:"rgba(232,245,233,0.4)",mb:3 }}>Join to monitor your cultivation chamber</Typography>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
            <Typography sx={{ fontSize:11,letterSpacing:2,color:"rgba(232,245,233,0.4)",textTransform:"uppercase",fontFamily:"'JetBrains Mono',monospace",mb:1.5 }}>Account Type</Typography>
            <ToggleButtonGroup value={role} exclusive onChange={(_, v) => { if (v) setRole(v); }} fullWidth sx={{ mb:3,gap:1 }}>
              {[
                { val:"user",  label:"👤 User",  desc:"View your chamber" },
                { val:"admin", label:"🛡 Admin", desc:"View all chambers" },
              ].map((r) => (
                <ToggleButton key={r.val} value={r.val} sx={{
                  flex:1, py:1.5, px:1.5, borderRadius:"8px !important",
                  border:"1px solid rgba(74,222,128,0.15) !important",
                  background:role===r.val?"rgba(74,222,128,0.1)":"rgba(74,222,128,0.02)",
                  color:role===r.val?"#4ade80":"rgba(232,245,233,0.4)",
                  borderColor:role===r.val?"rgba(74,222,128,0.5) !important":undefined,
                  flexDirection:"column",gap:0.3,transition:"all 0.25s",
                  "&:hover":{ background:"rgba(74,222,128,0.07)" },
                }}>
                  <Typography sx={{ fontSize:{xs:12,md:14},fontWeight:500,color:"inherit",textTransform:"none" }}>{r.label}</Typography>
                  <Typography sx={{ fontSize:{xs:10,md:11},opacity:0.65,textTransform:"none",color:"inherit" }}>{r.desc}</Typography>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </motion.div>

          {error && (
            <motion.div initial={{ opacity:0,y:-8 }} animate={{ opacity:1,y:0 }}>
              <Alert severity="error" sx={{ mb:2.5,borderRadius:"8px",background:"rgba(248,113,113,0.08)",color:"#fca5a5",border:"1px solid rgba(248,113,113,0.2)","& .MuiAlert-icon":{ color:"#f87171" } }}>{error}</Alert>
            </motion.div>
          )}

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}>
            <TextField fullWidth label="Full Name" value={name} onChange={(e) => setName(e.target.value)} sx={{ ...inputSx, mb:2 }} />
          </motion.div>
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4}>
            <TextField fullWidth label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} sx={{ ...inputSx, mb:2 }} />
          </motion.div>
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={5}>
            <TextField fullWidth label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} sx={{ ...inputSx, mb:2 }} />
          </motion.div>
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={6}>
            <TextField fullWidth label="Confirm Password" type="password" value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSignup(); }}
              sx={{ ...inputSx, mb:2 }} />
          </motion.div>

          {password.length > 0 && (
            <Box sx={{ mb:2.5,display:"flex",gap:0.7 }}>
              {[1,2,3,4].map((level) => (
                <Box key={level} sx={{
                  flex:1,height:3,borderRadius:2,
                  background:password.length >= level*2
                    ? level<=1?"#f87171":level<=2?"#fbbf24":level<=3?"#34d399":"#4ade80"
                    : "rgba(74,222,128,0.1)",
                  transition:"background 0.3s",
                }} />
              ))}
            </Box>
          )}

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={7}>
            <motion.div whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}>
              <Button fullWidth onClick={handleSignup} disabled={loading}
                sx={{ py:1.6,fontSize:14,borderRadius:"8px",fontWeight:500,background:"linear-gradient(135deg,#2d6a4f,#4ade80)",color:"#040d08",boxShadow:"0 8px 24px rgba(74,222,128,0.25)",mb:3,transition:"all 0.3s","&:hover":{boxShadow:"0 12px 32px rgba(74,222,128,0.45)"},"&:disabled":{opacity:0.5} }}>
                {loading ? <CircularProgress size={18} sx={{ color:"#040d08" }} /> : "Create Account"}
              </Button>
            </motion.div>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={8}>
            <Box sx={{ pt:3,borderTop:"1px solid rgba(74,222,128,0.08)",textAlign:"center" }}>
              <Typography sx={{ fontSize:13.5,color:"rgba(232,245,233,0.35)" }}>
                Already have an account?{" "}
                <Box component="span" onClick={() => navigate("/login")} sx={{ color:"#4ade80",cursor:"pointer",fontWeight:500,"&:hover":{textDecoration:"underline"} }}>Sign In</Box>
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