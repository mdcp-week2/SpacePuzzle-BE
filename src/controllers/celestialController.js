const prisma = require("../prisma/client");
const { STAR_MILESTONES } = require("../constants/milestones");

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

    // saveState가 null이면 저장 상태 삭제 (퍼즐 포기)
    if (saveState === null) {
      const existingRecord = await prisma.gameRecord.findUnique({
        where: {
          userId_celestialObjectId_puzzleType: recordKey
        }
      });

      if (existingRecord) {
        await prisma.gameRecord.update({
          where: {
            userId_celestialObjectId_puzzleType: recordKey
          },
          data: {
            saveState: null,
            lastAttemptAt: new Date()
          }
        });
      }

      return res.json({
        message: "저장 상태가 삭제되었습니다.",
        nasaId
      });
    }

    // saveState가 없으면 에러
    if (saveState === undefined) {
      return res.status(400).json({ error: "saveState가 필요합니다." });
    }

    // saveState가 있으면 저장/업데이트
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

const awardStarMilestones = async (
  tx,
  userId,
  previousStars,
  currentStars
) => {
  const eligible = STAR_MILESTONES.filter(
    (milestone) =>
      milestone.requiredStars > previousStars &&
      milestone.requiredStars <= currentStars
  );

  if (eligible.length === 0) {
    return { rewardCredits: 0, rewardParts: 0 };
  }

  const unlockSectorNames = eligible
    .map((milestone) => milestone.unlockSectorName)
    .filter(Boolean);
  const unlockSectors = unlockSectorNames.length
    ? await tx.sector.findMany({
        where: { name: { in: unlockSectorNames } },
        select: { id: true, name: true }
      })
    : [];
  const unlockSectorByName = new Map(
    unlockSectors.map((sector) => [sector.name, sector.id])
  );

  const milestoneRecords = await Promise.all(
    eligible.map((milestone) =>
      tx.starMilestone.upsert({
        where: { requiredStars: milestone.requiredStars },
        create: {
          requiredStars: milestone.requiredStars,
          rewardCredits: milestone.rewardCredits,
          rewardParts: milestone.rewardParts,
          unlockSectorId: milestone.unlockSectorName
            ? unlockSectorByName.get(milestone.unlockSectorName) || null
            : null,
          milestoneOrder: milestone.requiredStars
        },
        update: {
          rewardCredits: milestone.rewardCredits,
          rewardParts: milestone.rewardParts,
          unlockSectorId: milestone.unlockSectorName
            ? unlockSectorByName.get(milestone.unlockSectorName) || null
            : null,
          milestoneOrder: milestone.requiredStars
        }
      })
    )
  );
  const milestoneIdByRequiredStars = new Map(
    milestoneRecords.map((record) => [record.requiredStars, record.id])
  );

  const achieved = await tx.userMilestone.findMany({
    where: {
      userId,
      milestoneId: { in: milestoneRecords.map((record) => record.id) }
    },
    select: { milestoneId: true }
  });
  const achievedSet = new Set(achieved.map((entry) => entry.milestoneId));

  const newlyAchieved = eligible.filter((milestone) => {
    const milestoneId = milestoneIdByRequiredStars.get(milestone.requiredStars);
    return milestoneId && !achievedSet.has(milestoneId);
  });

  if (newlyAchieved.length === 0) {
    return { rewardCredits: 0, rewardParts: 0 };
  }

  await tx.userMilestone.createMany({
    data: newlyAchieved.map((milestone) => ({
      userId,
      milestoneId: milestoneIdByRequiredStars.get(milestone.requiredStars)
    })),
    skipDuplicates: true
  });

  const rewardCredits = newlyAchieved.reduce(
    (sum, milestone) => sum + (milestone.rewardCredits || 0),
    0
  );
  const rewardParts = newlyAchieved.reduce(
    (sum, milestone) => sum + (milestone.rewardParts || 0),
    0
  );

  if (rewardCredits || rewardParts) {
    await tx.user.update({
      where: { id: userId },
      data: {
        credits: rewardCredits ? { increment: rewardCredits } : undefined,
        parts: rewardParts ? { increment: rewardParts } : undefined
      }
    });
  }

  return { rewardCredits, rewardParts };
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

        await awardStarMilestones(
          tx,
          req.authUser.id,
          req.authUser.stars,
          updatedUser.stars
        );
      }

      return {
        updatedRecord,
        updatedUser,
        isFirstClear
      };
    });

    // 프론트엔드 요구사항에 맞는 형식으로 변환
    res.json({
      success: true,
      message: "Puzzle completed successfully",
      data: {
        userId: req.authUser.id,
        stageId: celestialObject.nasaId,
        playTime: result.updatedRecord.bestTime,
        starsEarned: result.isFirstClear ? celestialObject.rewardStars : 0,
        totalStars: result.updatedUser.stars
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "서버 에러" });
  }
};

// 특정 천체 퍼즐 랭킹 조회
const getLeaderboardForNasaId = async (req, res) => {
  try {
    // URL 디코딩 처리
    const { nasaId } = req.params;
    const decodedNasaId = decodeURIComponent(nasaId);

    console.log(`[Leaderboard] Request for identifier: ${decodedNasaId}`);

    // 천체 조회: nasaId, id, title, nameEn 순서로 시도
    let celestialObject = null;

    // 1. nasaId로 조회
    celestialObject = await prisma.celestialObject.findUnique({
      where: { nasaId: decodedNasaId }
    });

    // 2. id (UUID)로 조회 시도
    if (!celestialObject) {
      // UUID 형식인지 확인 (8-4-4-4-12 형식)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(decodedNasaId)) {
        console.log(`[Leaderboard] Not found by nasaId, trying id (UUID): ${decodedNasaId}`);
        celestialObject = await prisma.celestialObject.findUnique({
          where: { id: decodedNasaId }
        });
      }
    }

    // 3. title로 조회 시도
    if (!celestialObject) {
      console.log(`[Leaderboard] Not found by nasaId/id, trying title: ${decodedNasaId}`);
      celestialObject = await prisma.celestialObject.findFirst({
        where: { 
          title: {
            equals: decodedNasaId,
            mode: 'insensitive' // 대소문자 구분 없이
          }
        }
      });
    }

    // 4. nameEn으로 조회 시도
    if (!celestialObject) {
      console.log(`[Leaderboard] Not found by title, trying nameEn: ${decodedNasaId}`);
      celestialObject = await prisma.celestialObject.findFirst({
        where: { 
          nameEn: {
            equals: decodedNasaId,
            mode: 'insensitive'
          }
        }
      });
    }

    if (!celestialObject) {
      console.log(`[Leaderboard] Celestial object not found: ${decodedNasaId}`);
      return res.status(404).json({ error: "천체를 찾을 수 없습니다." });
    }

    console.log(`[Leaderboard] Found celestial object: ${celestialObject.title}`);

    // 상위 5명 조회
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

    console.log(`[Leaderboard] Found ${topRecords.length} top records`);

    // 현재 사용자 기록 조회
    if (!req.authUser || !req.authUser.id) {
      console.error("[Leaderboard] req.authUser is missing");
      return res.status(401).json({ error: "인증이 필요합니다." });
    }

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

    // 현재 사용자 순위 계산
    let userRank = null;
    if (userRecord?.bestTime !== null && userRecord?.bestTime !== undefined) {
      const betterCount = await prisma.gameRecord.count({
        where: {
          celestialObjectId: celestialObject.id,
          isCompleted: true,
          bestTime: { lt: userRecord.bestTime }
        }
      });
      userRank = betterCount + 1;
    }

    // 프론트엔드 요구사항에 맞는 형식으로 변환
    // user가 null인 경우 필터링
    const topPlayers = topRecords
      .filter((record) => record.user !== null)
      .map((record, index) => ({
        userId: record.user.id,
        nickname: record.user.nickname || "익명",
        playTime: record.bestTime,
        starsEarned: celestialObject.rewardStars,
        rank: index + 1,
        completedAt: record.completedAt
      }));

    const myRank = userRecord?.bestTime && userRecord?.user
      ? {
          userId: userRecord.user.id,
          nickname: userRecord.user.nickname || "익명",
          playTime: userRecord.bestTime,
          starsEarned: celestialObject.rewardStars,
          rank: userRank,
          completedAt: userRecord.completedAt
        }
      : null;

    console.log(`[Leaderboard] Returning ${topPlayers.length} top players, userRank: ${userRank}`);

    res.json({
      celestialId: celestialObject.nasaId,
      celestialName: celestialObject.title,
      topPlayers,
      myRank
    });
  } catch (err) {
    console.error("[Leaderboard] Error:", err);
    console.error("[Leaderboard] Stack:", err.stack);
    res.status(500).json({ 
      error: "서버 에러",
      message: err.message 
    });
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
