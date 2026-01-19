const prisma = require("../prisma/client");

const getPurchasedItems = async (req, res) => {
  try {
    const items = await prisma.userItem.findMany({
      where: { userId: req.authUser.id },
      include: { item: true }
    });

    res.json({
      items: items.map((entry) => entry.item.id)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "서버 에러" });
  }
};

const purchaseItem = async (req, res) => {
  try {
    const { itemId } = req.body || {};

    if (!itemId) {
      return res.status(400).json({ success: false, message: "itemId가 필요합니다." });
    }

    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    if (!item.priceType || typeof item.priceAmount !== "number") {
      return res
        .status(400)
        .json({ success: false, message: "Item pricing is not configured" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.userItem.findFirst({
        where: { userId: req.authUser.id, itemId }
      });

      if (existing) {
        return { error: "Item already purchased" };
      }

      const user = await tx.user.findUnique({
        where: { id: req.authUser.id }
      });

      if (!user) {
        return { error: "User not found" };
      }

      if (item.priceType === "credits" && user.credits < item.priceAmount) {
        return { error: "Insufficient credits" };
      }
      if (item.priceType === "spaceParts" && user.parts < item.priceAmount) {
        return { error: "Insufficient space parts" };
      }

      await tx.userItem.create({
        data: {
          userId: req.authUser.id,
          itemId
        }
      });

      const updatedUser = await tx.user.update({
        where: { id: req.authUser.id },
        data:
          item.priceType === "credits"
            ? { credits: { decrement: item.priceAmount } }
            : { parts: { decrement: item.priceAmount } }
      });

      return {
        remainingCredits: updatedUser.credits,
        remainingStars: updatedUser.stars,
        remainingSpaceParts: updatedUser.parts
      };
    });

    if (result.error) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      message: "Item purchased successfully",
      itemId,
      remainingCredits: result.remainingCredits,
      remainingStars: result.remainingStars,
      remainingSpaceParts: result.remainingSpaceParts
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "서버 에러" });
  }
};

module.exports = {
  getPurchasedItems,
  purchaseItem
};
