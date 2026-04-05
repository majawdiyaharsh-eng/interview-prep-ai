const express = require("express");
const router = express.Router();
const { createSession, getAllSessions, getSessionById, deleteSession } = require("../controllers/sessionController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.post("/create", createSession);
router.get("/all", getAllSessions);
router.get("/:id", getSessionById);
router.delete("/:id", deleteSession);

module.exports = router;