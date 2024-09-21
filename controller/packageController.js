const Package = require("../model/package");
const asyncHandler = require("express-async-handler");

module.exports.getPackages = asyncHandler(async (req, res) => {
  const packages = await Package.find({});
  return res.json({
    success: true,
    packages,
  });
});

module.exports.bookPackages = asyncHandler(async (req, res) => {});
