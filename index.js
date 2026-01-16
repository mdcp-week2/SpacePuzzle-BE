const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 8080;

// 미들웨어 설정
app.use(cors()); // 모든 곳에서 접속 허용 (일단 개발용)
app.use(express.json()); // JSON 데이터 읽기 허용

// 1. 기본 접속 테스트
app.get("/", (req, res) => {
  res.send("🚀 우주 정거장에 오신 것을 환영합니다! (Backend is Running)");
});

// 2. 유저 목록 가져오기 테스트 (DB 연결 확인용)
app.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany(); // DB에서 유저 가져오기
    res.json(users);
  } catch (error) {
    console.error("DB Error:", error);
    res.status(500).json({ error: "DB 연결에 실패했습니다 ㅠㅠ" });
  }
});

// 3. 회원가입 (임시 테스트용)
app.post("/auth/signup", async (req, res) => {
  try {
    const { email, nickname, googleId } = req.body;

    // DB 저장
    const newUser = await prisma.user.create({
      data: {
        email,
        nickname,
        googleId,
      },
    });

    res.json({ message: "회원가입 성공!", user: newUser });
  } catch (error) {
    console.error("Signup Error:", error);
    res
      .status(400)
      .json({ error: "가입 실패 (이미 존재하는 유저일 수 있습니다)" });
  }
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`
  🚀 Server is running!
  ---------------------------
  Local: http://localhost:${PORT}
  ---------------------------
  `);
});
