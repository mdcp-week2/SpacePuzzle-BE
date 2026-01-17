const prisma = require("../prisma/client");
const { supabase, extractBearerToken } = require("../services/supabase");

const login = async (req, res) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: "인증 토큰이 필요합니다." });
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: "유효하지 않은 토큰입니다." });
    }

    const supaUser = data.user;
    const email = supaUser.email || null;
    const nickname =
      supaUser.user_metadata?.nickname ||
      supaUser.user_metadata?.name ||
      null;
    const googleId =
      supaUser.identities?.find((identity) => identity.provider === "google")
        ?.id || null;

    if (!email) {
      return res.status(400).json({ error: "이메일 정보가 없습니다." });
    }

    const existingById = await prisma.user.findUnique({
      where: { id: supaUser.id }
    });

    const user = await prisma.user.upsert({
      where: { id: supaUser.id },
      create: {
        id: supaUser.id,
        email,
        nickname,
        googleId
      },
      update: {
        email,
        nickname,
        googleId
      }
    });

    res.json({
      message: "로그인 성공!",
      user,
      isNewUser: !existingById
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "서버 에러" });
  }
};

module.exports = {
  login
};
