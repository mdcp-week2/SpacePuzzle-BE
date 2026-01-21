const express = require("express");
const {
  getTodayApodHandler,
  completeApodPuzzle,
  getApodPuzzle,
  saveApodPuzzleState,
  getApodPuzzleState,
  proxyImage,
  getApodLeaderboard,
} = require("../controllers/apodController");
const { optionalAuth, requireAuth } = require("../middlewares/auth");

const router = express.Router();

router.get("/apod/today", optionalAuth, getTodayApodHandler);
router.get("/celestial-objects/apod/puzzle", requireAuth, getApodPuzzle);
router.get("/celestial-objects/apod/state", requireAuth, getApodPuzzleState);
router.post("/celestial-objects/apod/save", requireAuth, saveApodPuzzleState);
router.post("/celestial-objects/apod/complete", requireAuth, completeApodPuzzle);
router.get("/celestial-objects/apod/leaderboard", requireAuth, getApodLeaderboard);
router.get("/api/proxy-image", proxyImage); // 프록시 API (인증 불필요)

module.exports = router;