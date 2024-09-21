const route = require("express").Router();
const userController = require("../controller/userController");
const auth = require("../middleware/auth");
const pswdLinkValid = require("../middleware/verifyResetLink");

route.post("/register", userController.register);

route.get(
  "/getUserByToken",
  auth.isAuthenticated,
  userController.getUserByToken
);

route.post("/", auth.isSuspended, userController.login);

route.get(
  "/resend-key",
  auth.isAuthenticated,
  userController.resendVerificationLink
);

route.post("/verify", auth.isAuthenticated, userController.verifyAccount);

route.post(
  "/resetPassword",
  auth.isAuthenticated,
  userController.resetPassword
);

// sending password reset link to user
route.post("/forgetPassword", userController.sendPasswordResetLink);

// for verifying password reset link
route.post(
  "/verifyResetLink",
  pswdLinkValid.verifyResetLink,
  userController.verifyPasswordResetLink
);

route.post(
  "/setNewPassword",
  pswdLinkValid.verifyResetLink,
  userController.setNewPassword
);

module.exports = route;
