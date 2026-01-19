const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const celestialRoutes = require("./routes/celestial");
const userRoutes = require("./routes/user");
const apodRoutes = require("./routes/apod");
const shopRoutes = require("./routes/shop");
const customizationRoutes = require("./routes/customization");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("🚀 우주 정거장에 오신 것을 환영합니다! (Backend is Running)");
});

app.use("/auth", authRoutes);
app.use("/", celestialRoutes);
app.use("/", userRoutes);
app.use("/", apodRoutes);
app.use("/", shopRoutes);
app.use("/", customizationRoutes);

module.exports = app;
