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
      userId: req.user.id,
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
    const sessions = await Session.findAll({
      where: { userId: req.user.id },
      order: [["createdAt", "DESC"]],
    });
    
    // Fetch questions for each session
    const sessionsWithQuestions = await Promise.all(
      sessions.map(async (s) => {
        const questions = await Question.findAll({ where: { sessionId: s.id } });
        return { ...s.toJSON(), questions };
      })
    );
    
    res.json(sessionsWithQuestions);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const getSessionById = async (req, res) => {
  try {
    const session = await Session.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });
    
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }
    
    const questions = await Question.findAll({ where: { sessionId: session.id } });
    
    res.json({ ...session.toJSON(), questions });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const deleteSession = async (req, res) => {
  try {
    const session = await Session.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });
    
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }
    
    await Question.destroy({ where: { sessionId: session.id } });
    await session.destroy();
    
    res.json({ message: "Session deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { createSession, getAllSessions, getSessionById, deleteSession };