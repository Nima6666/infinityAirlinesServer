const route = require("express").Router();
const paymentController = require("../controller/paymentController");
const auth = require("../middleware/auth");

// creating stripe session
route.post(
  "/create-stripe-session",
  auth.isAuthenticated,
  paymentController.createStripeSession
);

route.get(
  "/verify-payment/:paymentId/:sessionId",
  auth.isAuthenticated,
  paymentController.verifyStripeSession
);

route.get("/", auth.isAuthenticated, paymentController.getUserPayments);

module.exports = route;
