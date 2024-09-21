const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Package",
    required: true,
  },
  paymentSession: { type: String, default: null },
  paymentSuccess: { type: Boolean, default: false },
  quantity: { type: Number, required: true },
  total: { type: Number, required: true },
  created: { type: Date, default: Date.now },
  completed: { type: Boolean, default: false },
});

module.exports = mongoose.model("payment", paymentSchema);
