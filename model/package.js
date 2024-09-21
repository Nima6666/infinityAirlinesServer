const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema({
  service_name: { type: String, required: true },
  price: { type: Number, required: true },
  package_details: { type: String, required: true },
});

module.exports = mongoose.model("Package", packageSchema);
