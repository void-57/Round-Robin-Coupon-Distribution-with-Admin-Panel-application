import mongoose from "mongoose";

const claimHistorySchema = new mongoose.Schema({
  couponCode: { type: String, required: true },
  claimedByIP: { type: String, required: true },
  claimedBySession: { type: String, required: true },
  claimedAt: { type: Date, default: Date.now },
});

const ClaimHistory = mongoose.model("ClaimHistory", claimHistorySchema);
export default ClaimHistory;
