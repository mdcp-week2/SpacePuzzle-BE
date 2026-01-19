const express = require("express");
const {
  getTodayApodHandler,
  completeApodPuzzle,
  getApodPuzzle,
  proxyImage,
} = require("../controllers/apodController");
const { optionalAuth, requireAuth } = require("../middlewares/auth");

const router = express.Router();

router.get("/apod/today", optionalAuth, getTodayApodHandler);
router.get("/celestial-objects/apod/puzzle", requireAuth, getApodPuzzle);
router.post("/celestial-objects/apod/complete", requireAuth, completeApodPuzzle);
router.get("/api/proxy-image", proxyImage); // 프록시 API (인증 불필요)

module.exports = router;