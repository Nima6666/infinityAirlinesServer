const route = require("express").Router();

const googleController = require("../controller/googleUserController");

route.get("/", googleController.redirectToGoogleConsent);
route.get("/callback", googleController.googleCallBackHandler);

route.post("/register", googleController.registerOauthUser);

module.exports = route;
