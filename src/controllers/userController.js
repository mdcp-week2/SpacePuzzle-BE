const prisma = require("../prisma/client");

// 유저 정보 조회 API
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

// 클리어한 천체 리스트(도감) 조회 API
const getClearedCelestialObjects = async (req, res) => {
  try {
    const records = await prisma.gameRecord.findMany({
      where: {
        userId: req.authUser.id,
        isCompleted: true,
        celestialObjectId: { not: null }
      },
      include: {
        object: true
      },
      orderBy: {
        completedAt: "desc"
      }
    });

    const cleared = records
      .filter((record) => record.object)
      .map((record) => ({
        id: record.object.id,
        nasaId: record.object.nasaId,
        title: record.object.title,
        nameEn: record.object.nameEn,
        description: record.object.description,
        imageUrl: record.object.imageUrl,
        category: record.object.category,
        difficulty: record.object.difficulty,
        gridSize: record.object.gridSize,
        rewardStars: record.object.rewardStars,
        clearedAt: record.completedAt
      }));

    res.json({ cleared });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "서버 에러" });
  }
};

const getUserResources = async (req, res) => {
  try {
    const user = req.authUser;
    const unlockedSectors = await prisma.sector.findMany({
      where: {
        requiredStars: { lte: user.stars }
      },
      orderBy: { displayOrder: "asc" },
      select: { id: true }
    });

    res.json({
      stars: user.stars,
      credits: user.credits,
      spaceParts: user.parts,
      unlockedSectors: unlockedSectors.map((sector) => sector.id)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "서버 에러" });
  }
};

const getMilestones = async (req, res) => {
  try {
    const milestones = await prisma.starMilestone.findMany({
      include: { unlockSector: true },
      orderBy: { milestoneOrder: "asc" }
    });

    const achieved = await prisma.userMilestone.findMany({
      where: { userId: req.authUser.id },
      select: { milestoneId: true }
    });
    const achievedSet = new Set(achieved.map((entry) => entry.milestoneId));

    const milestoneList = milestones.map((milestone) => ({
      requiredStars: milestone.requiredStars,
      credits: milestone.rewardCredits,
      spaceParts: milestone.rewardParts,
      sectorUnlock: milestone.unlockSector
        ? {
            id: milestone.unlockSector.id,
            name: milestone.unlockSector.name
          }
        : null,
      achieved: achievedSet.has(milestone.id)
    }));

    const nextMilestone = milestones.find(
      (milestone) => milestone.requiredStars > req.authUser.stars
    );

    res.json({
      milestones: milestoneList,
      nextMilestone: nextMilestone
        ? {
            requiredStars: nextMilestone.requiredStars,
            starsNeeded: nextMilestone.requiredStars - req.authUser.stars
          }
        : null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "서버 에러" });
  }
};

module.exports = {
  getMe,
  getClearedCelestialObjects,
  getUserResources,
  getMilestones
};
