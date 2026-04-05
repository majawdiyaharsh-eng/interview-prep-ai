import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "../utils/axiosInstance";
import { useAuth } from "../context/AuthContext";

/* ---- SVG Icons ---- */
const EyeIcon = ({ open }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);

const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M22 7l-10 7L2 7" />
  </svg>
);

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

/* ---- Password Strength Meter ---- */
const PasswordStrength = ({ password }) => {
  if (!password) return null;
  let strength = 0;
  if (password.length >= 6) strength++;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  const level = strength <= 1 ? "Weak" : strength <= 3 ? "Fair" : "Strong";
  const color = strength <= 1 ? "#ef4444" : strength <= 3 ? "#f0a500" : "#22c55e";
  const width = `${Math.min(100, (strength / 5) * 100)}%`;

  return (
    <div style={{ marginBottom: 16, marginTop: -8 }}>
      <div style={{ height: 3, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width }}
          style={{ height: "100%", background: color, borderRadius: 3 }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 600, marginTop: 4, display: "inline-block" }}>{level}</span>
    </div>
  );
};

/* ---- Shared Styles ---- */
const inputWrap = {
  position: "relative",
  marginBottom: 16,
};

const inputStyle = {
  width: "100%",
  background: "var(--bg-input)",
  border: "1px solid var(--border-input)",
  borderRadius: "var(--radius-md)",
  padding: "13px 14px 13px 40px",
  fontSize: 14,
  color: "var(--text)",
  fontFamily: "inherit",
  transition: "all var(--transition-fast)",
  outline: "none",
};

const iconWrap = {
  position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
  color: "var(--text-muted)", display: "flex", pointerEvents: "none",
};

const overlayVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.2 } },
};

/* ============================================================
   LOGIN MODAL
   ============================================================ */
export const LoginModal = ({ onClose, onSwitchToSignup }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axiosInstance.post("/auth/login", { email, password });
      login(res.data.user, res.data.token);
      setSuccess(true);
      setTimeout(() => {
        onClose();
        window.location.href = "/dashboard";
      }, 800);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        variants={overlayVariants}
        initial="initial" animate="animate" exit="exit"
        style={{
          position: "fixed", inset: 0, background: "var(--overlay)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, backdropFilter: "blur(8px)",
        }}
        onClick={onClose}
      >
        <motion.div
          variants={modalVariants}
          initial="initial" animate="animate" exit="exit"
          style={{
            background: "var(--bg-card)", borderRadius: "var(--radius-xl)",
            width: "100%", maxWidth: 480, position: "relative",
            boxShadow: "var(--shadow-xl)", margin: 20,
            border: "1px solid var(--border)", overflow: "hidden",
            display: "flex",
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Left branding panel */}
          <div style={{
            width: 180, minHeight: "100%", flexShrink: 0,
            background: "linear-gradient(180deg, #f0a500 0%, #e08800 50%, #1a1a1a 100%)",
            padding: "36px 20px", display: "flex", flexDirection: "column",
            justifyContent: "space-between", color: "#fff",
          }}>
            <div>
              <div style={{
                width: 36, height: 36, borderRadius: "var(--radius-sm)",
                background: "rgba(255,255,255,0.2)", display: "flex",
                alignItems: "center", justifyContent: "center",
                fontSize: 18, fontWeight: 700, marginBottom: 24,
              }}>✦</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3, fontFamily: "var(--font-serif)" }}>
                Welcome Back
              </h3>
              <p style={{ fontSize: 12, opacity: 0.8, marginTop: 8, lineHeight: 1.6 }}>
                Continue your interview preparation journey.
              </p>
            </div>
            <p style={{ fontSize: 10, opacity: 0.5 }}>Interview Prep AI</p>
          </div>

          {/* Form panel */}
          <div style={{ flex: 1, padding: "36px 32px" }}>
            <button
              onClick={onClose}
              style={{
                position: "absolute", top: 16, right: 16, background: "none",
                border: "none", fontSize: 18, cursor: "pointer", color: "var(--text-muted)",
                width: 28, height: 28, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background var(--transition-fast)",
              }}
              onMouseEnter={e => e.target.style.background = "var(--hover-bg)"}
              onMouseLeave={e => e.target.style.background = "none"}
            >✕</button>

            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: "var(--text)" }}>Sign In</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 24 }}>Enter your details to continue</p>

            {/* Success check */}
            {success && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                style={{
                  width: 60, height: 60, borderRadius: "50%",
                  background: "#22c55e", margin: "20px auto",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 28, color: "#fff",
                }}>✓</motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: "var(--radius-sm)", padding: "10px 14px",
                  color: "#ef4444", fontSize: 13, marginBottom: 16,
                }}
              >{error}</motion.div>
            )}

            {!success && (
              <form onSubmit={handleSubmit}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>Email</label>
                <div style={inputWrap}>
                  <span style={iconWrap}><MailIcon /></span>
                  <input
                    id="login-email"
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="john@example.com" required style={inputStyle}
                  />
                </div>

                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>Password</label>
                <div style={{ ...inputWrap, marginBottom: 24 }}>
                  <span style={iconWrap}><LockIcon /></span>
                  <input
                    id="login-password"
                    type={showPass ? "text" : "password"} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min 8 characters" required maxLength={50}
                    style={{ ...inputStyle, paddingRight: 44 }}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)",
                    display: "flex", padding: 2,
                  }}>
                    <EyeIcon open={showPass} />
                  </button>
                </div>

                <motion.button
                  id="login-submit"
                  type="submit" disabled={loading}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    width: "100%", background: "var(--text)", color: "var(--bg)",
                    border: "none", borderRadius: "var(--radius-md)", padding: 14,
                    fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                    fontFamily: "inherit", opacity: loading ? 0.7 : 1,
                    letterSpacing: 0.5, transition: "all var(--transition-fast)",
                  }}
                >
                  {loading ? (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <span style={{ display: "inline-block", animation: "spin 1s linear infinite", fontSize: 14 }}>⚡</span>
                      Signing in...
                    </span>
                  ) : "LOGIN"}
                </motion.button>
              </form>
            )}

            <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-muted)", marginTop: 20 }}>
              Don&apos;t have an account?{" "}
              <span onClick={onSwitchToSignup} style={{ color: "var(--accent)", fontWeight: 600, cursor: "pointer" }}>Sign Up</span>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/* ============================================================
   SIGNUP MODAL
   ============================================================ */
export const SignupModal = ({ onClose, onSwitchToLogin }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axiosInstance.post("/auth/signup", { name, email, password });
      login(res.data.user, res.data.token);
      setSuccess(true);
      setTimeout(() => {
        onClose();
        window.location.href = "/dashboard";
      }, 800);
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        variants={overlayVariants}
        initial="initial" animate="animate" exit="exit"
        style={{
          position: "fixed", inset: 0, background: "var(--overlay)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, backdropFilter: "blur(8px)",
        }}
        onClick={onClose}
      >
        <motion.div
          variants={modalVariants}
          initial="initial" animate="animate" exit="exit"
          style={{
            background: "var(--bg-card)", borderRadius: "var(--radius-xl)",
            width: "100%", maxWidth: 520, position: "relative",
            boxShadow: "var(--shadow-xl)", margin: 20,
            border: "1px solid var(--border)", overflow: "hidden",
            display: "flex",
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Left branding panel */}
          <div style={{
            width: 180, minHeight: "100%", flexShrink: 0,
            background: "linear-gradient(180deg, #1a1a1a 0%, #2a2a2a 50%, #f0a500 100%)",
            padding: "36px 20px", display: "flex", flexDirection: "column",
            justifyContent: "space-between", color: "#fff",
          }}>
            <div>
              <div style={{
                width: 36, height: 36, borderRadius: "var(--radius-sm)",
                background: "rgba(255,255,255,0.1)", display: "flex",
                alignItems: "center", justifyContent: "center",
                fontSize: 18, fontWeight: 700, marginBottom: 24,
              }}>✦</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3, fontFamily: "var(--font-serif)" }}>
                Join the Community
              </h3>
              <p style={{ fontSize: 12, opacity: 0.7, marginTop: 8, lineHeight: 1.6 }}>
                Start your journey to interview mastery today.
              </p>
            </div>
            <p style={{ fontSize: 10, opacity: 0.4 }}>Interview Prep AI</p>
          </div>

          {/* Form panel */}
          <div style={{ flex: 1, padding: "32px 32px" }}>
            <button
              onClick={onClose}
              style={{
                position: "absolute", top: 16, right: 16, background: "none",
                border: "none", fontSize: 18, cursor: "pointer", color: "var(--text-muted)",
                width: 28, height: 28, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background var(--transition-fast)",
              }}
              onMouseEnter={e => e.target.style.background = "var(--hover-bg)"}
              onMouseLeave={e => e.target.style.background = "none"}
            >✕</button>

            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, color: "var(--text)" }}>Create Account</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 22 }}>Enter your details to get started</p>

            {success && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                style={{
                  width: 60, height: 60, borderRadius: "50%",
                  background: "#22c55e", margin: "20px auto",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 28, color: "#fff",
                }}>✓</motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: "var(--radius-sm)", padding: "10px 14px",
                  color: "#ef4444", fontSize: 13, marginBottom: 16,
                }}
              >{error}</motion.div>
            )}

            {!success && (
              <form onSubmit={handleSubmit}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>Full Name</label>
                <div style={inputWrap}>
                  <span style={iconWrap}><UserIcon /></span>
                  <input
                    id="signup-name"
                    type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="John Doe" required style={inputStyle}
                  />
                </div>

                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>Email</label>
                <div style={inputWrap}>
                  <span style={iconWrap}><MailIcon /></span>
                  <input
                    id="signup-email"
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="john@example.com" required style={inputStyle}
                  />
                </div>

                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>Password</label>
                <div style={{ ...inputWrap, marginBottom: 4 }}>
                  <span style={iconWrap}><LockIcon /></span>
                  <input
                    id="signup-password"
                    type={showPass ? "text" : "password"} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min 8 characters" required minLength={6} maxLength={50}
                    style={{ ...inputStyle, paddingRight: 44 }}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)",
                    display: "flex", padding: 2,
                  }}>
                    <EyeIcon open={showPass} />
                  </button>
                </div>

                <PasswordStrength password={password} />

                <motion.button
                  id="signup-submit"
                  type="submit" disabled={loading}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    width: "100%", background: "var(--text)", color: "var(--bg)",
                    border: "none", borderRadius: "var(--radius-md)", padding: 14,
                    fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                    fontFamily: "inherit", opacity: loading ? 0.7 : 1,
                    letterSpacing: 0.5, transition: "all var(--transition-fast)",
                  }}
                >
                  {loading ? (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <span style={{ display: "inline-block", animation: "spin 1s linear infinite", fontSize: 14 }}>⚡</span>
                      Creating...
                    </span>
                  ) : "CREATE ACCOUNT"}
                </motion.button>
              </form>
            )}

            <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-muted)", marginTop: 18 }}>
              Already have an account?{" "}
              <span onClick={onSwitchToLogin} style={{ color: "var(--accent)", fontWeight: 600, cursor: "pointer" }}>Login</span>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};