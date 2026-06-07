import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import axiosInstance from "../utils/axiosInstance";
import { useAuth } from "../context/AuthContext";

/* ---- Icons ---- */
const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const CameraIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

/* ---- Animations ---- */
const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, staggerChildren: 0.08 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};
const cardVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

/* ---- Stat Card ---- */
const StatCard = ({ icon, value, label, color, delay }) => (
  <motion.div
    variants={cardVariants}
    initial="initial"
    animate="animate"
    transition={{ delay }}
    style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)", padding: "20px 14px",
      textAlign: "center", position: "relative", overflow: "hidden",
    }}
  >
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, height: 3,
      background: `linear-gradient(90deg, ${color}, transparent)`,
    }} />
    <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 200, delay: delay + 0.2 }}
      style={{
        fontSize: 28, fontWeight: 800,
        background: `linear-gradient(135deg, ${color}, var(--accent))`,
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        lineHeight: 1, marginBottom: 4,
      }}
    >{value}</motion.div>
    <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>{label}</div>
  </motion.div>
);

/* ---- History Score Badge ---- */
const ScoreBadge = ({ percentage }) => {
  const color = percentage >= 80 ? "#22c55e" : percentage >= 60 ? "#f0a500" : percentage >= 40 ? "#f97316" : "#ef4444";
  return (
    <div style={{
      width: 48, height: 48, borderRadius: "50%",
      background: `conic-gradient(${color} ${percentage * 3.6}deg, var(--border) 0deg)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: "50%", background: "var(--bg-card)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 800, color,
      }}>{percentage}%</div>
    </div>
  );
};

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const fileInputRef = useRef(null);
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");

  // Profile edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");
  const [editEmail, setEditEmail] = useState(user?.email || "");
  const [saving, setSaving] = useState(false);

  // Profile photo
  const [profilePhoto, setProfilePhoto] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Stats state
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Test history state
  const [testHistory, setTestHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeTab, setActiveTab] = useState("overview"); // overview | history | settings

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  const toggleTheme = () => {
    const n = !dark;
    setDark(n);
    localStorage.setItem("theme", n ? "dark" : "light");
  };

  // Fetch stats & profile
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, historyRes, profileRes] = await Promise.all([
          axiosInstance.get("/auth/stats"),
          axiosInstance.get("/auth/test-history"),
          axiosInstance.get("/auth/profile"),
        ]);
        setStats(statsRes.data);
        setTestHistory(historyRes.data);
        setProfilePhoto(profileRes.data.profilePhoto || "");
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingStats(false);
        setLoadingHistory(false);
      }
    };
    fetchData();
  }, []);

  const handleSaveProfile = async () => {
    if (!editName.trim()) return toast.error("Name cannot be empty");
    if (!editEmail.trim()) return toast.error("Email cannot be empty");
    setSaving(true);
    try {
      const res = await axiosInstance.put("/auth/profile", { name: editName.trim(), email: editEmail.trim() });
      updateUser(res.data.user);
      setEditing(false);
      toast.success("Profile updated!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500000) return toast.error("Image too large. Max 500KB.");
    if (!file.type.startsWith("image/")) return toast.error("Please select an image file");

    setUploadingPhoto(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const res = await axiosInstance.put("/auth/profile-photo", { photo: reader.result });
        setProfilePhoto(res.data.profilePhoto);
        toast.success("Photo uploaded!");
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to upload photo");
      } finally {
        setUploadingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async () => {
    try {
      await axiosInstance.delete("/auth/profile-photo");
      setProfilePhoto("");
      toast.success("Photo removed");
    } catch {
      toast.error("Failed to remove photo");
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) return toast.error("Enter current password");
    if (newPassword.length < 6) return toast.error("New password must be at least 6 characters");
    if (newPassword !== confirmPassword) return toast.error("Passwords don't match");
    setChangingPassword(true);
    try {
      await axiosInstance.put("/auth/change-password", { currentPassword, newPassword });
      toast.success("Password changed successfully!");
      setShowPasswordForm(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteText !== "DELETE") return toast.error("Type DELETE to confirm");
    setDeleting(true);
    try {
      await axiosInstance.delete("/auth/delete-account");
      toast.success("Account deleted");
      logout();
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  const inputStyle = {
    width: "100%",
    background: "var(--bg-input)",
    border: "1px solid var(--border-input)",
    borderRadius: "var(--radius-md)",
    padding: "12px 16px",
    fontSize: 14,
    color: "var(--text)",
    fontFamily: "inherit",
    outline: "none",
    transition: "all 0.2s",
  };

  const memberSince = stats?.memberSince
    ? new Date(stats.memberSince).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })
    : "Recently joined";

  const formatTime = (s) => {
    if (!s) return "—";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  // Improvement tracker
  const getImprovementData = () => {
    if (testHistory.length < 2) return null;
    const recent5 = testHistory.slice(0, 5);
    const older5 = testHistory.slice(5, 10);
    if (older5.length === 0) return null;
    const recentAvg = Math.round(recent5.reduce((s, t) => s + t.percentage, 0) / recent5.length);
    const olderAvg = Math.round(older5.reduce((s, t) => s + t.percentage, 0) / older5.length);
    const diff = recentAvg - olderAvg;
    return { recentAvg, olderAvg, diff };
  };
  const improvement = getImprovementData();

  const tabs = [
    { id: "overview", label: "📊 Overview" },
    { id: "history", label: "📜 History" },
    { id: "settings", label: "⚙️ Settings" },
  ];

  return (
    <motion.div
      variants={pageVariants}
      initial="initial" animate="animate" exit="exit"
      style={{
        fontFamily: "var(--font-sans)", background: "var(--bg)",
        minHeight: "100vh", color: "var(--text)",
      }}
    >
      {/* ===== Navbar ===== */}
      <nav className="glass" style={{
        padding: "0 32px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid var(--border)",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
          onClick={() => navigate("/dashboard")}
        >
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: "linear-gradient(135deg, #f0a500, #ff6b35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, color: "#fff", fontWeight: 700,
          }}>✦</div>
          <span style={{ fontSize: 16, fontWeight: 700 }}>Interview Prep AI</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            style={{
              background: "var(--hover-bg)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-full)", padding: "6px 14px",
              cursor: "pointer", fontSize: 13, color: "var(--text)", fontFamily: "inherit",
            }}
          >{dark ? "☀️ Light" : "🌙 Dark"}</motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/dashboard")}
            style={{
              background: "var(--hover-bg)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-full)", padding: "6px 14px",
              cursor: "pointer", fontSize: 13, color: "var(--text)", fontFamily: "inherit",
            }}
          >← Dashboard</motion.button>
        </div>
      </nav>

      {/* ===== Content ===== */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>

        {/* ===== Profile Header Card ===== */}
        <motion.div
          variants={cardVariants}
          style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-xl, 20px)", padding: 0, marginBottom: 24,
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {/* Banner */}
          <div style={{
            height: 140,
            background: "linear-gradient(135deg, #f0a500 0%, #ff6b35 40%, #1a1a1a 100%)",
            position: "relative",
            borderRadius: "var(--radius-xl, 20px) var(--radius-xl, 20px) 0 0",
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", inset: 0, opacity: 0.15,
              backgroundImage: "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 1px, transparent 1px), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.2) 2px, transparent 2px)",
              backgroundSize: "60px 60px, 80px 80px",
            }} />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { logout(); navigate("/"); }}
              style={{
                position: "absolute", top: 14, right: 14,
                background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "var(--radius-full)", padding: "6px 16px",
                cursor: "pointer", fontSize: 12, color: "#fff", fontWeight: 600,
                fontFamily: "inherit",
              }}
            >Logout</motion.button>
          </div>

          {/* Profile info */}
          <div style={{ textAlign: "center", padding: "0 32px 28px", marginTop: -50 }}>
            {/* Avatar with photo upload */}
            <div style={{ position: "relative", display: "inline-block", marginBottom: 16 }}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                style={{
                  width: 100, height: 100, borderRadius: "50%",
                  background: profilePhoto ? "none" : "linear-gradient(135deg, #f0a500, #ff6b35)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 40, fontWeight: 800, color: "#fff",
                  border: "5px solid var(--bg-card)",
                  boxShadow: "0 4px 24px rgba(240,165,0,0.3)",
                  overflow: "hidden",
                }}
              >
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  user?.name?.charAt(0)?.toUpperCase() || "?"
                )}
              </motion.div>
              {/* Camera button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                style={{
                  position: "absolute", bottom: 2, right: 2,
                  width: 30, height: 30, borderRadius: "50%",
                  background: "#1a1a1a", border: "2px solid var(--bg-card)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "#fff",
                }}
              ><CameraIcon /></motion.button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                style={{ display: "none" }}
              />
            </div>

            {/* Name & Email */}
            {editing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 360, margin: "0 auto" }}>
                <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Your name"
                  style={{ ...inputStyle, fontSize: 18, fontWeight: 700, padding: "10px 16px", textAlign: "center" }} />
                <input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="your@email.com" type="email"
                  style={{ ...inputStyle, fontSize: 13, padding: "10px 16px", textAlign: "center" }} />
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={handleSaveProfile} disabled={saving}
                    style={{ background: "#1a1a1a", color: "#fff", border: "none", borderRadius: "var(--radius-md)", padding: "9px 24px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                  >{saving ? "Saving..." : "Save Changes"}</motion.button>
                  <button onClick={() => { setEditing(false); setEditName(user?.name); setEditEmail(user?.email); }}
                    style={{ background: "var(--hover-bg)", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                  >Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 4 }}>
                  <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: "var(--font-serif)", margin: 0 }}>{user?.name}</h1>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setEditing(true)}
                    style={{ background: "var(--hover-bg)", border: "1px solid var(--border)", borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-muted)" }}
                  ><EditIcon /></motion.button>
                </div>
                <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 4px" }}>{user?.email}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 16px", opacity: 0.7 }}>📅 Member since {memberSince}</p>
              </>
            )}

            {/* Tags */}
            {!editing && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                {profilePhoto && (
                  <span onClick={handleRemovePhoto} style={{
                    background: "rgba(239,68,68,0.08)", color: "#ef4444",
                    padding: "5px 14px", borderRadius: "var(--radius-full)",
                    fontSize: 11, fontWeight: 500, cursor: "pointer",
                  }}>✕ Remove Photo</span>
                )}
                {stats?.topRoles?.map(role => (
                  <span key={role} style={{
                    background: "var(--hover-bg)", color: "var(--text-muted)",
                    padding: "5px 14px", borderRadius: "var(--radius-full)",
                    fontSize: 11, fontWeight: 500, border: "1px solid var(--border)",
                  }}>{role}</span>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* ===== Tabs ===== */}
        <div style={{
          display: "flex", gap: 4, marginBottom: 24,
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)", padding: 4,
        }}>
          {tabs.map(tab => (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, padding: "10px 16px", borderRadius: "var(--radius-md)",
                background: activeTab === tab.id ? "var(--hover-bg)" : "transparent",
                border: activeTab === tab.id ? "1px solid var(--border)" : "1px solid transparent",
                color: activeTab === tab.id ? "var(--text)" : "var(--text-muted)",
                fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.2s",
              }}
            >{tab.label}</motion.button>
          ))}
        </div>

        {/* ===== OVERVIEW TAB ===== */}
        <div style={{ display: activeTab === "overview" ? "block" : "none" }}>
          {/* Stats Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 16 }}>
            <StatCard icon="📋" value={loadingStats ? "—" : stats?.totalSessions || 0} label="Sessions" color="#f0a500" delay={0.1} />
            <StatCard icon="❓" value={loadingStats ? "—" : stats?.totalQuestions || 0} label="Questions" color="#ff6b35" delay={0.15} />
            <StatCard icon="📌" value={loadingStats ? "—" : stats?.pinnedQuestions || 0} label="Pinned" color="#22c55e" delay={0.2} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
            <StatCard icon="💡" value={loadingStats ? "—" : stats?.explainedQuestions || 0} label="Explained" color="#8b5cf6" delay={0.25} />
            <StatCard icon="🎭" value={loadingStats ? "—" : stats?.rolesExplored || 0} label="Roles" color="#3b82f6" delay={0.3} />
            <StatCard icon="🏆" value={loadingStats ? "—" : stats?.totalTests || 0} label="Tests Taken" color="#f43f5e" delay={0.35} />
          </div>

          {/* Improvement Tracker */}
          {improvement && (
            <motion.div
              variants={cardVariants}
              initial="initial" animate="animate"
              style={{
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)", padding: "20px 24px", marginBottom: 24,
              }}
            >
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                📈 Improvement Tracker
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Previous avg</span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{improvement.olderAvg}%</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Recent avg</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>{improvement.recentAvg}%</span>
                  </div>
                  <div style={{
                    height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden",
                  }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${improvement.recentAvg}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      style={{
                        height: "100%", borderRadius: 3,
                        background: improvement.diff >= 0
                          ? "linear-gradient(90deg, #22c55e, #16a34a)"
                          : "linear-gradient(90deg, #ef4444, #dc2626)",
                      }}
                    />
                  </div>
                </div>
                <div style={{
                  textAlign: "center", padding: "12px 20px",
                  background: improvement.diff >= 0 ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                  borderRadius: "var(--radius-md)",
                  border: `1px solid ${improvement.diff >= 0 ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                }}>
                  <div style={{
                    fontSize: 24, fontWeight: 800,
                    color: improvement.diff >= 0 ? "#22c55e" : "#ef4444",
                  }}>
                    {improvement.diff >= 0 ? "+" : ""}{improvement.diff}%
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {improvement.diff >= 0 ? "Improving! 🚀" : "Keep going! 💪"}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Average Score Card */}
          {stats?.totalTests > 0 && (
            <motion.div
              variants={cardVariants}
              initial="initial" animate="animate"
              style={{
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)", padding: "24px",
                textAlign: "center", marginBottom: 24,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "var(--text-muted)" }}>
                Average Quiz Score
              </div>
              <div style={{
                fontSize: 48, fontWeight: 800,
                background: `linear-gradient(135deg, ${stats.avgScore >= 70 ? "#22c55e" : stats.avgScore >= 50 ? "#f0a500" : "#ef4444"}, var(--accent))`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>{stats.avgScore}%</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                across {stats.totalTests} test{stats.totalTests !== 1 ? "s" : ""}
              </div>
            </motion.div>
          )}
        </div>

        {/* ===== HISTORY TAB ===== */}
        <div style={{ display: activeTab === "history" ? "block" : "none" }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, fontFamily: "var(--font-serif)" }}>
            Mock Test History
          </h3>

          {loadingHistory ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Loading...</div>
          ) : testHistory.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "60px 40px",
              background: "var(--bg-card)", border: "1px dashed var(--border-strong)",
              borderRadius: "var(--radius-lg)",
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No tests taken yet</h3>
              <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
                Take a quiz from any session to see your history here!
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {testHistory.map((test, i) => (
                <motion.div
                  key={test._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{
                    background: "var(--bg-card)", border: "1px solid var(--border)",
                    borderRadius: "var(--radius-lg)", padding: "16px 20px",
                    display: "flex", alignItems: "center", gap: 16,
                  }}
                >
                  <ScoreBadge percentage={test.percentage} />

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{test.role}</span>
                      <span style={{
                        padding: "2px 8px", borderRadius: "var(--radius-full)",
                        fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                        background: test.difficulty === "easy" ? "rgba(34,197,94,0.1)" : test.difficulty === "hard" ? "rgba(239,68,68,0.1)" : "rgba(240,165,0,0.1)",
                        color: test.difficulty === "easy" ? "#22c55e" : test.difficulty === "hard" ? "#ef4444" : "#f0a500",
                      }}>{test.difficulty}</span>
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--text-muted)" }}>
                      <span>✅ {test.correctCount}/{test.totalQuestions}</span>
                      {test.timeTaken > 0 && <span>⏱ {formatTime(test.timeTaken)}</span>}
                      <span>📅 {new Date(test.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                    </div>
                  </div>

                  <div style={{
                    fontSize: 20, fontWeight: 800,
                    color: test.percentage >= 80 ? "#22c55e" : test.percentage >= 60 ? "#f0a500" : test.percentage >= 40 ? "#f97316" : "#ef4444",
                  }}>{test.percentage}%</div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* ===== SETTINGS TAB ===== */}
        <div style={{ display: activeTab === "settings" ? "block" : "none" }}>
          {/* Security Section */}
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)", padding: "24px 28px", marginBottom: 24,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "var(--radius-md)",
                background: "linear-gradient(135deg, rgba(139,92,246,0.1), rgba(139,92,246,0.05))",
                border: "1px solid rgba(139,92,246,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#8b5cf6",
              }}><ShieldIcon /></div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Security</h3>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Manage your password and account security</p>
              </div>
            </div>

            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              style={{
                width: "100%", background: "var(--hover-bg)",
                border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
                padding: "14px 18px", fontSize: 13, fontWeight: 600,
                color: "var(--text)", cursor: "pointer", fontFamily: "inherit",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                transition: "all 0.2s",
              }}
            >
              <span>🔑 Change Password</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)", transform: showPasswordForm ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>▾</span>
            </button>

            {showPasswordForm && (
              <div style={{ padding: "20px 0 0" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-muted)" }}>Current Password</label>
                    <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Enter current password" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-muted)" }}>New Password</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-muted)" }}>Confirm New Password</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" style={inputStyle} />
                  </div>
                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleChangePassword}
                    disabled={changingPassword}
                    style={{
                      background: "#1a1a1a", color: "#fff", border: "none",
                      borderRadius: "var(--radius-md)", padding: "12px 24px",
                      fontSize: 13, fontWeight: 600, cursor: changingPassword ? "not-allowed" : "pointer",
                      fontFamily: "inherit", alignSelf: "flex-start",
                      opacity: changingPassword ? 0.7 : 1,
                    }}
                  >{changingPassword ? "Updating..." : "Update Password"}</motion.button>
                </div>
              </div>
            )}
          </div>

          {/* Danger Zone */}
          <div style={{
            background: "var(--bg-card)", border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: "var(--radius-lg)", padding: "24px 28px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "var(--radius-md)",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#ef4444",
              }}><TrashIcon /></div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#ef4444" }}>Danger Zone</h3>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Irreversible actions</p>
              </div>
            </div>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: "var(--radius-md)", padding: "12px 20px",
                  color: "#ef4444", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  fontFamily: "inherit", transition: "all 0.2s",
                }}
                onMouseEnter={e => e.target.style.background = "rgba(239,68,68,0.12)"}
                onMouseLeave={e => e.target.style.background = "rgba(239,68,68,0.06)"}
              >Delete My Account</button>
            ) : (
              <div style={{
                background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.15)",
                borderRadius: "var(--radius-md)", padding: 20,
              }}>
                <p style={{ fontSize: 13, color: "#ef4444", fontWeight: 600, marginBottom: 8 }}>
                  ⚠️ This will permanently delete your account, all sessions, questions, and test history.
                </p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
                  Type <b style={{ color: "#ef4444" }}>DELETE</b> to confirm:
                </p>
                <input
                  value={deleteText}
                  onChange={e => setDeleteText(e.target.value)}
                  placeholder="Type DELETE"
                  style={{ ...inputStyle, borderColor: "rgba(239,68,68,0.3)", marginBottom: 12 }}
                />
                <div style={{ display: "flex", gap: 10 }}>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleDeleteAccount}
                    disabled={deleting || deleteText !== "DELETE"}
                    style={{
                      background: deleteText === "DELETE" ? "#ef4444" : "var(--text-muted)",
                      color: "#fff", border: "none", borderRadius: "var(--radius-md)",
                      padding: "10px 20px", fontSize: 12, fontWeight: 700,
                      cursor: deleting || deleteText !== "DELETE" ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                    }}
                  >{deleting ? "Deleting..." : "Permanently Delete"}</motion.button>
                  <button
                    onClick={() => { setShowDeleteConfirm(false); setDeleteText(""); }}
                    style={{
                      background: "var(--hover-bg)", border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)", padding: "10px 16px",
                      fontSize: 12, fontWeight: 600, cursor: "pointer",
                      color: "var(--text-muted)", fontFamily: "inherit",
                    }}
                  >Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          textAlign: "center", padding: "32px 0 16px",
          fontSize: 12, color: "var(--text-muted)",
        }}>
          <span style={{ opacity: 0.5 }}>Interview Prep AI • Made with ✦</span>
        </div>
      </div>
    </motion.div>
  );
};

export default Profile;
