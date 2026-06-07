import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import axiosInstance from "../utils/axiosInstance";
import { useAuth } from "../context/AuthContext";

const getInitials = (role) => role?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "??";

const cardColors = [
  { bg: "rgba(240,165,0,0.06)", border: "rgba(240,165,0,0.18)", accent: "#f0a500", iconBg: "rgba(240,165,0,0.12)" },
  { bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.18)", accent: "#3b82f6", iconBg: "rgba(59,130,246,0.12)" },
  { bg: "rgba(34,197,94,0.06)", border: "rgba(34,197,94,0.18)", accent: "#22c55e", iconBg: "rgba(34,197,94,0.12)" },
  { bg: "rgba(168,85,247,0.06)", border: "rgba(168,85,247,0.18)", accent: "#a855f7", iconBg: "rgba(168,85,247,0.12)" },
  { bg: "rgba(244,63,94,0.06)", border: "rgba(244,63,94,0.18)", accent: "#f43f5e", iconBg: "rgba(244,63,94,0.12)" },
  { bg: "rgba(20,184,166,0.06)", border: "rgba(20,184,166,0.18)", accent: "#14b8a6", iconBg: "rgba(20,184,166,0.12)" },
];

/* ---- Skeleton Card Component ---- */
const SkeletonCard = ({ delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay }}
    style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)", padding: 24,
    }}
  >
    <div className="skeleton-box" style={{ width: 48, height: 48, marginBottom: 16, borderRadius: "var(--radius-md)" }} />
    <div className="skeleton-box" style={{ width: "60%", height: 18, marginBottom: 8 }} />
    <div className="skeleton-box" style={{ width: "90%", height: 14, marginBottom: 16 }} />
    <div style={{ display: "flex", gap: 6 }}>
      <div className="skeleton-box" style={{ width: 80, height: 22, borderRadius: "var(--radius-full)" }} />
      <div className="skeleton-box" style={{ width: 50, height: 22, borderRadius: "var(--radius-full)" }} />
      <div className="skeleton-box" style={{ width: 90, height: 22, borderRadius: "var(--radius-full)" }} />
    </div>
  </motion.div>
);

/* ---- Page Variants ---- */
const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

/* ---- Filter Chips ---- */
const filterOptions = [
  { label: "All", value: "all" },
  { label: "Recent", value: "recent" },
  { label: "Most Questions", value: "most" },
];

const Dashboard = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const { user, dark, toggleTheme } = useAuth();
  const navigate = useNavigate();

  const fetchSessions = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/session/all");
      setSessions(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load sessions");
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (Number(experience) > 50) {
      return toast.error("Years of experience cannot exceed 50.");
    }
    if (Number(experience) < 0) {
      return toast.error("Years of experience cannot be negative.");
    }
    setCreating(true);
    try {
      const res = await axiosInstance.post("/session/create", { role, experience, description, difficulty });
      setShowModal(false);
      setRole(""); setExperience(""); setDescription(""); setDifficulty("Medium");
      toast.success("Session created successfully!");
      navigate(`/session/${res.data.id}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create session");
    }
    finally { setCreating(false); }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    toast((t) => (
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 14 }}>Delete this session?</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                await axiosInstance.delete(`/session/${id}`);
                setSessions(prev => prev.filter(s => s.id !== id));
                toast.success("Session deleted");
              } catch { toast.error("Delete failed"); }
            }}
            style={{
              background: "#ef4444", color: "#fff", border: "none",
              padding: "4px 12px", borderRadius: 6, fontSize: 12,
              fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}
          >Delete</button>
          <button
            onClick={() => toast.dismiss(t.id)}
            style={{
              background: "var(--hover-bg)", color: "var(--text)", border: "1px solid var(--border)",
              padding: "4px 12px", borderRadius: 6, fontSize: 12,
              fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}
          >Cancel</button>
        </div>
      </div>
    ), { duration: 5000 });
  };

  let filtered = sessions.filter(s =>
    s.role.toLowerCase().includes(search.toLowerCase()) ||
    s.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (filter === "recent") {
    filtered = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (filter === "most") {
    filtered = [...filtered].sort((a, b) => b.questions.length - a.questions.length);
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial" animate="animate" exit="exit"
      style={{ fontFamily: "var(--font-sans)", background: "var(--bg)", minHeight: "100vh", color: "var(--text)" }}
    >
      {/* ===== Navbar ===== */}
      <nav className="glass" style={{
        padding: "0 40px", height: 60, display: "flex", alignItems: "center",
        justifyContent: "space-between", borderBottom: "1px solid var(--border)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
          >
            {dark ? "☀️ Light" : "🌙 Dark"}
          </motion.button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => navigate("/profile")}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "linear-gradient(135deg, #f0a500, #ff6b35)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, color: "#fff",
            }}>
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.name}</div>
              <div
                style={{ fontSize: 11, color: "var(--accent)", fontWeight: 500 }}
              >Profile</div>
            </div>
          </div>
        </div>
      </nav>

      <div style={{ padding: "32px 40px", maxWidth: 1300, margin: "0 auto" }}>
        {/* ===== Welcome Header ===== */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ marginBottom: 28 }}
        >
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4, fontFamily: "var(--font-serif)" }}>
            Welcome back, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            Continue preparing for your next interview
          </p>
        </motion.div>

        {/* ===== Search & Filters ===== */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{
            display: "flex", gap: 12, marginBottom: 24, alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ position: "relative", flex: 1, maxWidth: 380 }}>
            <svg
              style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              id="search-sessions"
              type="text"
              placeholder="Search sessions by role or topic..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%", background: "var(--bg-card)",
                border: "1px solid var(--border-input)", borderRadius: "var(--radius-md)",
                padding: "11px 36px 11px 40px", fontSize: 14, color: "var(--text)",
                fontFamily: "inherit", transition: "all var(--transition-fast)",
              }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text-muted)", fontSize: 14,
                }}
              >✕</button>
            )}
          </div>

          {/* Filter Chips */}
          <div style={{ display: "flex", gap: 6 }}>
            {filterOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                style={{
                  background: filter === opt.value ? "var(--accent-light)" : "var(--hover-bg)",
                  color: filter === opt.value ? "var(--accent)" : "var(--text-muted)",
                  border: `1px solid ${filter === opt.value ? "rgba(240,165,0,0.3)" : "var(--border)"}`,
                  padding: "6px 14px", borderRadius: "var(--radius-full)",
                  fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  transition: "all var(--transition-fast)",
                }}
              >{opt.label}</button>
            ))}
          </div>

          <span style={{ color: "var(--text-muted)", fontSize: 13, marginLeft: "auto" }}>
            {filtered.length} session{filtered.length !== 1 ? "s" : ""}
          </span>
        </motion.div>

        {/* ===== Sessions Grid ===== */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
            {[0, 1, 2, 3, 4, 5].map(i => <SkeletonCard key={i} delay={i * 0.05} />)}
          </div>
        ) : sessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              textAlign: "center", padding: "80px 40px",
              background: "var(--bg-card)", border: "1px dashed var(--border-strong)",
              borderRadius: "var(--radius-xl)",
            }}
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{ fontSize: 56, marginBottom: 16, display: "inline-block" }}
            >🚀</motion.div>
            <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, fontFamily: "var(--font-serif)" }}>
              No sessions yet
            </h3>
            <p style={{ color: "var(--text-muted)", marginBottom: 28, fontSize: 15 }}>
              Create your first interview session to get started
            </p>
            <motion.button
              whileHover={{ y: -2, boxShadow: "var(--shadow-accent)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowModal(true)}
              style={{
                background: "linear-gradient(135deg, #f0a500, #e09000)",
                color: "#fff", border: "none", padding: "14px 32px",
                borderRadius: "var(--radius-full)", fontSize: 15, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
                boxShadow: "var(--shadow-accent)",
              }}
            >+ Create First Session</motion.button>
          </motion.div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
            <p>No sessions found for &quot;{search}&quot;</p>
          </div>
        ) : (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20,
          }}>
            <AnimatePresence>
              {filtered.map((session, i) => {
                const color = cardColors[i % cardColors.length];
                return (
                  <motion.div
                    key={session.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.35, delay: i * 0.04 }}
                    whileHover={{ y: -4, boxShadow: "var(--shadow-md)" }}
                    onClick={() => navigate(`/session/${session.id}`)}
                    style={{
                      background: color.bg, border: `1px solid ${color.border}`,
                      borderRadius: "var(--radius-lg)", padding: 24, cursor: "pointer",
                      transition: "all var(--transition)", position: "relative",
                    }}
                  >
                    {/* Delete */}
                    <motion.button
                      initial={{ opacity: 0 }}
                      whileHover={{ scale: 1.1, background: "rgba(239,68,68,0.15)" }}
                      onClick={e => handleDelete(session.id, e)}
                      style={{
                        position: "absolute", top: 12, right: 12,
                        background: "rgba(239,68,68,0.08)", border: "none",
                        color: "#ef4444", width: 30, height: 30, borderRadius: "50%",
                        cursor: "pointer", fontSize: 14,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        opacity: 0, transition: "opacity var(--transition-fast)",
                      }}
                      className="delete-btn-hover"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </motion.button>

                    {/* Initials avatar */}
                    <div style={{
                      width: 48, height: 48, borderRadius: "var(--radius-md)",
                      background: color.iconBg, display: "flex",
                      alignItems: "center", justifyContent: "center",
                      fontSize: 16, fontWeight: 700, color: color.accent,
                      marginBottom: 16, letterSpacing: "-0.5px",
                    }}>
                      {getInitials(session.role)}
                    </div>

                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{session.role}</h3>
                    <p style={{
                      fontSize: 13, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.5,
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}>{session.description || "No description"}</p>

                    {/* Progress bar */}
                    <div style={{
                      height: 3, background: "var(--border)", borderRadius: 3,
                      marginBottom: 14, overflow: "hidden",
                    }}>
                      <div style={{
                        height: "100%", borderRadius: 3,
                        background: color.accent,
                        width: `${Math.min(100, (session.questions.length / 20) * 100)}%`,
                        transition: "width 0.5s ease",
                      }} />
                    </div>

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {[
                        `${session.experience} yrs exp`,
                        `${session.difficulty || "Medium"}`,
                        `${session.questions.length} Q&A`,
                        new Date(session.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
                      ].map(tag => (
                        <span key={tag} style={{
                          background: "var(--hover-bg)", color: "var(--text-muted)",
                          padding: "3px 10px", borderRadius: "var(--radius-full)",
                          fontSize: 11, fontWeight: 500, border: "1px solid var(--border)",
                        }}>{tag}</span>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ===== FAB ===== */}
      <motion.button
        id="add-session-fab"
        onClick={() => setShowModal(true)}
        whileHover={{ y: -3, boxShadow: "0 12px 35px rgba(240,165,0,0.5)" }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: "fixed", bottom: 32, right: 32,
          background: "linear-gradient(135deg, #f0a500, #e09000)",
          color: "#fff", border: "none", padding: "14px 24px",
          borderRadius: "var(--radius-full)", fontSize: 14, fontWeight: 700,
          cursor: "pointer", fontFamily: "inherit",
          boxShadow: "var(--shadow-accent)", zIndex: 100,
          display: "flex", alignItems: "center", gap: 8,
        }}
      >
        <motion.span
          animate={{ rotate: showModal ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ fontSize: 18, display: "inline-block" }}
        >+</motion.span>
        Add New
      </motion.button>

      {/* ===== New Session Modal ===== */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, background: "var(--overlay)",
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 1000, backdropFilter: "blur(8px)",
            }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{
                background: "var(--bg-card)", borderRadius: "var(--radius-xl)",
                padding: 36, width: "100%", maxWidth: 520, position: "relative",
                boxShadow: "var(--shadow-xl)", margin: 20,
                border: "1px solid var(--border)",
              }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setShowModal(false)}
                style={{
                  position: "absolute", top: 16, right: 16, background: "none",
                  border: "none", fontSize: 18, cursor: "pointer", color: "var(--text-muted)",
                  width: 28, height: 28, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >✕</button>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "var(--radius-md)",
                  background: "var(--accent-light)", display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: 20,
                }}>🎯</div>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>Start a New Interview Journey</h2>
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 24, marginLeft: 52 }}>
                Fill out details to unlock personalized questions!
              </p>

              <form onSubmit={handleCreate}>
                {[
                  { label: "Target Role", type: "text", value: role, set: setRole, placeholder: "e.g., Frontend Developer, UI/UX Designer", required: true, icon: "💼" },
                  { label: "Years of Experience", type: "number", min: "0", max: "50", value: experience, set: setExperience, placeholder: "e.g., 3", required: true, icon: "📊" },
                  { label: "Topics to Focus On", type: "text", value: description, set: setDescription, placeholder: "e.g., React, Node.js, MongoDB (optional)", required: false, icon: "🏷️" },
                ].map((field, i) => (
                  <div key={i} style={{ marginBottom: 16 }}>
                    <label style={{
                      display: "flex", alignItems: "center", gap: 6,
                      fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text)",
                    }}>
                      <span style={{ fontSize: 14 }}>{field.icon}</span> {field.label}
                    </label>
                    <input
                      type={field.type} min={field.min} value={field.value}
                      onChange={e => field.set(e.target.value)}
                      placeholder={field.placeholder} required={field.required}
                      style={{
                        width: "100%", background: "var(--bg-input)",
                        border: "1px solid var(--border-input)", borderRadius: "var(--radius-md)",
                        padding: "12px 14px", fontSize: 14, color: "var(--text)",
                        fontFamily: "inherit", transition: "all var(--transition-fast)",
                      }}
                    />
                  </div>
                ))}

                {/* Difficulty Level Dropdown */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{
                    display: "flex", alignItems: "center", gap: 6,
                    fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text)",
                  }}>
                    <span style={{ fontSize: 14 }}>🎯</span> Difficulty Level
                  </label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value)}
                    style={{
                      width: "100%", background: "var(--bg-input)",
                      border: "1px solid var(--border-input)", borderRadius: "var(--radius-md)",
                      padding: "12px 14px", fontSize: 14, color: "var(--text)",
                      fontFamily: "inherit", transition: "all var(--transition-fast)",
                      cursor: "pointer",
                    }}
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                <motion.button
                  type="submit" disabled={creating}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    width: "100%", background: "linear-gradient(135deg, #f0a500, #e09000)",
                    color: "#fff", border: "none", borderRadius: "var(--radius-md)",
                    padding: 14, fontSize: 14, fontWeight: 700,
                    cursor: creating ? "not-allowed" : "pointer",
                    fontFamily: "inherit", opacity: creating ? 0.7 : 1,
                    marginTop: 8, boxShadow: "var(--shadow-accent)",
                    transition: "all var(--transition-fast)",
                  }}
                >
                  {creating ? (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⚡</span>
                      Generating...
                    </span>
                  ) : "Create Session →"}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Hover styles for delete button ===== */}
      <style>{`
        [style*="cursor: pointer"]:hover .delete-btn-hover,
        div:hover > .delete-btn-hover { opacity: 1 !important; }
      `}</style>
    </motion.div>
  );
};

export default Dashboard;
