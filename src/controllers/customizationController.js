const prisma = require("../prisma/client");

const DEFAULT_POSITION = { x: 0, y: 0, z: 0 };
const DEFAULT_ROTATION = { x: 0, y: 0, z: 0 };

const getCustomization = async (req, res) => {
  try {
    const items = await prisma.userItem.findMany({
      where: { userId: req.authUser.id },
      include: { item: true }
    });

    const background = items.find(
      (entry) => entry.item.type === "background" && entry.isEquipped
    );
    const cockpit = items.find(
      (entry) => entry.item.type === "cockpit" && entry.isEquipped
    );
    const placed = items.filter(
      (entry) => entry.item.type === "placeable" && entry.isEquipped
    );

    res.json({
      background: background?.item.id || "bg_default",
      cockpit: cockpit?.item.id || "cockpit_default",
      items: placed.map((entry) => ({
        itemId: entry.item.id,
        position: entry.position,
        rotation: entry.rotation
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "서버 에러" });
  }
};

const setCustomization = async (req, res) => {
  try {
    const { type, itemId } = req.body || {};

    if (!type || !itemId) {
      return res
        .status(400)
        .json({ success: false, message: "type과 itemId가 필요합니다." });
    }

    if (type !== "background" && type !== "cockpit") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid item type" });
    }

    const userItem = await prisma.userItem.findFirst({
      where: { userId: req.authUser.id, itemId },
      include: { item: true }
    });

    if (!userItem) {
      return res
        .status(400)
        .json({ success: false, message: "Item not purchased" });
    }

    if (userItem.item.type !== type) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid item type" });
    }

    await prisma.$transaction([
      prisma.userItem.updateMany({
        where: {
          userId: req.authUser.id,
          item: { type }
        },
        data: { isEquipped: false }
      }),
      prisma.userItem.update({
        where: { id: userItem.id },
        data: { isEquipped: true }
      })
    ]);

    res.json({
      success: true,
      message: "Customization updated",
      currentBackground: type === "background" ? itemId : undefined,
      currentCockpit: type === "cockpit" ? itemId : undefined
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "서버 에러" });
  }
};

const placeItem = async (req, res) => {
  try {
    const { itemId, x, y, z, rotation } = req.body || {};

    if (!itemId || typeof x !== "number" || typeof y !== "number") {
      return res
        .status(400)
        .json({ success: false, message: "itemId, x, y가 필요합니다." });
    }

    const userItem = await prisma.userItem.findFirst({
      where: { userId: req.authUser.id, itemId },
      include: { item: true }
    });

    if (!userItem) {
      return res
        .status(400)
        .json({ success: false, message: "Item not purchased" });
    }

    if (userItem.item.type !== "placeable") {
      return res
        .status(400)
        .json({ success: false, message: "Item is not placeable" });
    }

    const updated = await prisma.userItem.update({
      where: { id: userItem.id },
      data: {
        isEquipped: true,
        position: {
          x,
          y,
          z: typeof z === "number" ? z : DEFAULT_POSITION.z
        },
        rotation: rotation || DEFAULT_ROTATION
      }
    });

    res.json({
      success: true,
      message: "Item placed",
      items: [
        {
          itemId: userItem.item.id,
          position: updated.position,
          rotation: updated.rotation
        }
      ]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "서버 에러" });
  }
};

const removeItem = async (req, res) => {
  try {
    const { itemId } = req.body || {};

    if (!itemId) {
      return res
        .status(400)
        .json({ success: false, message: "itemId가 필요합니다." });
    }

    const userItem = await prisma.userItem.findFirst({
      where: { userId: req.authUser.id, itemId },
      include: { item: true }
    });

    if (!userItem) {
      return res
        .status(400)
        .json({ success: false, message: "Item not purchased" });
    }

    if (userItem.item.type !== "placeable") {
      return res
        .status(400)
        .json({ success: false, message: "Item is not placeable" });
    }

    const updated = await prisma.userItem.update({
      where: { id: userItem.id },
      data: {
        isEquipped: false
      }
    });

    res.json({
      success: true,
      message: "Item removed",
      items: [
        {
          itemId: userItem.item.id,
          position: updated.position,
          rotation: updated.rotation
        }
      ]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "서버 에러" });
  }
};

module.exports = {
  getCustomization,
  setCustomization,
  placeItem,
  removeItem
};
