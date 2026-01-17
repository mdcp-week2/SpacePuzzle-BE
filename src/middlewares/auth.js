const prisma = require("../prisma/client");
const { supabase, extractBearerToken } = require("../services/supabase");

const requireAuth = async (req, res, next) => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: "인증 토큰이 필요합니다." });
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: "유효하지 않은 토큰입니다." });
    }

    const user = await prisma.user.findUnique({
      where: { id: data.user.id }
    });

    if (!user) {
      return res.status(401).json({ error: "사용자를 찾을 수 없습니다." });
    }

    req.authUser = user;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "서버 에러" });
  }
};

module.exports = {
  requireAuth
};
