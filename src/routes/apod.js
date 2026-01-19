const express = require("express");
const {
  getTodayApodHandler,
  completeApodPuzzle
} = require("../controllers/apodController");
const { optionalAuth, requireAuth } = require("../middlewares/auth");

const router = express.Router();

router.get("/apod/today", optionalAuth, getTodayApodHandler);
router.post("/celestial-objects/apod/complete", requireAuth, completeApodPuzzle);

module.exports = router;
