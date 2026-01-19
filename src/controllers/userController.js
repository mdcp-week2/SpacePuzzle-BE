const prisma = require("../prisma/client");

const getMe = async (req, res) => {
  try {
    const user = req.authUser;
    const daysParam = Number.parseInt(req.query.days, 10);
    const activityDays = Number.isFinite(daysParam)
      ? Math.min(Math.max(daysParam, 1), 365)
      : 30;

    const [badges, recentActivity] = await Promise.all([
      prisma.userBadge.findMany({
        where: { userId: user.id },
        include: { badge: true },
        orderBy: { acquiredAt: "desc" }
      }),
      prisma.$queryRaw`
        select
          date(gr."completedAt") as date,
          count(*)::int as count
        from "game_records" gr
        where gr."userId" = ${user.id}
          and gr."isCompleted" = true
          and gr."completedAt" is not null
        group by date(gr."completedAt")
        order by date desc
        limit ${activityDays};
      `
    ]);

    const formatDateKey = (date) => date.toISOString().slice(0, 10);
    const today = new Date();
    const countsByDate = new Map(
      recentActivity.map((log) => [String(log.date), Number(log.count) || 0])
    );
    const lastDays = Array.from({ length: activityDays }, (_, index) => {
      const day = new Date(today);
      day.setDate(today.getDate() - index);
      const key = formatDateKey(day);
      return {
        date: key,
        count: countsByDate.get(key) || 0
      };
    }).reverse();

    res.json({
      nickname: user.nickname,
      stars: user.stars,
      parts: user.parts,
      totalClears: user.total_clears,
      badges: badges.map((entry) => ({
        id: entry.badge.id,
        name: entry.badge.name,
        description: entry.badge.description,
        iconUrl: entry.badge.iconUrl,
        badgeType: entry.badge.badgeType,
        acquiredAt: entry.acquiredAt
      })),
      recentActivity: lastDays
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "서버 에러" });
  }
};

module.exports = {
  getMe
};
