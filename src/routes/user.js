const express = require("express");
const {
  getMe,
  getClearedCelestialObjects,
  getUserResources,
  getMilestones
} = require("../controllers/userController");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

router.get("/me", requireAuth, getMe);
router.get("/me/cleared-celestial-objects", requireAuth, getClearedCelestialObjects);
router.get("/user/resources", requireAuth, getUserResources);
router.get("/milestones", requireAuth, getMilestones);

module.exports = router;
