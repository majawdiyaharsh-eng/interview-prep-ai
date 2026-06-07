import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import axiosInstance from "../utils/axiosInstance";
import { useAuth } from "../context/AuthContext";

/* ---- Page Variants ---- */
const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

/* ---- Skeleton Components ---- */
const QuestionSkeleton = () => (
  <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)" }}>
    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
      <div className="skeleton-box" style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton-box" style={{ width: "80%", height: 16, marginBottom: 0 }} />
      </div>
      <div className="skeleton-box" style={{ width: 90, height: 28, borderRadius: "var(--radius-full)" }} />
    </div>
  </div>
);

const SessionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [numberOfQuestions, setNumberOfQuestions] = useState(10);
  const [expandedQ, setExpandedQ] = useState(null);
  const [explainPanel, setExplainPanel] = useState(null);
  const [explaining, setExplaining] = useState(null);
  const { user, dark, toggleTheme } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreProgress, setLoadMoreProgress] = useState(0);
  const dropdownRef = useRef(null);
  const isGeneratingRef = useRef(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSession = useCallback(async () => {
    try {
      const res = await axiosInstance.get(`/session/${id}`);
      setSession(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load session");
    }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchSession(); }, [id, fetchSession]);

  const handleGenerate = async () => {
    if (isGeneratingRef.current) return;
    isGeneratingRef.current = true;
    setGenerating(true);
    setGenProgress(0);
    // Simulate progress
    const interval = setInterval(() => {
      setGenProgress(p => {
        if (p >= 90) { clearInterval(interval); return p; }
        return p + Math.random() * 15;
      });
    }, 500);

    try {
      await axiosInstance.post("/ai/generate-questions", {
        role: session.role, experience: session.experience,
        sessionId: id, numberOfQuestions,
      });
      setGenProgress(100);
      clearInterval(interval);
      toast.success(`${numberOfQuestions} questions generated!`);
      fetchSession();
    } catch {
      clearInterval(interval);
      toast.error("Generation failed. Try again.");
    }
    finally {
      isGeneratingRef.current = false;
      setTimeout(() => { setGenerating(false); setGenProgress(0); }, 500);
    }
  };

  const handleExplain = async (q) => {
    if (q.explanation) { setExplainPanel(q); return; }
    setExplaining(q.id);
    try {
      const res = await axiosInstance.post("/ai/explain", { questionId: q.id });
      const updated = res.data.question;
      setSession(prev => ({
        ...prev,
        questions: prev.questions.map(qq => qq.id === q.id ? updated : qq),
      }));
      setExplainPanel(updated);
      toast.success("Explanation ready!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate explanation");
    }
    finally { setExplaining(null); }
  };

  const handlePin = async (questionId, e) => {
    e.stopPropagation();
    try {
      const res = await axiosInstance.patch("/question/pin", { questionId });
      setSession(prev => ({
        ...prev,
        questions: prev.questions.map(q => q.id === questionId ? res.data : q),
      }));
      if (explainPanel?.id === questionId) setExplainPanel(res.data);
      toast.success(res.data.isPinned ? "Question pinned!" : "Question unpinned");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update pin");
    }
  };

  if (loading) return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      background: "var(--bg)", fontFamily: "var(--font-sans)", color: "var(--text)",
    }}>
      {/* Navbar skeleton */}
      <div className="glass" style={{
        height: 60, borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", padding: "0 32px",
      }}>
        <div className="skeleton-box" style={{ width: 140, height: 20 }} />
      </div>
      <div style={{ padding: "32px 40px", flex: 1 }}>
        <div className="skeleton-box" style={{ width: 120, height: 14, marginBottom: 20 }} />
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)", padding: 24, marginBottom: 24,
        }}>
          <div className="skeleton-box" style={{ width: "30%", height: 26, marginBottom: 8 }} />
          <div className="skeleton-box" style={{ width: "50%", height: 14, marginBottom: 16 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <div className="skeleton-box" style={{ width: 80, height: 24, borderRadius: "var(--radius-full)" }} />
            <div className="skeleton-box" style={{ width: 60, height: 24, borderRadius: "var(--radius-full)" }} />
          </div>
        </div>
        {[0, 1, 2, 3, 4].map(i => <QuestionSkeleton key={i} />)}
      </div>
    </div>
  );

  const pinnedQ = session?.questions?.filter(q => q.isPinned) || [];
  const regularQ = session?.questions?.filter(q => !q.isPinned) || [];
  const allQ = [...pinnedQ, ...regularQ];

  return (
    <motion.div
      variants={pageVariants}
      initial="initial" animate="animate" exit="exit"
      style={{
        fontFamily: "var(--font-sans)", background: "var(--bg)",
        minHeight: "100vh", color: "var(--text)", display: "flex",
      }}
    >
      {/* ===== Main Content ===== */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Navbar */}
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
            <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => navigate("/profile")}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%",
                background: "linear-gradient(135deg, #f0a500, #ff6b35)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700, color: "#fff",
              }}>{user?.name?.charAt(0)?.toUpperCase()}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.name}</div>
                <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 500 }}>Profile</div>
              </div>
            </div>
          </div>
        </nav>

        <div style={{ padding: "32px 40px", flex: 1 }}>
          {/* Breadcrumb */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            marginBottom: 20, fontSize: 13, color: "var(--text-muted)",
          }}>
            <span onClick={() => navigate("/dashboard")} style={{ cursor: "pointer", transition: "color var(--transition-fast)" }}
              onMouseEnter={e => e.target.style.color = "var(--text)"}
              onMouseLeave={e => e.target.style.color = "var(--text-muted)"}
            >Dashboard</span>
            <span style={{ opacity: 0.4 }}>›</span>
            <span style={{ color: "var(--text)", fontWeight: 600 }}>{session?.role}</span>
          </div>

          {/* ===== Header Card ===== */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: "var(--bg-card)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)", padding: "24px 28px", marginBottom: 24,
            }}
          >
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "flex-start", flexWrap: "wrap", gap: 16,
            }}>
              <div>
                <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6, fontFamily: "var(--font-serif)" }}>
                  {session?.role}
                </h1>
                {session?.description && (
                  <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 12 }}>{session.description}</p>
                )}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[`${session?.experience} yrs experience`, `${session?.difficulty || "Medium"} Difficulty`, `${allQ.length} Q&A`].map(tag => (
                    <span key={tag} style={{
                      background: "var(--tag-bg)", color: "var(--tag-text)",
                      padding: "4px 14px", borderRadius: "var(--radius-full)",
                      fontSize: 12, fontWeight: 500,
                    }}>{tag}</span>
                  ))}
                  {pinnedQ.length > 0 && (
                    <span style={{
                      background: "var(--accent-light)", color: "var(--accent)",
                      padding: "4px 14px", borderRadius: "var(--radius-full)",
                      fontSize: 12, fontWeight: 600,
                    }}>📌 {pinnedQ.length} pinned</span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {/* Custom Modern Dropdown */}
                <div ref={dropdownRef} style={{ position: "relative", userSelect: "none" }}>
                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      padding: "9px 36px 9px 14px",
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: "inherit",
                      color: "var(--text)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      minWidth: 140,
                      position: "relative",
                      transition: "all 0.2s ease",
                      boxShadow: dropdownOpen ? "0 0 0 2px var(--accent)" : "none",
                    }}
                  >
                    <span style={{
                      width: 22, height: 22, borderRadius: 6,
                      background: "linear-gradient(135deg, var(--accent), #ff6b35)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, color: "#fff", fontWeight: 700, flexShrink: 0,
                    }}>{numberOfQuestions}</span>
                    Questions
                    <motion.span
                      animate={{ rotate: dropdownOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        position: "absolute", right: 12, top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: 10, color: "var(--text-muted)",
                        display: "flex", alignItems: "center",
                      }}
                    >▾</motion.span>
                  </motion.button>

                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 6, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.96 }}
                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          minWidth: "100%",
                          background: "var(--bg-card)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-md)",
                          boxShadow: "0 12px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)",
                          zIndex: 100,
                          overflow: "hidden",
                          backdropFilter: "blur(20px)",
                        }}
                      >
                        {[5, 10, 15, 20].map((n, i) => (
                          <motion.div
                            key={n}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            onClick={() => { setNumberOfQuestions(n); setDropdownOpen(false); }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              padding: "10px 14px",
                              fontSize: 13,
                              fontWeight: numberOfQuestions === n ? 600 : 400,
                              color: numberOfQuestions === n ? "var(--accent)" : "var(--text)",
                              background: numberOfQuestions === n ? "var(--accent-light)" : "transparent",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                              borderBottom: i < 3 ? "1px solid var(--border)" : "none",
                            }}
                            onMouseEnter={e => {
                              if (numberOfQuestions !== n) e.currentTarget.style.background = "var(--hover-bg)";
                            }}
                            onMouseLeave={e => {
                              if (numberOfQuestions !== n) e.currentTarget.style.background = "transparent";
                            }}
                          >
                            <span style={{
                              width: 20, height: 20, borderRadius: 5,
                              background: numberOfQuestions === n
                                ? "linear-gradient(135deg, var(--accent), #ff6b35)"
                                : "var(--hover-bg)",
                              color: numberOfQuestions === n ? "#fff" : "var(--text-muted)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 9, fontWeight: 700,
                              border: numberOfQuestions === n ? "none" : "1px solid var(--border)",
                            }}>{n}</span>
                            {n} Questions
                            {numberOfQuestions === n && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                style={{ marginLeft: "auto", fontSize: 13 }}
                              >✓</motion.span>
                            )}
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <motion.button
                  whileHover={{ y: -1, boxShadow: "var(--shadow-accent)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGenerate} disabled={generating}
                  style={{
                    background: "var(--hover-bg)",
                    color: "var(--text)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
                    padding: "9px 16px", fontSize: 13, fontWeight: 600,
                    cursor: generating ? "not-allowed" : "pointer", fontFamily: "inherit",
                    position: "relative", overflow: "hidden", minWidth: 160,
                  }}
                >
                  {generating && (
                    <div style={{
                      position: "absolute", left: 0, bottom: 0, height: 3,
                      background: "var(--accent)", borderRadius: 3,
                      width: `${genProgress}%`, transition: "width 0.3s ease",
                    }} />
                  )}
                  {generating ? `Generating... ${Math.round(genProgress)}%` : "✦ Generate"}
                </motion.button>
                <motion.button
                  whileHover={{ y: -1, boxShadow: "0 8px 20px rgba(0,0,0,0.3)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/session/${id}/test`)}
                  style={{
                    background: "#1a1a1a",
                    color: "#fff", border: "none", borderRadius: "var(--radius-md)",
                    padding: "10px 20px", fontSize: 13, fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                  }}
                >
                  🎯 Take Test
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* ===== Questions List ===== */}
          {allQ.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                textAlign: "center", padding: 60,
                background: "var(--bg-card)", border: "1px dashed var(--border-strong)",
                borderRadius: "var(--radius-lg)",
              }}
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                style={{ fontSize: 48, marginBottom: 12, display: "inline-block" }}
              >🤖</motion.div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, fontFamily: "var(--font-serif)" }}>
                No questions yet
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
                Click &quot;Generate Questions&quot; to get started
              </p>
            </motion.div>
          ) : (
            <div>
              <p style={{
                fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
                letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12,
              }}>
                Interview Q & A — {allQ.length} questions
              </p>
              <div style={{
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)", overflow: "hidden",
              }}>
                {allQ.map((q, index) => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    style={{ borderBottom: index < allQ.length - 1 ? "1px solid var(--border)" : "none" }}
                  >
                    {/* Question Row */}
                    <div
                      onClick={() => setExpandedQ(expandedQ === q.id ? null : q.id)}
                      style={{
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center", padding: "16px 24px", cursor: "pointer",
                        background: q.isPinned ? "var(--accent-light)" : "transparent",
                        transition: "background var(--transition-fast)",
                      }}
                      onMouseEnter={e => { if (!q.isPinned) e.currentTarget.style.background = "var(--hover-bg)"; }}
                      onMouseLeave={e => { if (!q.isPinned) e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{ display: "flex", gap: 14, alignItems: "center", flex: 1 }}>
                        {/* Question number badge */}
                        <div style={{
                          width: 30, height: 30, borderRadius: "50%",
                          background: expandedQ === q.id ? "var(--accent)" : "var(--hover-bg)",
                          color: expandedQ === q.id ? "#fff" : "var(--text-muted)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 700, flexShrink: 0,
                          border: `1.5px solid ${expandedQ === q.id ? "var(--accent)" : "var(--border)"}`,
                          transition: "all var(--transition-fast)",
                        }}>
                          Q{index + 1}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.5 }}>{q.question}</span>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0, marginLeft: 16 }}>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={e => { e.stopPropagation(); handleExplain(q); }}
                          disabled={explaining === q.id}
                          style={{
                            background: "linear-gradient(135deg, #f0a500, #e09000)",
                            color: "#fff", border: "none", padding: "5px 14px",
                            borderRadius: "var(--radius-full)", fontSize: 12, fontWeight: 600,
                            cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                            opacity: explaining === q.id ? 0.7 : 1,
                          }}
                        >
                          {explaining === q.id ? (
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ animation: "spin 1s linear infinite", display: "inline-block", fontSize: 10 }}>⚡</span>
                              Loading
                            </span>
                          ) : "✦ Learn More"}
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={e => handlePin(q.id, e)}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            fontSize: 15, opacity: q.isPinned ? 1 : 0.25,
                            transition: "opacity var(--transition-fast)",
                            padding: 2,
                          }}
                        >📌</motion.button>
                        <motion.span
                          animate={{ rotate: expandedQ === q.id ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ color: "var(--text-muted)", fontSize: 14, display: "inline-block" }}
                        >▾</motion.span>
                      </div>
                    </div>

                    {/* Expanded Answer */}
                    <AnimatePresence>
                      {expandedQ === q.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                          style={{ overflow: "hidden" }}
                        >
                          <div style={{ padding: "4px 24px 20px 68px" }}>
                            <div style={{
                              background: "var(--answer-bg)", border: "1px solid var(--border)",
                              borderRadius: "var(--radius-md)", padding: "16px 18px",
                              marginBottom: q.explanation ? 10 : 0,
                            }}>
                              <p style={{
                                fontSize: 11, fontWeight: 700, color: "var(--accent)",
                                letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8,
                              }}>Answer</p>
                              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.8 }}>
                                {q.answer || "No answer available"}
                              </p>
                            </div>
                            {q.explanation && (
                              <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                  background: "var(--purple-bg)",
                                  border: "1px solid var(--purple-border)",
                                  borderRadius: "var(--radius-md)", padding: "16px 18px",
                                }}
                              >
                                <p style={{
                                  fontSize: 11, fontWeight: 700, color: "var(--purple)",
                                  letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8,
                                }}>🤖 AI Explanation</p>
                                <p style={{
                                  fontSize: 13, color: "var(--text-secondary)",
                                  lineHeight: 1.8, whiteSpace: "pre-wrap",
                                }}>{q.explanation}</p>
                              </motion.div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>

              {/* Load More Button */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ display: "flex", justifyContent: "center", marginTop: 20 }}
              >
                <motion.button
                  whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
                  whileTap={{ scale: 0.97 }}
                  disabled={loadingMore || generating}
                  onClick={async () => {
                    setLoadingMore(true);
                    setLoadMoreProgress(0);
                    const interval = setInterval(() => {
                      setLoadMoreProgress(p => {
                        if (p >= 90) { clearInterval(interval); return p; }
                        return p + Math.random() * 15;
                      });
                    }, 500);
                    try {
                      await axiosInstance.post("/ai/generate-questions", {
                        role: session.role, experience: session.experience,
                        sessionId: id, numberOfQuestions,
                      });
                      setLoadMoreProgress(100);
                      clearInterval(interval);
                      toast.success(`${numberOfQuestions} more questions loaded!`);
                      fetchSession();
                    } catch {
                      clearInterval(interval);
                      toast.error("Failed to load more. Try again.");
                    } finally {
                      setTimeout(() => { setLoadingMore(false); setLoadMoreProgress(0); }, 500);
                    }
                  }}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px dashed var(--border-strong)",
                    borderRadius: "var(--radius-md)",
                    padding: "12px 32px",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    cursor: loadingMore || generating ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    position: "relative",
                    overflow: "hidden",
                    opacity: loadingMore || generating ? 0.7 : 1,
                    transition: "all 0.2s ease",
                    minWidth: 180,
                    justifyContent: "center",
                  }}
                >
                  {loadingMore && (
                    <div style={{
                      position: "absolute", left: 0, bottom: 0, height: 3,
                      background: "linear-gradient(90deg, var(--accent), #ff6b35)",
                      borderRadius: 3,
                      width: `${loadMoreProgress}%`,
                      transition: "width 0.3s ease",
                    }} />
                  )}
                  {loadingMore ? (
                    <>
                      <span style={{ animation: "spin 1s linear infinite", display: "inline-block", fontSize: 14 }}>⚡</span>
                      Loading {Math.round(loadMoreProgress)}%
                    </>
                  ) : (
                    <>
                      <span style={{
                        width: 20, height: 20, borderRadius: "50%",
                        background: "var(--hover-bg)",
                        border: "1px solid var(--border)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, lineHeight: 1,
                      }}>+</span>
                      Load More
                    </>
                  )}
                </motion.button>
              </motion.div>
            </div>
          )}
        </div>
      </div>

      {/* ===== Explain Side Panel ===== */}
      <AnimatePresence>
        {explainPanel && (
          <motion.div
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: 380, background: "var(--bg-warm)",
              borderLeft: "1px solid var(--border)",
              padding: "28px 24px", overflowY: "auto",
              position: "sticky", top: 0, maxHeight: "100vh", flexShrink: 0,
            }}
          >
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "flex-start", marginBottom: 20,
            }}>
              <div style={{ flex: 1, marginRight: 12 }}>
                <p style={{
                  fontSize: 10, fontWeight: 700, color: "var(--accent)",
                  letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6,
                }}>Learning More</p>
                <h3 style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.5 }}>{explainPanel.question}</h3>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, background: "var(--hover-bg)" }}
                onClick={() => setExplainPanel(null)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text-muted)", fontSize: 18, flexShrink: 0,
                  width: 28, height: 28, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >✕</motion.button>
            </div>

            {explainPanel.answer && (
              <div style={{
                background: "var(--answer-bg)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)", padding: "14px 16px", marginBottom: 14,
              }}>
                <p style={{
                  fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
                  letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8,
                }}>Answer</p>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                  {explainPanel.answer}
                </p>
              </div>
            )}

            {explainPanel.explanation ? (
              <div>
                <p style={{
                  fontSize: 10, fontWeight: 700, color: "var(--purple)",
                  letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10,
                }}>🤖 AI Explanation</p>
                <p style={{
                  fontSize: 13, color: "var(--text-secondary)",
                  lineHeight: 1.9, whiteSpace: "pre-wrap",
                }}>{explainPanel.explanation}</p>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: 20 }}>
                <div style={{ animation: "spin 2s linear infinite", fontSize: 20, marginBottom: 8, display: "inline-block" }}>⚡</div>
                <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading explanation...</p>
              </div>
            )}

            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={e => handlePin(explainPanel.id, e)}
              style={{
                width: "100%", marginTop: 20,
                background: explainPanel.isPinned ? "var(--accent-light)" : "var(--hover-bg)",
                border: `1px solid ${explainPanel.isPinned ? "rgba(240,165,0,0.3)" : "var(--border)"}`,
                borderRadius: "var(--radius-md)", padding: 10,
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                color: explainPanel.isPinned ? "var(--accent)" : "var(--text-muted)",
                fontFamily: "inherit", transition: "all var(--transition-fast)",
              }}
            >
              {explainPanel.isPinned ? "📌 Pinned" : "📌 Pin Question"}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SessionDetail;