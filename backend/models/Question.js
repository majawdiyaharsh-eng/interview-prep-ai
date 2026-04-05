const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true },
    question: { type: String, required: true },
    answer: { type: String, default: "" },
    isPinned: { type: Boolean, default: false },
    explanation: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Question", questionSchema);