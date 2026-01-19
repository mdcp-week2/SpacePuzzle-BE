const express = require("express");
const {
  getMe,
  getClearedCelestialObjects
} = require("../controllers/userController");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

router.get("/me", requireAuth, getMe);
router.get("/me/cleared-celestial-objects", requireAuth, getClearedCelestialObjects);

module.exports = router;
