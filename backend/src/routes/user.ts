import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../db";

const router = Router();

const IP_COOLDOWN_MINUTES = 3;
const COOKIE_COOLDOWN_MINUTES = 2;

// Helper function to get real IP address
const getClientIp = (req: any): string => {
  // Check X-Forwarded-For header
  const forwardedFor = req.headers["x-forwarded-for"];
  if (forwardedFor) {
    // Get the first IP if multiple are present
    return forwardedFor.split(",")[0].trim();
  }

  // Check X-Real-IP header
  const realIp = req.headers["x-real-ip"];
  if (realIp) {
    return realIp;
  }

  // Handle both IPv4 and IPv6
  const ip = req.ip;
  // If it's IPv6 localhost, convert to IPv4 localhost
  if (ip === "::1" || ip === "::ffff:127.0.0.1") {
    return "127.0.0.1";
  }

  // Remove IPv6 prefix if present
  if (ip.startsWith("::ffff:")) {
    return ip.substring(7);
  }

  return ip;
};

router.get("/init", (req, res) => {
  if (!req.session.userId) {
    req.session.userId = uuidv4();
  }
  res.json({ message: "Session initialized", userId: req.session.userId });
});

router.get("/check-session", (req, res) => {
  res.json({ hasSession: !!req.session.userId });
});

router.get("/claim-status", async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ message: "No session found" });
    }

    const claim = await prisma.claim.findFirst({
      where: { userId },
      orderBy: { claimedAt: "desc" },
      include: { coupon: true },
    });

    if (!claim) {
      return res.json({ claimed: false });
    }

    res.json({
      claimed: true,
      coupon: claim.coupon,
      message: "Coupon already claimed",
    });
  } catch (error) {
    console.error("Error checking claim status:", error);
    res.status(500).json({ message: "Failed to check claim status" });
  }
});

router.get("/time-until-next-claim", async (req, res) => {
  const userId = req.session.userId;
  const userIp = getClientIp(req);

  if (!userId) {
    return res.status(401).json({ message: "No session found" });
  }

  const now = new Date();
  let cookieNextClaimTime: Date | null = null;
  let ipNextClaimTime: Date | null = null;

  // Check cookie cooldown from session
  const lastClaimTime = req.session.lastClaimTime;
  if (lastClaimTime) {
    cookieNextClaimTime = new Date(lastClaimTime);
    cookieNextClaimTime.setMinutes(
      cookieNextClaimTime.getMinutes() + COOKIE_COOLDOWN_MINUTES
    );
  }

  // Check IP cooldown from claim history
  const lastIpClaim = await prisma.claim.findFirst({
    where: {
      ip: userIp,
      claimedAt: {
        gte: new Date(now.getTime() - IP_COOLDOWN_MINUTES * 60000),
      },
    },
    orderBy: { claimedAt: "desc" },
  });

  if (lastIpClaim) {
    ipNextClaimTime = new Date(lastIpClaim.claimedAt);
    ipNextClaimTime.setMinutes(
      ipNextClaimTime.getMinutes() + IP_COOLDOWN_MINUTES
    );
  }

  // User can only claim if BOTH cooldowns have expired
  const canClaim =
    (!cookieNextClaimTime || now >= cookieNextClaimTime) &&
    (!ipNextClaimTime || now >= ipNextClaimTime);

  // Always send both cooldown times if either exists
  res.json({
    canClaim,
    nextClaimTime: cookieNextClaimTime?.toISOString() || null,
    ipCooldownTime: ipNextClaimTime?.toISOString() || null,
  });
});

router.post("/claim-coupon", async (req, res) => {
  try {
    const userId = req.session.userId;
    const userIp = getClientIp(req);

    if (!userId) {
      return res.status(401).json({ message: "No session found" });
    }

    const now = new Date();
    let cookieNextClaimTime: Date | null = null;
    let ipNextClaimTime: Date | null = null;

    // Check cookie cooldown from session
    const lastClaimTime = req.session.lastClaimTime;
    if (lastClaimTime) {
      cookieNextClaimTime = new Date(lastClaimTime);
      cookieNextClaimTime.setMinutes(
        cookieNextClaimTime.getMinutes() + COOKIE_COOLDOWN_MINUTES
      );

      if (now < cookieNextClaimTime) {
        return res.status(429).json({
          message: "Please wait for the cookie cooldown to end",
          nextClaimTime: cookieNextClaimTime.toISOString(),
          ipCooldownTime: ipNextClaimTime?.toISOString(),
        });
      }
    }

    // Check IP cooldown from claim history with normalized IP
    const lastIpClaim = await prisma.claim.findFirst({
      where: {
        ip: userIp,
        claimedAt: {
          gte: new Date(now.getTime() - IP_COOLDOWN_MINUTES * 60000),
        },
      },
      orderBy: { claimedAt: "desc" },
    });

    if (lastIpClaim) {
      ipNextClaimTime = new Date(lastIpClaim.claimedAt);
      ipNextClaimTime.setMinutes(
        ipNextClaimTime.getMinutes() + IP_COOLDOWN_MINUTES
      );

      if (now < ipNextClaimTime) {
        return res.status(429).json({
          message: "Please wait for the IP cooldown to end",
          nextClaimTime: cookieNextClaimTime?.toISOString(),
          ipCooldownTime: ipNextClaimTime.toISOString(),
        });
      }
    }

    // Find an available coupon
    const availableCoupon = await prisma.coupon.findFirst({
      where: { claimed: false },
    });

    if (!availableCoupon) {
      return res.status(404).json({ message: "No coupons available" });
    }

    // Create claim record with normalized IP address
    const claim = await prisma.claim.create({
      data: {
        userId,
        ip: userIp,
        couponId: availableCoupon.id,
      },
      include: {
        coupon: true,
      },
    });

    // Update coupon status
    await prisma.coupon.update({
      where: { id: availableCoupon.id },
      data: { claimed: true },
    });

    // Set cookie cooldown time
    req.session.lastClaimTime = now;

    res.json({
      message: "Coupon claimed successfully",
      coupon: claim.coupon,
      nextClaimTime: new Date(
        now.getTime() + COOKIE_COOLDOWN_MINUTES * 60000
      ).toISOString(),
      ipCooldownTime: new Date(
        now.getTime() + IP_COOLDOWN_MINUTES * 60000
      ).toISOString(),
    });
  } catch (error) {
    console.error("Error claiming coupon:", error);
    res.status(500).json({ message: "Failed to claim coupon" });
  }
});
