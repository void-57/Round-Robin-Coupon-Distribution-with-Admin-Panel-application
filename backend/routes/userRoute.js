import express from "express";
const router = express.Router();
import Coupon from "../models/Coupon.js";
import ClaimHistory from "../models/ClaimHistory.js";
import { v4 as uuidv4 } from "uuid";

const IP_COOLDOWN_MINUTES = 3;
const COOKIE_COOLDOWN_MINUTES = 2;

const getClientIp = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = req.headers["x-real-ip"];
  if (realIp) {
    return realIp;
  }

  const ip = req.socket.remoteAddress;
  if (ip === "::1" || ip === "::ffff:127.0.0.1") {
    return "127.0.0.1";
  }

  if (ip.startsWith("::ffff:")) {
    return ip.substring(7);
  }

  return ip;
};

router.get("/init", (req, res) => {
  if (!req.cookies.sessionId) {
    const sessionId = uuidv4();
    res.cookie("sessionId", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
  }
  res.json({ message: "Session initialized" });
});

router.get("/check-session", (req, res) => {
  res.json({ hasSession: !!req.cookies.sessionId });
});

router.get("/claim-status", async (req, res) => {
  const ip = getClientIp(req);
  const sessionId = req.cookies.sessionId;

  if (!sessionId) {
    return res.status(400).json({ message: "Session ID not found" });
  }

  try {
    const recentClaim = await ClaimHistory.findOne({
      claimedByIP: ip,
      claimedAt: { $gt: new Date(Date.now() - IP_COOLDOWN_MINUTES * 60000) },
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

router.get("/time-until-next-claim", async (req, res) => {
  const ip = getClientIp(req);
  const sessionId = req.cookies.sessionId;

  if (!sessionId) {
    return res.status(400).json({ message: "Session ID not found" });
  }

  try {
    
    const lastIpClaim = await ClaimHistory.findOne({
      claimedByIP: ip,
      claimedAt: { $gt: new Date(Date.now() - IP_COOLDOWN_MINUTES * 60000) },
    }).sort({ claimedAt: -1 });

    const lastSessionClaim = await ClaimHistory.findOne({
      claimedBySession: sessionId,
      claimedAt: {
        $gt: new Date(Date.now() - COOKIE_COOLDOWN_MINUTES * 60000),
      },
    }).sort({ claimedAt: -1 });

    const now = Date.now();
    let cookieNextClaimTime = null;
    let ipNextClaimTime = null;

    if (lastSessionClaim) {
      cookieNextClaimTime = new Date(
        lastSessionClaim.claimedAt.getTime() + COOKIE_COOLDOWN_MINUTES * 60000
      );
    }

    if (lastIpClaim) {
      ipNextClaimTime = new Date(
        lastIpClaim.claimedAt.getTime() + IP_COOLDOWN_MINUTES * 60000
      );
    }

    const canClaim =
      (!cookieNextClaimTime || now >= cookieNextClaimTime.getTime()) &&
      (!ipNextClaimTime || now >= ipNextClaimTime.getTime());

    res.json({
      canClaim,
      nextClaimTime: cookieNextClaimTime?.toISOString() || null,
      ipCooldownTime: ipNextClaimTime?.toISOString() || null,
    });
  } catch (err) {
    console.error("Error checking time until next claim:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/claim-coupon", async (req, res) => {
  const ip = getClientIp(req);
  const sessionId = req.cookies.sessionId;

  if (!sessionId) {
    return res.status(400).json({ message: "Session ID not found" });
  }

  try {
    const lastIpClaim = await ClaimHistory.findOne({
      claimedByIP: ip,
      claimedAt: { $gt: new Date(Date.now() - IP_COOLDOWN_MINUTES * 60000) },
    }).sort({ claimedAt: -1 });

    if (lastIpClaim) {
      const ipNextClaimTime = new Date(
        lastIpClaim.claimedAt.getTime() + IP_COOLDOWN_MINUTES * 60000
      );
      return res.status(429).json({
        message: "Please wait for the IP cooldown to end",
        ipCooldownTime: ipNextClaimTime.toISOString(),
      });
    }

    const lastSessionClaim = await ClaimHistory.findOne({
      claimedBySession: sessionId,
      claimedAt: {
        $gt: new Date(Date.now() - COOKIE_COOLDOWN_MINUTES * 60000),
      },
    }).sort({ claimedAt: -1 });

    if (lastSessionClaim) {
      const cookieNextClaimTime = new Date(
        lastSessionClaim.claimedAt.getTime() + COOKIE_COOLDOWN_MINUTES * 60000
      );
      return res.status(429).json({
        message: "Please wait for the cookie cooldown to end",
        nextClaimTime: cookieNextClaimTime.toISOString(),
      });
    }

    const coupon = await Coupon.findOne({ isActive: true, isClaimed: false });
    if (!coupon) {
      return res.status(404).json({ message: "No coupons available" });
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

    const now = new Date();
    res.json({
      message: "Coupon claimed successfully",
      coupon: {
        code: coupon.code,
        claimedAt: coupon.claimedAt,
      },
      nextClaimTime: new Date(
        now.getTime() + COOKIE_COOLDOWN_MINUTES * 60000
      ).toISOString(),
      ipCooldownTime: new Date(
        now.getTime() + IP_COOLDOWN_MINUTES * 60000
      ).toISOString(),
    });
  } catch (err) {
    console.error("Error claiming coupon:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
