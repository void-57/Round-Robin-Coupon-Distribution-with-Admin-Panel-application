import express from "express";
const router = express.Router();
import Coupon from "../models/Coupon.js";
import ClaimHistory from "../models/ClaimHistory.js";
import Admin from "../models/Admin.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import authMiddleware from "../jwt.js";

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const admin = await Admin.findOne({ username });
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", 
      sameSite: "strict",
      maxAge: 60 * 60 * 1000, 
    });

    res.json({ message: "Login successful" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/coupons", authMiddleware, async (req, res) => {
  try {
    const coupons = await Coupon.find();
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/add-coupon", authMiddleware, async (req, res) => {
  const { code } = req.body;

  try {
    const newCoupon = new Coupon({ code });
    await newCoupon.save();
    res.json({ message: "Coupon added successfully", coupon: newCoupon });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
});

router.put("/toggle-coupon/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();
    res.json({ message: "Coupon availability toggled", coupon });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/claim-history", authMiddleware, async (req, res) => {
  try {
    const claimHistory = await ClaimHistory.find();
    res.json(claimHistory);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.json({ message: "Logout successful" });
});

export default router;
