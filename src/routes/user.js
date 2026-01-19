const express = require("express");
const { getMe } = require("../controllers/userController");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

router.get("/me", requireAuth, getMe);

module.exports = router;
