const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const celestialRoutes = require("./routes/celestial");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("🚀 우주 정거장에 오신 것을 환영합니다! (Backend is Running)");
});

app.use("/auth", authRoutes);
app.use("/", celestialRoutes);

module.exports = app;
