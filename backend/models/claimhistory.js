import mongoose from "mongoose";

const claimHistorySchema = new mongoose.Schema({
  couponCode: { type: String, required: true },
  claimedByIP: { type: String, required: true, index: true },
  claimedBySession: { type: String, required: true },
  claimedAt: { type: Date, default: Date.now, index: true },
});

claimHistorySchema.index({ claimedByIP: 1, claimedAt: -1 });

const ClaimHistory = mongoose.model("ClaimHistory", claimHistorySchema);
export default ClaimHistory;
