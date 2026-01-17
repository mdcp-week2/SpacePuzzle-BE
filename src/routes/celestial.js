const express = require("express");
const {
  listBySector,
  getPuzzleForObject
} = require("../controllers/celestialController");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

router.get("/sectors/:slug/celestial-objects", requireAuth, listBySector);
router.get("/celestial-objects/:id/puzzle", requireAuth, getPuzzleForObject);

module.exports = router;
