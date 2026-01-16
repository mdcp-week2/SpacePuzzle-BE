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
    // DB에서 유저 가져오기
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    console.error("DB Error:", error);
    res.status(500).json({ error: "DB 연결 실패" });
  }
});

// 3. 로그인
app.post("/auth/login", async (req, res) => {
  try {
    // 유저 테이블 확인
    const { data: existingUser, error: findError } = await supabase
      .from("User")
      .select("*")
      .eq("googleId", googleId)
      .single();

    // 기존 유저
    if (existingUser) {
      console.log("기존 유저 로그인:", nickname);
      return res.json({
        message: "로그인 성공!",
        user: existingUser,
        isNewUser: false,
      });
    }

    // 신규 유저
    const { data: newUser, error: insertError } = await supabase
      .from("User")
      .insert([{ email, nickname, googleId }])
      .select()
      .single();

    if (insertError) throw insertError;

    console.log("신규 유저 가입:", nickname);
    return res.json({
      message: "환영합니다!",
      user: newUser,
      isNewUser: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "서버 에러 발생" });
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
