const Question = require("../models/Question");
const Session = require("../models/Session");

const addQuestion = async (req, res) => {
  try {
    const { sessionId, question, answer } = req.body;
    const session = await Session.findOne({ _id: sessionId, user: req.user._id });
    if (!session) return res.status(404).json({ message: "Session not found" });
    const newQuestion = await Question.create({ session: sessionId, question, answer: answer || "" });
    session.questions.push(newQuestion._id);
    await session.save();
    res.status(201).json(newQuestion);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const togglePin = async (req, res) => {
  try {
    const { questionId } = req.body;
    const question = await Question.findById(questionId).populate("session");
    if (!question) return res.status(404).json({ message: "Question not found" });
    if (question.session.user.toString() !== req.user._id.toString()) {
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
    const question = await Question.findById(questionId).populate("session");
    if (!question) return res.status(404).json({ message: "Question not found" });
    if (question.session.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }
    question.isRead = !question.isRead;
    await question.save();
    res.json(question);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { addQuestion, togglePin, toggleRead };