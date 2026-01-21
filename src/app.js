const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const apodRoutes = require("./routes/apod");
const celestialRoutes = require("./routes/celestial");
const userRoutes = require("./routes/user");
const shopRoutes = require("./routes/shop");
const customizationRoutes = require("./routes/customization");

const app = express();

// CORS 설정
const corsOptions = {
  origin: function (origin, callback) {
    // 환경변수에서 허용된 origin 목록 가져오기
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",").map((url) => url.trim())
      : ["http://localhost:5173", "https://spacepuzzle.vercel.app"]; // 기본값: 개발 환경

    // origin이 없거나 (같은 도메인 요청) 허용된 목록에 있으면 허용
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS policy: Origin not allowed"));
    }
  },
  credentials: true, // 쿠키/인증 정보 포함 허용
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("🚀 우주 정거장에 오신 것을 환영합니다! (Backend is Running)");
});

app.use("/auth", authRoutes);
app.use("/", apodRoutes);
app.use("/", celestialRoutes);
app.use("/", userRoutes);
app.use("/", shopRoutes);
app.use("/", customizationRoutes);

module.exports = app;
