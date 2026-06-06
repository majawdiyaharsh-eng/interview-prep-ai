const Session = require("../models/Session");
const Question = require("../models/Question");

const createSession = async (req, res) => {
  try {
    const { role, experience, description, difficulty } = req.body;
    if (!role || !experience) {
      return res.status(400).json({ message: "Role and experience are required" });
    }

    const expNum = Number(experience);
    if (!isNaN(expNum) && expNum < 0) {
      return res.status(400).json({ message: "Experience cannot be negative" });
    }

    const session = await Session.create({
      user: req.user._id,
      role,
      experience,
      description: description || "",
      difficulty: difficulty || "Medium",
    });
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getAllSessions = async (req, res) => {
  try {
    const sessions = await Session.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate("questions");
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const getSessionById = async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate("questions");
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }
    res.json(session);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const deleteSession = async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }
    await Question.deleteMany({ session: session._id });
    await session.deleteOne();
    res.json({ message: "Session deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { createSession, getAllSessions, getSessionById, deleteSession };