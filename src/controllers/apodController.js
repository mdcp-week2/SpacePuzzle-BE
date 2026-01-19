const prisma = require("../prisma/client");

const APOD_REWARD_PARTS = 1;
const APOD_GRID_SIZE = 7;
const APOD_PUZZLE_TYPE = "jigsaw";

const apodCache = new Map();

const getDateKey = (date = new Date()) => date.toISOString().slice(0, 10);

const hashDateToSeed = (dateString) => {
  let hash = 0;
  for (let i = 0; i < dateString.length; i += 1) {
    hash = (hash * 31 + dateString.charCodeAt(i)) % 1_000_000_000;
  }
  return hash;
};

const fetchApodFromNasa = async () => {
  const apiKey = process.env.NASA_API_KEY;
  if (!apiKey) {
    throw new Error("NASA_API_KEY is not set");
  }

  const response = await fetch(
    `https://api.nasa.gov/planetary/apod?api_key=${apiKey}`
  );

  if (!response.ok) {
    throw new Error(`NASA API error: ${response.status}`);
  }

  return response.json();
};

const getTodayApod = async () => {
  const todayKey = getDateKey();
  if (apodCache.has(todayKey)) {
    return apodCache.get(todayKey);
  }

  const data = await fetchApodFromNasa();
  apodCache.set(todayKey, data);
  return data;
};

const ensureApodPuzzle = async (apodData) => {
  if (!apodData || apodData.media_type !== "image") {
    return null;
  }

  const seed = hashDateToSeed(apodData.date);
  const puzzleConfig = {
    gridSize: APOD_GRID_SIZE,
    seed
  };

  const existing = await prisma.apod.findUnique({
    where: { date: apodData.date }
  });

  if (existing) {
    return existing;
  }

  return prisma.apod.create({
    data: {
      date: apodData.date,
      title: apodData.title,
      description: apodData.explanation,
      imageUrl: apodData.hdurl || apodData.url,
      puzzleType: APOD_PUZZLE_TYPE,
      difficulty: "special",
      puzzleSeed: seed,
      puzzleConfig
    }
  });
};

const getTodayApodHandler = async (req, res) => {
  try {
    const apodData = await getTodayApod();
    await ensureApodPuzzle(apodData);

    res.json({
      date: apodData.date,
      title: apodData.title,
      explanation: apodData.explanation,
      url: apodData.url,
      hdurl: apodData.hdurl,
      media_type: apodData.media_type,
      copyright: apodData.copyright
    });
  } catch (err) {
    console.error(err);
    res.status(502).json({
      error: "APOD data not available",
      message: "Failed to fetch APOD from NASA API"
    });
  }
};

const completeApodPuzzle = async (req, res) => {
  try {
    const { playTime, date, title } = req.body || {};

    if (!date) {
      return res.status(400).json({ error: "date가 필요합니다." });
    }

    const apod = await prisma.apod.findUnique({ where: { date } });
    if (!apod) {
      return res.status(404).json({ error: "APOD 데이터가 없습니다." });
    }

    const recordKey = {
      userId: req.authUser.id,
      apodDate: date,
      puzzleType: APOD_PUZZLE_TYPE
    };

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.gameRecord.findUnique({
        where: {
          userId_apodDate_puzzleType: recordKey
        }
      });

      const isFirstClear = !existing?.isCompleted;
      const bestTime =
        typeof playTime === "number" && playTime > 0
          ? Math.min(existing?.bestTime ?? playTime, playTime)
          : existing?.bestTime ?? null;

      const updatedRecord = await tx.gameRecord.upsert({
        where: {
          userId_apodDate_puzzleType: recordKey
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
            parts: { increment: APOD_REWARD_PARTS },
            total_clears: { increment: 1 }
          }
        });
      }

      return { updatedRecord, updatedUser, isFirstClear };
    });

    res.json({
      success: true,
      message: "APOD puzzle completed successfully",
      data: {
        userId: req.authUser.id,
        apodDate: date,
        apodTitle: title || apod.title,
        playTime: typeof playTime === "number" ? playTime : null,
        completedAt: result.updatedRecord.completedAt,
        rewardParts: result.isFirstClear ? APOD_REWARD_PARTS : 0
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "서버 에러" });
  }
};

const getApodPuzzle = async (req, res) => {
  try {
    const apodData = await getTodayApod();
    
    if (apodData.media_type !== "image") {
      return res.status(400).json({ 
        error: "오늘의 APOD는 이미지가 아닙니다." 
      });
    }

    const apod = await ensureApodPuzzle(apodData);
    
    if (!apod) {
      return res.status(404).json({ error: "APOD 퍼즐을 찾을 수 없습니다." });
    }

    res.json({
      id: apod.id,
      date: apod.date,
      title: apod.title,
      description: apod.description,
      imageUrl: apod.imageUrl,
      puzzleType: apod.puzzleType,
      difficulty: apod.difficulty,
      gridSize: APOD_GRID_SIZE,
      puzzleSeed: apod.puzzleSeed,
      puzzleConfig: apod.puzzleConfig
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "서버 에러" });
  }
};

module.exports = {
  getTodayApodHandler,
  completeApodPuzzle,
  getApodPuzzle
};
