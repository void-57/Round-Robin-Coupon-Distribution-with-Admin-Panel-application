import express from "express";
const router = express.Router();
import Coupon from "../models/Coupon.js";
import ClaimHistory from "../models/ClaimHistory.js";

const getClientIP = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  return forwarded ? forwarded.split(",")[0].trim() : req.socket.remoteAddress;
};

router.post("/claim-coupon", async (req, res) => {
  const ip = getClientIP(req);
  const sessionId = req.cookies.sessionId;

  if (!sessionId) {
    return res.status(400).json({ message: "Session ID not found" });
  }

  try {
    const recentClaim = await ClaimHistory.findOne({
      claimedByIP: ip,
      claimedAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    if (recentClaim) {
      return res
        .status(400)
        .json({ message: "You can only claim one coupon per day" });
    }

    const sessionClaim = await ClaimHistory.findOne({
      claimedBySession: sessionId,
    });
    if (sessionClaim) {
      return res
        .status(400)
        .json({ message: "You have already claimed a coupon in this session" });
    }

    const coupon = await Coupon.findOne({ isActive: true, isClaimed: false });
    if (!coupon) {
      return res.status(400).json({ message: "No coupons available" });
    }

    coupon.isClaimed = true;
    coupon.claimedBy = ip;
    coupon.claimedAt = Date.now();
    await coupon.save();

    const claimHistory = new ClaimHistory({
      couponCode: coupon.code,
      claimedByIP: ip,
      claimedBySession: sessionId,
    });
    await claimHistory.save();

    res.json({ message: "Coupon claimed successfully", coupon });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
