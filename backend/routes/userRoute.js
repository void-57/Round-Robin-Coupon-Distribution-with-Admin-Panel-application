import express from "express";
const router = express.Router();
import Coupon from "../models/Coupon.js";
import ClaimHistory from "../models/ClaimHistory.js";
import { v4 as uuidv4 } from "uuid";

const CLAIM_COOLDOWN = 2 * 60 * 1000;

const getClientIP = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  return forwarded ? forwarded.split(",")[0].trim() : req.socket.remoteAddress;
};

router.get("/init", (req, res) => {
  try {
    console.log("Checking for sessionId cookie...");
    if (!req.cookies.sessionId) {
      console.log("No sessionId found. Generating new sessionId...");
      const sessionId = uuidv4();

      res.cookie("sessionId", sessionId, {
        httpOnly: true,
        maxAge: CLAIM_COOLDOWN,
        domain: "localhost",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      console.log("sessionId cookie set:", sessionId);
    } else {
      console.log("Existing sessionId found:", req.cookies.sessionId);
    }
    res.json({ message: "Session initialized" });
  } catch (err) {
    console.error("Error in /init:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/claim-status", async (req, res) => {
  const ip = getClientIP(req);
  const sessionId = req.cookies.sessionId;

  if (!sessionId) {
    return res.status(400).json({ message: "Session ID not found" });
  }

  try {
    const recentClaim = await ClaimHistory.findOne({
      claimedByIP: ip,
      claimedAt: { $gt: new Date(Date.now() - CLAIM_COOLDOWN) },
    }).sort({ claimedAt: -1 });

    if (recentClaim) {
      const isCurrentSession = recentClaim.claimedBySession === sessionId;

      return res.json({
        claimed: true,
        message: isCurrentSession
          ? "You have already claimed a coupon in this session"
          : "Another claim was made from your IP address",
        coupon: isCurrentSession
          ? {
              code: recentClaim.couponCode,
              claimedAt: recentClaim.claimedAt,
            }
          : null,
      });
    }

    return res.json({ claimed: false });
  } catch (err) {
    console.error("Error checking claim status:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/claim-coupon", async (req, res) => {
  const ip = getClientIP(req);
  const sessionId = req.cookies.sessionId;

  if (!sessionId) {
    return res.status(400).json({ message: "Session ID not found" });
  }

  try {
    const recentClaim = await ClaimHistory.findOne({
      claimedByIP: ip,
      claimedAt: { $gt: new Date(Date.now() - CLAIM_COOLDOWN) },
    });
    if (recentClaim) {
      return res.status(400).json({
        message: "Please wait 2 minutes before claiming another coupon",
      });
    }

    const coupon = await Coupon.findOne({ isActive: true, isClaimed: false });
    if (!coupon) {
      return res.status(400).json({ message: "No coupons available" });
    }

    coupon.isClaimed = true;
    coupon.claimedBy = ip;
    coupon.claimedAt = new Date();
    await coupon.save();

    const claimHistory = new ClaimHistory({
      couponCode: coupon.code,
      claimedByIP: ip,
      claimedBySession: sessionId,
      claimedAt: new Date(),
    });
    await claimHistory.save();

    const nextClaimTime = new Date(Date.now() + CLAIM_COOLDOWN);

    res.json({
      message: "Coupon claimed successfully",
      coupon,
      nextClaimTime: nextClaimTime.toISOString(),
    });
  } catch (err) {
    console.error("Error claiming coupon:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/time-until-next-claim", async (req, res) => {
  const ip = getClientIP(req);

  try {
    const recentClaim = await ClaimHistory.findOne({
      claimedByIP: ip,
      claimedAt: { $gt: new Date(Date.now() - CLAIM_COOLDOWN) },
    }).sort({ claimedAt: -1 });

    if (recentClaim) {
      const claimTime = new Date(recentClaim.claimedAt).getTime();
      const nextClaimTime = new Date(claimTime + CLAIM_COOLDOWN);
      const timeRemaining = nextClaimTime.getTime() - Date.now();

      return res.json({
        canClaim: false,
        timeRemaining: timeRemaining,
        nextClaimTime: nextClaimTime.toISOString(),
      });
    }

    return res.json({
      canClaim: true,
      timeRemaining: 0,
      nextClaimTime: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error checking time until next claim:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
