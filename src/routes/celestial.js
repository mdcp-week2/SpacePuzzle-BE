const express = require("express");
const {
  listBySector,
  getPuzzleForNasaId,
  savePuzzleStateForNasaId,
  getPuzzleStateForNasaId,
  completePuzzleForNasaId
} = require("../controllers/celestialController");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

router.get("/sectors/:slug/celestial-objects", requireAuth, listBySector);
router.get(
  "/celestial-objects/:nasaId/puzzle",
  requireAuth,
  getPuzzleForNasaId
);
router.get(
  "/celestial-objects/:nasaId/state",
  requireAuth,
  getPuzzleStateForNasaId
);
router.post(
  "/celestial-objects/:nasaId/save",
  requireAuth,
  savePuzzleStateForNasaId
);
router.post(
  "/celestial-objects/:nasaId/complete",
  requireAuth,
  completePuzzleForNasaId
);

module.exports = router;
