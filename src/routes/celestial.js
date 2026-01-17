const express = require("express");
const {
  listBySector,
  getPuzzleForNasaId
} = require("../controllers/celestialController");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

router.get("/sectors/:slug/celestial-objects", requireAuth, listBySector);
router.get(
  "/celestial-objects/by-nasa/:nasaId/puzzle",
  requireAuth,
  getPuzzleForNasaId
);

module.exports = router;
