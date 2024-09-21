const route = require("express").Router();
const packageController = require("../controller/packageController");

route.get("/", packageController.getPackages);

// route.get("/:id", packageController.getPackage);

module.exports = route;
