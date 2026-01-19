const express = require("express");
const {
  getTodayApodHandler,
  completeApodPuzzle,
  getApodPuzzle  // ← 추가
} = require("../controllers/apodController");
const { optionalAuth, requireAuth } = require("../middlewares/auth");

const router = express.Router();

router.get("/apod/today", optionalAuth, getTodayApodHandler);
router.get("/celestial-objects/apod/puzzle", requireAuth, getApodPuzzle);  // ← 추가
router.post("/celestial-objects/apod/complete", requireAuth, completeApodPuzzle);

module.exports = router;