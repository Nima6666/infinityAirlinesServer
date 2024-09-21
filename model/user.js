const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  loginAttempt: { type: Number, required: true, default: 0 },
  suspended: { type: Date, default: null },
  verified: { type: Boolean, default: false },
  picture: { type: String },
});

module.exports = mongoose.model("User", userSchema);
