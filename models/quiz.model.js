// models/Quiz.js
const mongoose = require("mongoose");

const QuestionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: String, required: true },
});

const QuizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    questions: [QuestionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quiz", QuizSchema);
