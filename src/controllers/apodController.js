const prisma = require("../prisma/client");
const { supabase } = require("../services/supabase");

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
  
  // 메모리 캐시 확인
  if (apodCache.has(todayKey)) {
    return apodCache.get(todayKey);
  }

  // DB에 저장된 데이터가 있으면 NASA API 호출하지 않고 DB에서 반환
  const existingApod = await prisma.apod.findUnique({
    where: { date: todayKey }
  });

  if (existingApod) {
    // DB 데이터를 NASA API 형식으로 변환
    const cachedData = {
      date: existingApod.date,
      title: existingApod.title,
      explanation: existingApod.description,
      url: existingApod.imageUrl,
      hdurl: existingApod.imageUrl,
      media_type: "image",
      copyright: null
    };
    apodCache.set(todayKey, cachedData);
    return cachedData;
  }

  // DB에 없으면 NASA API 호출
  const data = await fetchApodFromNasa();
  apodCache.set(todayKey, data);
  return data;
};

// 버킷 존재 확인 및 생성 함수
const ensureBucketExists = async () => {
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Failed to list buckets:', listError);
      return false;
    }
    
    const bucketExists = buckets?.some(b => b.name === 'apod-images') || false;
    
    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket('apod-images', {
        public: true
      });
      
      if (createError && createError.message !== 'Bucket already exists') {
        console.error('Failed to create bucket:', createError);
        return false;
      }
    }
    
    return true;
  } catch (err) {
    console.error('ensureBucketExists error:', err);
    return false;
  }
};

// 이미지 다운로드 및 업로드 함수
const downloadAndUploadImage = async (nasaImageUrl, date) => {
  try {
    // 버킷 확인
    const bucketReady = await ensureBucketExists();
    if (!bucketReady) {
      console.warn('Bucket not ready, using NASA URL as fallback');
      return nasaImageUrl;
    }
    
    // NASA에서 이미지 다운로드
    const imageResponse = await fetch(nasaImageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBlob = Buffer.from(imageBuffer);
    
    // 파일 확장자 추출 (더 안전한 방법)
    const urlPath = new URL(nasaImageUrl).pathname;
    const extension = urlPath.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `apod/${date}.${extension}`;

    // Supabase Storage에 업로드
    const { data, error } = await supabase.storage
      .from('apod-images')
      .upload(fileName, imageBlob, {
        contentType: imageResponse.headers.get('content-type') || 'image/jpeg',
        upsert: true
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw error;
    }

    // Public URL 가져오기
    const { data: urlData } = supabase.storage
      .from('apod-images')
      .getPublicUrl(fileName);

    // Supabase getPublicUrl은 { publicUrl: string } 형태로 반환
    // 또는 직접 문자열을 반환할 수도 있음
    let publicUrl;
    if (typeof urlData === 'string') {
      publicUrl = urlData;
    } else if (urlData?.publicUrl) {
      publicUrl = urlData.publicUrl;
    } else {
      // URL 직접 구성 (fallback)
      const supabaseUrl = process.env.SUPABASE_URL;
      publicUrl = `${supabaseUrl}/storage/v1/object/public/apod-images/${fileName}`;
    }
    
    if (!publicUrl || publicUrl === nasaImageUrl) {
      console.warn('Failed to get public URL, using NASA URL');
      return nasaImageUrl;
    }

    console.log(`Image uploaded successfully: ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.error('Image upload error:', err);
    // 실패 시 원본 NASA URL 반환
    return nasaImageUrl;
  }
};

// APOD 퍼즐 생성/확인 함수
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

  // 기존 데이터가 있고 이미 Supabase URL을 가지고 있으면 그대로 반환
  if (existing) {
    // NASA URL을 가지고 있으면 Supabase Storage로 마이그레이션
    if (existing.imageUrl && existing.imageUrl.includes('apod.nasa.gov')) {
      console.log(`Migrating existing APOD image to Supabase: ${apodData.date}`);
      const nasaImageUrl = apodData.hdurl || apodData.url;
      const storedImageUrl = await downloadAndUploadImage(nasaImageUrl, apodData.date);
      
      // Supabase URL로 업데이트
      if (storedImageUrl && !storedImageUrl.includes('apod.nasa.gov')) {
        return prisma.apod.update({
          where: { date: apodData.date },
          data: { imageUrl: storedImageUrl }
        });
      }
    }
    return existing;
  }

  // NASA 이미지를 Supabase Storage에 업로드
  const nasaImageUrl = apodData.hdurl || apodData.url;
  const storedImageUrl = await downloadAndUploadImage(nasaImageUrl, apodData.date);

  return prisma.apod.create({
    data: {
      date: apodData.date,
      title: apodData.title,
      description: apodData.explanation,
      imageUrl: storedImageUrl,
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

// 이미지 프록시 API
const proxyImage = async (req, res) => {
  try {
    const imageUrl = req.query.url;

    if (!imageUrl) {
      return res.status(400).json({ error: "URL parameter is required" });
    }

    // URL 검증 (보안)
    let parsedUrl;
    try {
      parsedUrl = new URL(imageUrl);
    } catch (err) {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    // 허용된 도메인만 프록시 (보안 강화)
    const allowedDomains = ["apod.nasa.gov", "nasa.gov", "supabase.co"];
    const isAllowed = allowedDomains.some((domain) =>
      parsedUrl.hostname.includes(domain)
    );

    if (!isAllowed) {
      return res.status(403).json({ error: "Domain not allowed" });
    }

    console.log("🖼️ Proxying image:", imageUrl);

    // 원본 이미지 다운로드 (타임아웃 처리)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30초 타임아웃

    let imageResponse;
    try {
      imageResponse = await fetch(imageUrl, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        return res.status(504).json({ error: "Request timeout" });
      }
      throw err;
    }

    if (!imageResponse.ok) {
      return res.status(500).json({
        error: "Failed to download image",
        details: `HTTP ${imageResponse.status}`,
      });
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType =
      imageResponse.headers.get("content-type") || "image/jpeg";

    // 이미지 크기 제한 (10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (imageBuffer.byteLength > maxSize) {
      return res.status(413).json({ error: "Image too large (max 10MB)" });
    }

    // CORS 헤더 추가
    res.set("Content-Type", contentType);
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Cache-Control", "public, max-age=86400"); // 24시간 캐시
    res.set("Content-Length", imageBuffer.byteLength);

    // 이미지 데이터 반환
    res.send(Buffer.from(imageBuffer));

    console.log("✅ Image proxied successfully");
  } catch (err) {
    console.error("❌ Image proxy error:", err.message);
    res.status(500).json({
      error: "Failed to proxy image",
      details: err.message,
    });
  }
};

// APOD 리더보드 조회
const getApodLeaderboard = async (req, res) => {
  try {
    // 오늘 날짜의 APOD 리더보드 조회
    const todayDate = getDateKey();
    
    const apod = await prisma.apod.findUnique({
      where: { date: todayDate }
    });

    if (!apod) {
      return res.status(404).json({ error: "오늘의 APOD를 찾을 수 없습니다." });
    }

    // 오늘 날짜의 상위 5명 조회
    const topRecords = await prisma.gameRecord.findMany({
      where: {
        apodDate: todayDate,
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

    // 현재 사용자의 기록 조회
    const userRecord = await prisma.gameRecord.findUnique({
      where: {
        userId_apodDate_puzzleType: {
          userId: req.authUser.id,
          apodDate: todayDate,
          puzzleType: APOD_PUZZLE_TYPE
        }
      },
      include: {
        user: true
      }
    });

    // 현재 사용자의 순위 계산
    let userRank = null;
    if (userRecord?.bestTime !== null) {
      const betterCount = await prisma.gameRecord.count({
        where: {
          apodDate: todayDate,
          isCompleted: true,
          bestTime: { lt: userRecord.bestTime }
        }
      });
      userRank = betterCount + 1;
    }

    // 프론트엔드 요구사항에 맞는 형식으로 변환
    res.json({
      celestialId: "apod",
      celestialName: "APOD",
      topPlayers: topRecords.map((record, index) => ({
        userId: record.user.id,
        nickname: record.user.nickname,
        playTime: record.bestTime,
        starsEarned: 0, // APOD는 별을 주지 않음
        rank: index + 1,
        completedAt: record.completedAt
      })),
      myRank: userRecord?.bestTime
        ? {
            userId: userRecord.user.id,
            nickname: userRecord.user.nickname,
            playTime: userRecord.bestTime,
            starsEarned: 0,
            rank: userRank,
            completedAt: userRecord.completedAt
          }
        : null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "서버 에러" });
  }
};

module.exports = {
  getTodayApodHandler,
  completeApodPuzzle,
  getApodPuzzle,
  proxyImage,
  getApodLeaderboard,
};