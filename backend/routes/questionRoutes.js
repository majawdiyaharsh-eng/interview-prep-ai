const express = require("express");
const router = express.Router();
const { addQuestion, togglePin, toggleRead } = require("../controllers/questionController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.post("/add", addQuestion);
router.patch("/pin", togglePin);
router.patch("/read", toggleRead);

module.exports = router;