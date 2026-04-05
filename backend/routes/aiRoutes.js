const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { generateQuestions, explainQuestion, evaluateTest, generateQuiz, evaluateQuiz, generateFromResume } = require("../controllers/aiController");
const { protect } = require("../middleware/authMiddleware");

// Multer config for resume uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, `resume-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
});

router.use(protect);

router.post("/generate-questions", generateQuestions);
router.post("/explain", explainQuestion);
router.post("/evaluate-test", evaluateTest);
router.post("/generate-quiz", generateQuiz);
router.post("/evaluate-quiz", evaluateQuiz);
router.post("/generate-from-resume", upload.single("resume"), generateFromResume);

module.exports = router;