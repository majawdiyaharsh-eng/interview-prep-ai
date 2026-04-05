const express = require("express");
const router = express.Router();
const {
  signup, login, getProfile, updateProfile, uploadProfilePhoto, removeProfilePhoto,
  changePassword, getUserStats, saveTestResult, getTestHistory, getTestResultDetail, deleteAccount,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/signup", signup);
router.post("/login", login);
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.put("/profile-photo", protect, uploadProfilePhoto);
router.delete("/profile-photo", protect, removeProfilePhoto);
router.put("/change-password", protect, changePassword);
router.get("/stats", protect, getUserStats);
router.post("/test-result", protect, saveTestResult);
router.get("/test-history", protect, getTestHistory);
router.get("/test-result/:id", protect, getTestResultDetail);
router.delete("/delete-account", protect, deleteAccount);

module.exports = router;