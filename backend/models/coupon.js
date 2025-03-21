import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    isClaimed: { type: Boolean, default: false },
    claimedBy: { type: String, default: null },
    claimedAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true }
  });
  
    const Coupon = mongoose.model("Coupon", couponSchema);
    export default Coupon;