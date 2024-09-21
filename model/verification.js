const mongoose = require("mongoose");

const verificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  for: {
    type: String,
    enum: ["password_reset", "account_verification"],
    required: true,
  },
  created: { type: Date, default: null },
});

module.exports = mongoose.model("verification", verificationSchema);
