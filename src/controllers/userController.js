const prisma = require("../prisma/client");
const { STAR_MILESTONES } = require("../constants/milestones");

// 유저 정보 조회 API
const getMe = async (req, res) => {
  try {
    const user = req.authUser;
    const daysParam = Number.parseInt(req.query.days, 10);
    const activityDays = Number.isFinite(daysParam)
      ? Math.min(Math.max(daysParam, 1), 365)
      : 30;

    const recentActivity = await prisma.$queryRaw`
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
    `;

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
    // 1. 일반 천체 기록 조회
    const celestialRecords = await prisma.gameRecord.findMany({
      where: {
        userId: req.authUser.id,
        isCompleted: true,
        celestialObjectId: { not: null }
      },
      include: {
        object: true
      }
    });

    // 2. APOD 기록 조회
    const apodRecords = await prisma.gameRecord.findMany({
      where: {
        userId: req.authUser.id,
        isCompleted: true,
        apodDate: { not: null } // APOD 날짜가 있는 기록만
      },
      include: {
        apod: true 
      }
    });

    // 3. 일반 천체 매핑
    const clearedCelestial = celestialRecords
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

    // 4. APOD 매핑 [수정됨]
    // record.apod가 null일 경우(FK 불일치 등)에도 앱이 죽지 않고,
    // 최소한의 정보로 리스트에 표시되도록 fallback 처리
    const clearedApod = apodRecords.map((record) => {
      // APOD 정보가 있으면 사용, 없으면 GameRecord의 정보나 기본값 사용 (안전장치)
      const apodData = record.apod || {
        title: `APOD ${record.apodDate}`, // 날짜를 제목으로 대체
        description: "Image details unavailable",
        imageUrl: null, // 프론트에서 기본 이미지 처리 필요
        difficulty: "special",
        puzzleConfig: { gridSize: 7 }
      };

      return {
        id: `apod-${record.apodDate}`,
        nasaId: null,
        title: apodData.title,
        nameEn: null,
        description: apodData.description,
        imageUrl: apodData.imageUrl,
        category: "apod",
        difficulty: apodData.difficulty,
        gridSize: apodData.puzzleConfig?.gridSize ?? 7,
        rewardStars: 0,
        clearedAt: record.completedAt
      };
    });

    // 5. 합치고 정렬
    const cleared = [...clearedCelestial, ...clearedApod].sort(
      (a, b) => new Date(b.clearedAt) - new Date(a.clearedAt)
    );

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
    const unlockSectorNames = STAR_MILESTONES.map(
      (milestone) => milestone.unlockSectorName
    ).filter(Boolean);
    const unlockSectors = unlockSectorNames.length
      ? await prisma.sector.findMany({
          where: { name: { in: unlockSectorNames } },
          select: { id: true, name: true }
        })
      : [];
    const unlockSectorByName = new Map(
      unlockSectors.map((sector) => [sector.name, sector])
    );

    const milestoneList = STAR_MILESTONES.map((milestone) => ({
      requiredStars: milestone.requiredStars,
      credits: milestone.rewardCredits,
      spaceParts: milestone.rewardParts,
      sectorUnlock: milestone.unlockSectorName
        ? unlockSectorByName.get(milestone.unlockSectorName)
          ? {
              id: unlockSectorByName.get(milestone.unlockSectorName).id,
              name: unlockSectorByName.get(milestone.unlockSectorName).name
            }
          : {
              id: null,
              name: milestone.unlockSectorName
            }
        : null,
      achieved: req.authUser.stars >= milestone.requiredStars
    }));

    const nextMilestone = STAR_MILESTONES.find(
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
