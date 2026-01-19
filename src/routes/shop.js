const express = require("express");
const { requireAuth } = require("../middlewares/auth");
const { getPurchasedItems, purchaseItem } = require("../controllers/shopController");

const router = express.Router();

router.get("/shop/purchased", requireAuth, getPurchasedItems);
router.post("/shop/purchase", requireAuth, purchaseItem);

module.exports = router;
