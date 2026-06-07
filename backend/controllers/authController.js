const User = require("../models/User");
const Session = require("../models/Session");
const Question = require("../models/Question");
const TestResult = require("../models/TestResult");
const jwt = require("jsonwebtoken");

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

const signup = async (req, res) => {
  console.log("🔥 SIGNUP API HIT");
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }
    const user = await User.create({ name, email, password });
    const token = generateToken(user.id);
    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("❌ SIGNUP ERROR:", error.message, error.stack);
    res.status(500).json({ message: "Signup failed: " + error.message, error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }
    const user = await User.findOne({ where: { email } });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const token = generateToken(user.id);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error 2", error: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ["password"] },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error 3" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (email && email !== user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) return res.status(400).json({ message: "Email already in use" });
      user.email = email;
    }
    if (name) user.name = name;

    await user.save();
    res.json({
      message: "Profile updated",
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update profile", error: error.message });
  }
};

const uploadProfilePhoto = async (req, res) => {
  try {
    const { photo } = req.body;
    if (!photo) return res.status(400).json({ message: "Photo is required" });

    if (photo.length > 700000) {
      return res.status(400).json({ message: "Photo too large. Max 500KB." });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.profilePhoto = photo;
    await user.save();
    res.json({ message: "Photo uploaded", profilePhoto: photo });
  } catch (error) {
    res.status(500).json({ message: "Failed to upload photo", error: error.message });
  }
};

const removeProfilePhoto = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.profilePhoto = "";
    await user.save();
    res.json({ message: "Photo removed" });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove photo", error: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new passwords are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(401).json({ message: "Current password is incorrect" });

    user.password = newPassword;
    await user.save();
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to change password", error: error.message });
  }
};

const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const sessions = await Session.findAll({ where: { userId } });
    const totalSessions = sessions.length;
    let totalQuestions = 0;
    let pinnedQuestions = 0;
    let explainedQuestions = 0;
    const roles = new Set();

    for (const s of sessions) {
      const questions = await Question.findAll({ where: { sessionId: s.id } });
      totalQuestions += questions.length;
      roles.add(s.role);
      questions.forEach((q) => {
        if (q.isPinned) pinnedQuestions++;
        if (q.explanation && q.explanation.trim().length > 0) explainedQuestions++;
      });
    }

    const testResults = await TestResult.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
    });
    const totalTests = testResults.length;
    const avgScore = totalTests > 0
      ? Math.round(testResults.reduce((sum, r) => sum + r.percentage, 0) / totalTests)
      : 0;

    const user = await User.findByPk(userId, {
      attributes: ["createdAt", "profilePhoto"],
    });

    res.json({
      totalSessions,
      totalQuestions,
      pinnedQuestions,
      explainedQuestions,
      rolesExplored: roles.size,
      topRoles: [...roles].slice(0, 5),
      totalTests,
      avgScore,
      memberSince: user.createdAt,
      profilePhoto: user.profilePhoto || "",
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to get stats", error: error.message });
  }
};

const saveTestResult = async (req, res) => {
  try {
    const { sessionId, role, difficulty, totalQuestions, correctCount, percentage, timeTaken, timerEnabled, results } = req.body;
    if (!sessionId || !role || totalQuestions === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const testResult = await TestResult.create({
      userId: req.user.id,
      sessionId,
      role,
      difficulty: difficulty || "medium",
      totalQuestions,
      correctCount,
      percentage,
      timeTaken: timeTaken || 0,
      timerEnabled: timerEnabled || false,
      results: results || [],
    });

    res.status(201).json({ message: "Test result saved", testResult });
  } catch (error) {
    res.status(500).json({ message: "Failed to save test result", error: error.message });
  }
};

const getTestHistory = async (req, res) => {
  try {
    const testResults = await TestResult.findAll({
      where: { userId: req.user.id },
      order: [["createdAt", "DESC"]],
      limit: 20,
      attributes: { exclude: ["results"] },
    });

    res.json(testResults);
  } catch (error) {
    res.status(500).json({ message: "Failed to get test history", error: error.message });
  }
};

const getTestResultDetail = async (req, res) => {
  try {
    const result = await TestResult.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });
    if (!result) return res.status(404).json({ message: "Test result not found" });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to get test result", error: error.message });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const sessions = await Session.findAll({ where: { userId } });
    for (const s of sessions) {
      await Question.destroy({ where: { sessionId: s.id } });
    }
    await Session.destroy({ where: { userId } });
    await TestResult.destroy({ where: { userId } });
    await User.destroy({ where: { id: userId } });
    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete account", error: error.message });
  }
};

module.exports = {
  signup, login, getProfile, updateProfile, uploadProfilePhoto, removeProfilePhoto,
  changePassword, getUserStats, saveTestResult, getTestHistory, getTestResultDetail, deleteAccount,
};