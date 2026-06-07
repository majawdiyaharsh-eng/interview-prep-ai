import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import axiosInstance from "../utils/axiosInstance";

const TestMode = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Test Options
  const [isTestStarted, setIsTestStarted] = useState(false);
  const [testOptions, setTestOptions] = useState({
    timerEnabled: false,
    durationMinutes: 15,
  });
  const [quizQuestionCount, setQuizQuestionCount] = useState(null);
  const [difficulty, setDifficulty] = useState("medium");
  const [quizStartTime, setQuizStartTime] = useState(null);

  // Quiz State
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { questionId: selectedIndex }
  const [timeLeft, setTimeLeft] = useState(0);

  // Result State
  const [testResult, setTestResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await axiosInstance.get(`/session/${id}`);
        setSession(res.data);
      } catch {
        toast.error("Failed to load session");
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [id]);

  // Set default quiz question count when session loads
  useEffect(() => {
    if (session?.questions?.length && quizQuestionCount === null) {
      setQuizQuestionCount(Math.min(session.questions.length, 10));
    }
  }, [session, quizQuestionCount]);

  // Timer countdown
  useEffect(() => {
    let timer;
    if (isTestStarted && testOptions.timerEnabled && timeLeft > 0 && !testResult && !submitting) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmitQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isTestStarted, timeLeft, testOptions.timerEnabled, testResult, submitting, handleSubmitQuiz]);

  const startTest = async () => {
    if (!session?.questions?.length) {
      return toast.error("No questions in this session to test.");
    }
    if (testOptions.timerEnabled && testOptions.durationMinutes <= 0) {
      return toast.error("Please enter a valid time greater than 0 minutes.");
    }
    if (testOptions.timerEnabled && testOptions.durationMinutes > 120) {
      return toast.error("Maximum allowed test duration is 120 minutes.");
    }
    setGeneratingQuiz(true);
    try {
      const res = await axiosInstance.post("/ai/generate-quiz", { sessionId: id, numberOfQuestions: quizQuestionCount });
      setQuizQuestions(res.data.quiz);
      setIsTestStarted(true);
      setQuizStartTime(Date.now());
      if (testOptions.timerEnabled) {
        setTimeLeft(testOptions.durationMinutes * 60);
      }
      toast.success("Quiz generated! Let's go 🚀");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate quiz. Please try again.");
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const selectAnswer = (questionId, optionIndex) => {
    if (testResult || submitting) return;
    setSelectedAnswers({ ...selectedAnswers, [questionId]: optionIndex });
  };

  const handleSubmitQuiz = useCallback(async () => {
    setSubmitting(true);
    const quizAnswers = quizQuestions.map((q) => ({
      questionId: q.questionId,
      selectedIndex: selectedAnswers[q.questionId] ?? -1,
      correctIndex: q.correctIndex,
      selectedOption: selectedAnswers[q.questionId] !== undefined ? q.options[selectedAnswers[q.questionId]] : "Not answered",
      correctOption: q.options[q.correctIndex],
    }));

    try {
      const res = await axiosInstance.post("/ai/evaluate-quiz", {
        sessionId: id,
        quizAnswers,
      });
      setTestResult(res.data);

      // Save test result to history
      const timeTaken = quizStartTime ? Math.round((Date.now() - quizStartTime) / 1000) : 0;
      try {
        await axiosInstance.post("/auth/test-result", {
          sessionId: id,
          role: session?.role || "Unknown",
          difficulty,
          totalQuestions: res.data.totalQuestions,
          correctCount: res.data.correctCount,
          percentage: res.data.percentage,
          timeTaken,
          timerEnabled: testOptions.timerEnabled,
          results: res.data.results,
        });
      } catch (saveErr) {
        console.error("Failed to save test result:", saveErr);
      }

      toast.success("Quiz completed!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to evaluate quiz.");
      setSubmitting(false);
    }
  }, [id, quizQuestions, selectedAnswers, quizStartTime, session?.role, difficulty, testOptions.timerEnabled]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const answeredCount = Object.keys(selectedAnswers).length;
  const totalQuestions = quizQuestions.length;
  const currentQ = quizQuestions[currentQuestionIndex];

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-golden, var(--bg))", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)", color: "var(--text)" }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📝</div>
          <p style={{ fontSize: 16, fontWeight: 600 }}>Loading session...</p>
        </motion.div>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-golden, var(--bg))", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)", color: "var(--text)" }}>
        <p>Session not found.</p>
      </div>
    );
  }

  // ======================================
  // 1. SETUP SCREEN
  // ======================================
  if (!isTestStarted) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-golden, var(--bg))", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "var(--font-sans)", color: "var(--text)" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{
          background: "var(--bg-card)", padding: 44, borderRadius: "var(--radius-2xl, 28px)",
          border: "1px solid var(--border)", maxWidth: 520, width: "100%",
          boxShadow: "var(--shadow-lg)", backdropFilter: "blur(12px)",
        }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%", margin: "0 auto 16px",
              background: "linear-gradient(135deg, rgba(212,148,10,0.1), rgba(245,208,107,0.15))",
              border: "2px solid rgba(212,148,10,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32,
            }}>🧠</div>
            <h1 style={{ fontSize: 26, fontWeight: 700, fontFamily: "var(--font-serif)", marginBottom: 8 }}>Quiz Mode</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6 }}>
              Test your knowledge for <b style={{ color: "var(--accent, #d4940a)" }}>{session.role}</b> with multiple-choice questions.
            </p>
          </div>

          {/* Difficulty Selector */}
          <div style={{
            background: "var(--hover-bg)", padding: "16px 14px", borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)", marginBottom: 16,
          }}>
            <span style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 10 }}>🎯 Difficulty Level</span>
            <div style={{ display: "flex", gap: 8 }}>
              {["easy", "medium", "hard"].map(d => (
                <motion.button
                  key={d}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setDifficulty(d)}
                  style={{
                    flex: 1, padding: "10px 0", borderRadius: "var(--radius-md)",
                    border: difficulty === d ? "2px solid" : "1px solid var(--border)",
                    borderColor: difficulty === d
                      ? d === "easy" ? "#22c55e" : d === "medium" ? "#f0a500" : "#ef4444"
                      : "var(--border)",
                    background: difficulty === d
                      ? d === "easy" ? "rgba(34,197,94,0.08)" : d === "medium" ? "rgba(240,165,0,0.08)" : "rgba(239,68,68,0.08)"
                      : "var(--bg-card)",
                    color: difficulty === d
                      ? d === "easy" ? "#22c55e" : d === "medium" ? "#f0a500" : "#ef4444"
                      : "var(--text-muted)",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                    fontFamily: "inherit", textTransform: "capitalize",
                    transition: "all 0.2s",
                  }}
                >
                  {d === "easy" ? "🟢" : d === "medium" ? "🟡" : "🔴"} {d.charAt(0).toUpperCase() + d.slice(1)}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Question Count Selector */}
          <div style={{
            background: "var(--hover-bg)", padding: "20px 14px", borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)", marginBottom: 24,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: 14 }}>📋 Number of Questions</span>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                  {session.questions?.length || 0} available in this session
                </p>
              </div>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>4 options each</span>
            </div>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 16,
            }}>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setQuizQuestionCount(prev => Math.max(1, prev - 1))}
                disabled={quizQuestionCount <= 1}
                style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: "var(--bg-card)", border: "1px solid var(--border)",
                  fontSize: 18, fontWeight: 700, cursor: quizQuestionCount <= 1 ? "not-allowed" : "pointer",
                  color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: quizQuestionCount <= 1 ? 0.3 : 1,
                  fontFamily: "inherit",
                }}
              >−</motion.button>

              <div style={{ textAlign: "center", minWidth: 80 }}>
                <motion.div
                  key={quizQuestionCount}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  style={{
                    fontSize: 36, fontWeight: 800,
                    background: "linear-gradient(135deg, var(--accent, #d4940a), #ff6b35)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    lineHeight: 1,
                  }}
                >{quizQuestionCount}</motion.div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, marginTop: 4 }}>questions</div>
              </div>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setQuizQuestionCount(prev => Math.min(session.questions?.length || prev, prev + 1))}
                disabled={quizQuestionCount >= (session.questions?.length || 0)}
                style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: "var(--bg-card)", border: "1px solid var(--border)",
                  fontSize: 18, fontWeight: 700,
                  cursor: quizQuestionCount >= (session.questions?.length || 0) ? "not-allowed" : "pointer",
                  color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: quizQuestionCount >= (session.questions?.length || 0) ? 0.3 : 1,
                  fontFamily: "inherit",
                }}
              >+</motion.button>
            </div>

            {/* Quick select pills */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14 }}>
              {[5, 10, 15, 20].filter(n => n <= (session.questions?.length || 0)).map(n => (
                <motion.button
                  key={n}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setQuizQuestionCount(n)}
                  style={{
                    padding: "5px 16px", borderRadius: "var(--radius-full, 100px)",
                    background: quizQuestionCount === n
                      ? "linear-gradient(135deg, var(--accent, #d4940a), #b8860b)"
                      : "var(--bg-card)",
                    color: quizQuestionCount === n ? "#fff" : "var(--text-muted)",
                    border: quizQuestionCount === n ? "none" : "1px solid var(--border)",
                    fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    transition: "all 0.2s",
                  }}
                >{n}</motion.button>
              ))}
              {/* All button */}
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setQuizQuestionCount(session.questions?.length || 0)}
                style={{
                  padding: "5px 16px", borderRadius: "var(--radius-full, 100px)",
                  background: quizQuestionCount === (session.questions?.length || 0)
                    ? "linear-gradient(135deg, var(--accent, #d4940a), #b8860b)"
                    : "var(--bg-card)",
                  color: quizQuestionCount === (session.questions?.length || 0) ? "#fff" : "var(--text-muted)",
                  border: quizQuestionCount === (session.questions?.length || 0) ? "none" : "1px solid var(--border)",
                  fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  transition: "all 0.2s",
                }}
              >All</motion.button>
            </div>
          </div>

          {/* Timer toggle */}
          <div style={{
            background: "var(--hover-bg)", padding: 20, borderRadius: "var(--radius-md)",
            marginBottom: 28, border: "1px solid var(--border)",
          }}>
            <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", marginBottom: testOptions.timerEnabled ? 16 : 0 }}>
              <div style={{
                width: 44, height: 24, borderRadius: 12, position: "relative",
                background: testOptions.timerEnabled ? "var(--accent, #d4940a)" : "var(--border-strong)",
                transition: "all 0.3s", cursor: "pointer",
              }}
                onClick={() => setTestOptions({ ...testOptions, timerEnabled: !testOptions.timerEnabled })}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: "50%", background: "#fff",
                  position: "absolute", top: 2,
                  left: testOptions.timerEnabled ? 22 : 2,
                  transition: "all 0.3s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }} />
              </div>
              <div>
                <span style={{ fontWeight: 600, fontSize: 14 }}>⏱ Enable Timer</span>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Simulate real interview pressure</p>
              </div>
            </label>

            <AnimatePresence>
              {testOptions.timerEnabled && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 8, color: "var(--text-muted)" }}>Duration (Minutes)</label>
                  <input
                    type="number" min="1" max="120"
                    value={testOptions.durationMinutes}
                    onChange={(e) => setTestOptions({ ...testOptions, durationMinutes: Number(e.target.value) })}
                    style={{
                      width: "100%", background: "var(--bg-input)", border: "1px solid var(--border-input)",
                      borderRadius: "var(--radius-md)", padding: "10px 14px", color: "var(--text)", fontFamily: "inherit",
                      fontSize: 14,
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => navigate(`/session/${id}`)}
              style={{
                flex: 1, padding: 14, borderRadius: "var(--radius-full, 100px)",
                background: "var(--hover-bg)", border: "1px solid var(--border)",
                color: "var(--text)", fontWeight: 600, cursor: "pointer",
                transition: "all 0.2s", fontFamily: "inherit", fontSize: 14,
              }}
            >← Back</button>
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={startTest}
              disabled={generatingQuiz}
              style={{
                flex: 2, padding: 14, borderRadius: "var(--radius-full, 100px)",
                background: generatingQuiz ? "var(--text-muted)" : "linear-gradient(135deg, #d4940a, #b8860b)",
                border: "none", color: "#fff", fontWeight: 700, fontSize: 14,
                cursor: generatingQuiz ? "not-allowed" : "pointer",
                boxShadow: generatingQuiz ? "none" : "0 8px 25px rgba(212,148,10,0.3)",
                fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {generatingQuiz ? (
                <>
                  <span style={{ display: "inline-block", animation: "spin 1s linear infinite", fontSize: 16 }}>⏳</span>
                  Generating Quiz...
                </>
              ) : (
                <>Start Quiz 🚀</>
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ======================================
  // 3. RESULT SCREEN
  // ======================================
  if (testResult) {
    const getScoreColor = () => {
      if (testResult.percentage >= 80) return "#22c55e";
      if (testResult.percentage >= 60) return "#f0a500";
      if (testResult.percentage >= 40) return "#f97316";
      return "#ef4444";
    };

    const getScoreEmoji = () => {
      if (testResult.percentage >= 80) return "🏆";
      if (testResult.percentage >= 60) return "👍";
      if (testResult.percentage >= 40) return "💪";
      return "📚";
    };

    const getScoreMessage = () => {
      if (testResult.percentage >= 80) return "Excellent! You're interview-ready!";
      if (testResult.percentage >= 60) return "Good job! A little more practice and you'll nail it.";
      if (testResult.percentage >= 40) return "Not bad! Review the topics you missed.";
      return "Keep practicing! Review the explanations below.";
    };

    return (
      <div style={{
        minHeight: "100vh", background: "var(--bg-golden, var(--bg))",
        display: "flex", flexDirection: "column", padding: "40px 20px",
        fontFamily: "var(--font-sans)", color: "var(--text)", alignItems: "center",
      }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ width: "100%", maxWidth: 800 }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, fontFamily: "var(--font-serif)" }}>Quiz Results</h1>
            <button onClick={() => navigate(`/session/${id}`)} style={{
              padding: "10px 20px", borderRadius: "var(--radius-full, 100px)",
              background: "var(--hover-bg)", border: "1px solid var(--border)",
              color: "var(--text)", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 13,
            }}>Back to Session</button>
          </div>

          {/* Score Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)", borderRadius: "var(--radius-2xl, 28px)",
              padding: 40, marginBottom: 32, textAlign: "center",
              boxShadow: "var(--shadow-lg)",
              position: "relative", overflow: "hidden",
            }}
          >
            {/* Decorative top border */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg, ${getScoreColor()}, rgba(212,148,10,0.5), ${getScoreColor()})` }} />

            <div style={{ fontSize: 48, marginBottom: 8 }}>{getScoreEmoji()}</div>

            {/* Circular progress */}
            <div style={{ position: "relative", width: 140, height: 140, margin: "0 auto 20px" }}>
              <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="70" cy="70" r="58" fill="none" stroke="var(--border)" strokeWidth="10" />
                <motion.circle
                  cx="70" cy="70" r="58" fill="none"
                  stroke={getScoreColor()} strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 58}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 58 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 58 * (1 - testResult.percentage / 100) }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                />
              </svg>
              <div style={{
                position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
              }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: getScoreColor() }}>{testResult.percentage}%</div>
              </div>
            </div>

            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{getScoreMessage()}</p>
            <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
              {testResult.correctCount} out of {testResult.totalQuestions} correct
            </p>
          </motion.div>

          {/* Detailed results */}
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Question Review</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {testResult.results.map((res, i) => (
              <motion.div
                key={res.questionId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                style={{
                  background: "var(--bg-card)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-xl, 20px)", padding: 24, overflow: "hidden",
                  borderLeft: `4px solid ${res.isCorrect ? "#22c55e" : "#ef4444"}`,
                }}
              >
                {/* Question header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, flex: 1, marginRight: 16, lineHeight: 1.5 }}>
                    <span style={{ color: "var(--text-muted)", marginRight: 8 }}>Q{i + 1}.</span>
                    {res.question}
                  </h3>
                  <div style={{
                    padding: "6px 14px", borderRadius: "var(--radius-full, 100px)", fontWeight: 700, fontSize: 13,
                    background: res.isCorrect ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                    color: res.isCorrect ? "#22c55e" : "#ef4444",
                    whiteSpace: "nowrap",
                  }}>
                    {res.isCorrect ? "✓ Correct" : "✗ Wrong"}
                  </div>
                </div>

                {/* Your answer */}
                <div style={{
                  background: res.isCorrect ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)",
                  border: `1px solid ${res.isCorrect ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}`,
                  padding: "12px 16px", borderRadius: "var(--radius-md)", marginBottom: 10, fontSize: 13,
                }}>
                  <span style={{ fontWeight: 700, color: res.isCorrect ? "#22c55e" : "#ef4444" }}>Your Answer: </span>
                  <span style={{ color: "var(--text-secondary)" }}>{res.selectedOption || "Not answered"}</span>
                </div>

                {/* Correct answer (show only if wrong) */}
                {!res.isCorrect && (
                  <div style={{
                    background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)",
                    padding: "12px 16px", borderRadius: "var(--radius-md)", marginBottom: 10, fontSize: 13,
                  }}>
                    <span style={{ fontWeight: 700, color: "#22c55e" }}>Correct Answer: </span>
                    <span style={{ color: "var(--text-secondary)" }}>{res.correctOption}</span>
                  </div>
                )}

                {/* Model answer */}
                <div style={{
                  background: "var(--hover-bg)", border: "1px solid var(--border)",
                  padding: "12px 16px", borderRadius: "var(--radius-md)", fontSize: 13,
                }}>
                  <span style={{ fontWeight: 700, color: "var(--accent, #d4940a)" }}>📖 Full Answer: </span>
                  <span style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{res.correctAnswer}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Retry / Back buttons */}
          <div style={{ display: "flex", gap: 12, marginTop: 32, justifyContent: "center" }}>
            <button onClick={() => {
              setTestResult(null);
              setIsTestStarted(false);
              setSelectedAnswers({});
              setCurrentQuestionIndex(0);
              setQuizQuestions([]);
            }} style={{
              padding: "14px 32px", borderRadius: "var(--radius-full, 100px)",
              background: "linear-gradient(135deg, #d4940a, #b8860b)", border: "none",
              color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 14,
              boxShadow: "0 8px 25px rgba(212,148,10,0.3)", display: "flex", alignItems: "center", gap: 8,
            }}>🔄 Retake Quiz</button>
            <button onClick={() => navigate(`/session/${id}`)} style={{
              padding: "14px 32px", borderRadius: "var(--radius-full, 100px)",
              background: "var(--hover-bg)", border: "1px solid var(--border)",
              color: "var(--text)", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: 14,
            }}>Back to Session</button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ======================================
  // 2. QUIZ ACTIVE SCREEN
  // ======================================
  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg-golden, var(--bg))",
      display: "flex", flexDirection: "column",
      fontFamily: "var(--font-sans)", color: "var(--text)",
    }}>
      {/* Top Bar */}
      <div style={{
        background: "var(--bg-card)", borderBottom: "1px solid var(--border)",
        padding: "14px 32px", display: "flex", justifyContent: "space-between", alignItems: "center",
        position: "sticky", top: 0, zIndex: 10,
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: "var(--accent, #d4940a)" }}>
            Q{currentQuestionIndex + 1}
            <span style={{ color: "var(--text-muted)", fontWeight: 500 }}> / {totalQuestions}</span>
          </span>
          <div style={{ width: 140, height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
            <motion.div
              animate={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
              style={{ background: "linear-gradient(90deg, #d4940a, #f5d06b)", height: "100%", borderRadius: 3 }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Answered count */}
          <div style={{
            background: "var(--hover-bg)", padding: "6px 14px", borderRadius: "var(--radius-full, 100px)",
            fontSize: 12, fontWeight: 600, border: "1px solid var(--border)",
          }}>
            ✅ {answeredCount}/{totalQuestions} answered
          </div>

          {/* Timer */}
          {testOptions.timerEnabled && (
            <div style={{
              color: timeLeft <= 60 ? "#ef4444" : "var(--text)", fontWeight: 700, fontSize: 18,
              display: "flex", alignItems: "center", gap: 6,
              background: timeLeft <= 60 ? "rgba(239,68,68,0.08)" : "transparent",
              padding: "4px 12px", borderRadius: "var(--radius-full, 100px)",
              animation: timeLeft <= 30 ? "pulse 1s ease-in-out infinite" : "none",
            }}>
              ⏱ {formatTime(timeLeft)}
            </div>
          )}
        </div>
      </div>

      {/* Question Navigation Dots */}
      <div style={{
        background: "var(--bg-card)", borderBottom: "1px solid var(--border)",
        padding: "10px 32px", display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center",
      }}>
        {quizQuestions.map((q, i) => {
          const isAnswered = selectedAnswers[q.questionId] !== undefined;
          const isCurrent = i === currentQuestionIndex;
          return (
            <button
              key={q.questionId}
              onClick={() => setCurrentQuestionIndex(i)}
              style={{
                width: 32, height: 32, borderRadius: "50%", cursor: "pointer",
                fontSize: 11, fontWeight: 700, fontFamily: "inherit",
                transition: "all 0.2s",
                background: isCurrent
                  ? "linear-gradient(135deg, #d4940a, #b8860b)"
                  : isAnswered
                    ? "rgba(34,197,94,0.15)"
                    : "var(--hover-bg)",
                color: isCurrent ? "#fff" : isAnswered ? "#22c55e" : "var(--text-muted)",
                border: isCurrent ? "none" : "1px solid var(--border)",
                boxShadow: isCurrent ? "0 2px 8px rgba(212,148,10,0.3)" : "none",
              }}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: "40px 20px", display: "flex", justifyContent: "center" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            style={{ maxWidth: 800, width: "100%" }}
          >
            {/* Question */}
            <div style={{
              background: "var(--bg-card)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-xl, 20px)", padding: "32px 28px", marginBottom: 24,
              boxShadow: "var(--shadow-md)",
            }}>
              <div style={{
                display: "inline-block", background: "linear-gradient(135deg, rgba(212,148,10,0.1), rgba(245,208,107,0.12))",
                border: "1px solid rgba(212,148,10,0.2)",
                padding: "4px 14px", borderRadius: "var(--radius-full, 100px)", fontSize: 11,
                fontWeight: 700, color: "var(--accent, #d4940a)", marginBottom: 16,
                letterSpacing: "0.5px",
              }}>
                QUESTION {currentQuestionIndex + 1} OF {totalQuestions}
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.6, color: "var(--text)" }}>
                {currentQ?.question}
              </h2>
            </div>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
              {currentQ?.options.map((option, optIndex) => {
                const isSelected = selectedAnswers[currentQ.questionId] === optIndex;
                const optionLetter = String.fromCharCode(65 + optIndex); // A, B, C, D

                return (
                  <motion.button
                    key={optIndex}
                    whileHover={{ y: -2, boxShadow: "var(--shadow-md)" }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => selectAnswer(currentQ.questionId, optIndex)}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 14,
                      background: isSelected
                        ? "linear-gradient(135deg, rgba(212,148,10,0.08), rgba(245,208,107,0.1))"
                        : "var(--bg-card)",
                      border: isSelected
                        ? "2px solid var(--accent, #d4940a)"
                        : "1px solid var(--border)",
                      borderRadius: "var(--radius-lg, 16px)", padding: "18px 20px",
                      cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                      transition: "all 0.2s", width: "100%",
                      color: "var(--text)",
                      boxShadow: isSelected ? "0 4px 15px rgba(212,148,10,0.12)" : "var(--shadow-sm)",
                    }}
                  >
                    {/* Letter badge */}
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 700, fontSize: 14,
                      background: isSelected
                        ? "linear-gradient(135deg, #d4940a, #b8860b)"
                        : "var(--hover-bg)",
                      color: isSelected ? "#fff" : "var(--text-muted)",
                      border: isSelected ? "none" : "1px solid var(--border)",
                      transition: "all 0.2s",
                    }}>
                      {optionLetter}
                    </div>

                    <span style={{ fontSize: 14, fontWeight: isSelected ? 600 : 400, lineHeight: 1.6, paddingTop: 6 }}>
                      {option}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* Navigation */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                style={{
                  padding: "12px 28px", borderRadius: "var(--radius-full, 100px)",
                  background: "var(--bg-card)", border: "1px solid var(--border)",
                  color: "var(--text)", fontWeight: 600, fontFamily: "inherit", fontSize: 14,
                  cursor: currentQuestionIndex === 0 ? "not-allowed" : "pointer",
                  opacity: currentQuestionIndex === 0 ? 0.4 : 1,
                  transition: "all 0.2s",
                }}
              >← Previous</button>

              {currentQuestionIndex < totalQuestions - 1 ? (
                <button
                  onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                  style={{
                    padding: "12px 32px", borderRadius: "var(--radius-full, 100px)",
                    background: "var(--text)", border: "none",
                    color: "var(--bg)", fontWeight: 600, fontFamily: "inherit", fontSize: 14,
                    cursor: "pointer", transition: "all 0.2s",
                  }}
                >Next →</button>
              ) : (
                <motion.button
                  whileHover={{ y: submitting ? 0 : -2 }}
                  whileTap={{ scale: submitting ? 1 : 0.98 }}
                  disabled={submitting}
                  onClick={handleSubmitQuiz}
                  style={{
                    padding: "12px 36px", borderRadius: "var(--radius-full, 100px)",
                    background: submitting ? "var(--text-muted)" : "#1a1a1a",
                    border: "none", color: "#fff", fontWeight: 700, fontFamily: "inherit", fontSize: 14,
                    cursor: submitting ? "not-allowed" : "pointer",
                    boxShadow: submitting ? "none" : "0 8px 20px rgba(0,0,0,0.3)",
                    display: "flex", alignItems: "center", gap: 8,
                  }}
                >
                  {submitting ? "Submitting..." : "Submit Quiz ✔"}
                </motion.button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TestMode;
