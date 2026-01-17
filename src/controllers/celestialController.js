const prisma = require("../prisma/client");

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
      locked
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

module.exports = {
  listBySector,
  getPuzzleForNasaId
};
