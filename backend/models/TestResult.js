const mongoose = require("mongoose");

const testResultSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    session: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true },
    role: { type: String, required: true },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    totalQuestions: { type: Number, required: true },
    correctCount: { type: Number, required: true },
    percentage: { type: Number, required: true },
    timeTaken: { type: Number, default: 0 }, // in seconds
    timerEnabled: { type: Boolean, default: false },
    results: [
      {
        questionId: String,
        question: String,
        correctAnswer: String,
        selectedOption: String,
        correctOption: String,
        isCorrect: Boolean,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("TestResult", testResultSchema);
