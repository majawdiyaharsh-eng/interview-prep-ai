const Question = require("../models/Question");
const Session = require("../models/Session");

const addQuestion = async (req, res) => {
  try {
    const { sessionId, question, answer } = req.body;
    const session = await Session.findOne({
      where: { id: sessionId, userId: req.user.id },
    });
    
    if (!session) return res.status(404).json({ message: "Session not found" });
    
    const newQuestion = await Question.create({
      sessionId,
      question,
      answer: answer || "",
    });
    
    res.status(201).json(newQuestion);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const togglePin = async (req, res) => {
  try {
    const { questionId } = req.body;
    const question = await Question.findByPk(questionId);
    
    if (!question) return res.status(404).json({ message: "Question not found" });
    
    const session = await Session.findByPk(question.sessionId);
    if (session.userId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    question.isPinned = !question.isPinned;
    await question.save();
    res.json(question);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const toggleRead = async (req, res) => {
  try {
    const { questionId } = req.body;
    const question = await Question.findByPk(questionId);
    
    if (!question) return res.status(404).json({ message: "Question not found" });
    
    const session = await Session.findByPk(question.sessionId);
    if (session.userId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    // Note: Sequelize model doesn't have isRead field yet, but you can add it if needed
    question.isRead = !question.isRead;
    await question.save();
    res.json(question);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { addQuestion, togglePin, toggleRead };