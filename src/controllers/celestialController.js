const prisma = require("../prisma/client");

// 섹터 별 천체 조회
const listBySector = async (req, res) => {
  try {
    const { slug } = req.params;
    const sector = await prisma.sector.findUnique({
      where: { slug },
      include: {
        celestialObjects: {
          orderBy: { displayOrder: "asc" }
        }
      }
    });

    if (!sector) {
      return res.status(404).json({ error: "섹터를 찾을 수 없습니다." });
    }

    const locked = req.authUser.stars < sector.requiredStars;
    const completedRecords = await prisma.gameRecord.findMany({
      where: {
        userId: req.authUser.id,
        celestialObjectId: {
          in: sector.celestialObjects.map((object) => object.id)
        },
        isCompleted: true
      },
      select: {
        celestialObjectId: true
      }
    });
    const completedSet = new Set(
      completedRecords.map((record) => record.celestialObjectId)
    );

    const celestialObjects = sector.celestialObjects.map((object) => ({
      id: object.id,
      nasaId: object.nasaId,
      title: object.title,
      nameEn: object.nameEn,
      description: object.description,
      imageUrl: object.imageUrl,
      category: object.category,
      difficulty: object.difficulty,
      gridSize: object.gridSize,
      rewardStars: object.rewardStars,
      puzzleType: object.puzzleType,
      displayOrder: object.displayOrder,
      locked,
      isCleared: completedSet.has(object.id)
    }));

    res.json({
      sector: {
        id: sector.id,
        slug: sector.slug,
        name: sector.name,
        description: sector.description,
        displayOrder: sector.displayOrder,
        requiredStars: sector.requiredStars
      },
      locked,
      celestialObjects
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "서버 에러" });
  }
};

// 특정 천체 퍼즐 조회
const getPuzzleForNasaId = async (req, res) => {
  try {
    const { nasaId } = req.params;
    const celestialObject = await prisma.celestialObject.findUnique({
      where: { nasaId },
      include: {
        sector: true
      }
    });

    if (!celestialObject) {
      return res.status(404).json({ error: "천체를 찾을 수 없습니다." });
    }

    const requiredStars = celestialObject.sector?.requiredStars ?? 0;
    if (req.authUser.stars < requiredStars) {
      return res.status(403).json({ error: "잠금 해제 조건이 부족합니다." });
    }

    let puzzleSeed = celestialObject.puzzleSeed;
    let puzzleConfig = celestialObject.puzzleConfig;

    if (!puzzleSeed) {
      puzzleSeed = Math.floor(Math.random() * 1_000_000_000);
    }

    if (!puzzleConfig) {
      puzzleConfig = {
        gridSize: celestialObject.gridSize,
        seed: puzzleSeed
      };
    }

    if (!celestialObject.puzzleSeed || !celestialObject.puzzleConfig) {
      await prisma.celestialObject.update({
        where: { id: celestialObject.id },
        data: {
          puzzleSeed,
          puzzleConfig
        }
      });
    }

    res.json({
      id: celestialObject.id,
      nasaId: celestialObject.nasaId,
      title: celestialObject.title,
      nameEn: celestialObject.nameEn,
      description: celestialObject.description,
      imageUrl: celestialObject.imageUrl,
      category: celestialObject.category,
      puzzleType: celestialObject.puzzleType,
      difficulty: celestialObject.difficulty,
      gridSize: celestialObject.gridSize,
      rewardStars: celestialObject.rewardStars,
      puzzleSeed,
      puzzleConfig
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "서버 에러" });
  }
};

// 특정 천체 퍼즐 상태 저장
const savePuzzleStateForNasaId = async (req, res) => {
  try {
    const { nasaId } = req.params;
    const { saveState, playTime } = req.body || {};

    if (!saveState) {
      return res.status(400).json({ error: "saveState가 필요합니다." });
    }

    const celestialObject = await prisma.celestialObject.findUnique({
      where: { nasaId },
      include: {
        sector: true
      }
    });

    if (!celestialObject) {
      return res.status(404).json({ error: "천체를 찾을 수 없습니다." });
    }

    const requiredStars = celestialObject.sector?.requiredStars ?? 0;
    if (req.authUser.stars < requiredStars) {
      return res.status(403).json({ error: "잠금 해제 조건이 부족합니다." });
    }

    const puzzleType = celestialObject.puzzleType || "jigsaw";
    const recordKey = {
      userId: req.authUser.id,
      celestialObjectId: celestialObject.id,
      puzzleType
    };

    const payload = {
      saveState,
      lastAttemptAt: new Date()
    };

    if (typeof playTime === "number" && playTime >= 0) {
      payload.saveState = {
        ...saveState,
        playTime
      };
    }

    const record = await prisma.gameRecord.upsert({
      where: {
        userId_celestialObjectId_puzzleType: recordKey
      },
      create: {
        ...recordKey,
        saveState: payload.saveState,
        lastAttemptAt: payload.lastAttemptAt
      },
      update: payload
    });

    res.json({
      message: "퍼즐 상태 저장 완료",
      recordId: record.id,
      lastAttemptAt: record.lastAttemptAt
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "서버 에러" });
  }
};

// 특정 천체 퍼즐 상태 불러오기
const getPuzzleStateForNasaId = async (req, res) => {
  try {
    const { nasaId } = req.params;

    const celestialObject = await prisma.celestialObject.findUnique({
      where: { nasaId }
    });

    if (!celestialObject) {
      return res.status(404).json({ error: "천체를 찾을 수 없습니다." });
    }

    const puzzleType = celestialObject.puzzleType || "jigsaw";
    const record = await prisma.gameRecord.findUnique({
      where: {
        userId_celestialObjectId_puzzleType: {
          userId: req.authUser.id,
          celestialObjectId: celestialObject.id,
          puzzleType
        }
      }
    });

    if (!record?.saveState) {
      return res.json({ saveState: null });
    }

    res.json({
      saveState: record.saveState,
      lastAttemptAt: record.lastAttemptAt,
      isCompleted: record.isCompleted
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "서버 에러" });
  }
};

// 특정 천체 퍼즐 완료 처리
const completePuzzleForNasaId = async (req, res) => {
  try {
    const { nasaId } = req.params;
    const { playTime } = req.body || {};

    const celestialObject = await prisma.celestialObject.findUnique({
      where: { nasaId },
      include: {
        sector: true
      }
    });

    if (!celestialObject) {
      return res.status(404).json({ error: "천체를 찾을 수 없습니다." });
    }

    const requiredStars = celestialObject.sector?.requiredStars ?? 0;
    if (req.authUser.stars < requiredStars) {
      return res.status(403).json({ error: "잠금 해제 조건이 부족합니다." });
    }

    const recordKey = {
      userId: req.authUser.id,
      celestialObjectId: celestialObject.id,
      puzzleType: celestialObject.puzzleType || "jigsaw"
    };

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.gameRecord.findUnique({
        where: {
          userId_celestialObjectId_puzzleType: recordKey
        }
      });

      const isFirstClear = !existing?.isCompleted;
      const bestTime =
        typeof playTime === "number" && playTime > 0
          ? Math.min(existing?.bestTime ?? playTime, playTime)
          : existing?.bestTime ?? null;

      const updatedRecord = await tx.gameRecord.upsert({
        where: {
          userId_celestialObjectId_puzzleType: recordKey
        },
        create: {
          ...recordKey,
          isCompleted: true,
          completedAt: new Date(),
          bestTime
        },
        update: {
          isCompleted: true,
          completedAt: new Date(),
          bestTime
        }
      });

      let updatedUser = req.authUser;
      if (isFirstClear) {
        updatedUser = await tx.user.update({
          where: { id: req.authUser.id },
          data: {
            stars: { increment: celestialObject.rewardStars },
            total_clears: { increment: 1 }
          }
        });
      }

      // 뱃지 규칙
      const badgeRules = await tx.badgeRule.findMany({
        include: { badge: true }
      });
      const existingBadges = await tx.userBadge.findMany({
        where: { userId: req.authUser.id },
        select: { badgeId: true }
      });
      const ownedBadgeIds = new Set(
        existingBadges.map((entry) => entry.badgeId)
      );

      const playTimeSeconds =
        typeof playTime === "number" && playTime > 0 ? playTime : null;

      const newlyAwarded = [];

      for (const rule of badgeRules) {
        if (ownedBadgeIds.has(rule.badgeId)) {
          continue;
        }

        const config = rule.ruleConfig || {};
        let eligible = false;

        switch (rule.ruleType) {
          case "TOTAL_CLEAR": {
            const requiredCount = Number(config.count ?? 0);
            eligible = requiredCount > 0 && updatedUser.total_clears >= requiredCount;
            break;
          }
          case "FAST_CLEAR": {
            const maxSeconds = Number(config.seconds ?? config.maxSeconds ?? 0);
            eligible =
              maxSeconds > 0 &&
              playTimeSeconds !== null &&
              playTimeSeconds <= maxSeconds;
            break;
          }
          case "FIRST_CLEAR": {
            eligible = isFirstClear === true;
            break;
          }
          default:
            eligible = false;
        }

        if (!eligible) {
          continue;
        }

        const badge = await tx.userBadge.create({
          data: {
            userId: req.authUser.id,
            badgeId: rule.badgeId
          },
          include: {
            badge: true
          }
        });

        newlyAwarded.push({
          id: badge.badge.id,
          name: badge.badge.name,
          description: badge.badge.description,
          iconUrl: badge.badge.iconUrl,
          badgeType: badge.badge.badgeType,
          acquiredAt: badge.acquiredAt
        });
      }

      return {
        updatedRecord,
        updatedUser,
        isFirstClear,
        newlyAwarded
      };
    });

    res.json({
      message: "퍼즐 완료 처리 완료",
      isFirstClear: result.isFirstClear,
      rewardStars: result.isFirstClear ? celestialObject.rewardStars : 0,
      totalStars: result.updatedUser.stars,
      newBadges: result.newlyAwarded,
      record: {
        id: result.updatedRecord.id,
        bestTime: result.updatedRecord.bestTime,
        completedAt: result.updatedRecord.completedAt
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "서버 에러" });
  }
};

const getLeaderboardForNasaId = async (req, res) => {
  try {
    const { nasaId } = req.params;

    const celestialObject = await prisma.celestialObject.findUnique({
      where: { nasaId }
    });

    if (!celestialObject) {
      return res.status(404).json({ error: "천체를 찾을 수 없습니다." });
    }

    const topRecords = await prisma.gameRecord.findMany({
      where: {
        celestialObjectId: celestialObject.id,
        isCompleted: true,
        bestTime: { not: null }
      },
      orderBy: [
        { bestTime: "asc" },
        { completedAt: "asc" }
      ],
      take: 5,
      include: {
        user: true
      }
    });

    const userRecord = await prisma.gameRecord.findUnique({
      where: {
        userId_celestialObjectId_puzzleType: {
          userId: req.authUser.id,
          celestialObjectId: celestialObject.id,
          puzzleType: celestialObject.puzzleType || "jigsaw"
        }
      },
      include: {
        user: true
      }
    });

    let userRank = null;
    if (userRecord?.bestTime !== null) {
      const betterCount = await prisma.gameRecord.count({
        where: {
          celestialObjectId: celestialObject.id,
          isCompleted: true,
          bestTime: { lt: userRecord.bestTime }
        }
      });
      userRank = betterCount + 1;
    }

    res.json({
      leaderboard: topRecords.map((record, index) => ({
        rank: index + 1,
        userId: record.user.id,
        nickname: record.user.nickname,
        bestTime: record.bestTime,
        completedAt: record.completedAt
      })),
      currentUser: userRecord?.bestTime
        ? {
            userId: userRecord.user.id,
            nickname: userRecord.user.nickname,
            bestTime: userRecord.bestTime,
            rank: userRank
          }
        : null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "서버 에러" });
  }
};

module.exports = {
  listBySector,
  getPuzzleForNasaId,
  savePuzzleStateForNasaId,
  getPuzzleStateForNasaId,
  completePuzzleForNasaId,
  getLeaderboardForNasaId
};
