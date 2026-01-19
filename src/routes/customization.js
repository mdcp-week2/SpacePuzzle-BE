const express = require("express");
const { requireAuth } = require("../middlewares/auth");
const {
  getCustomization,
  setCustomization,
  placeItem,
  removeItem
} = require("../controllers/customizationController");

const router = express.Router();

router.get("/user/customization", requireAuth, getCustomization);
router.post("/user/customization/set", requireAuth, setCustomization);
router.post("/user/customization/place-item", requireAuth, placeItem);
router.delete("/user/customization/remove-item", requireAuth, removeItem);

module.exports = router;
