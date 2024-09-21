const expressAsyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const User = require("../model/user");

module.exports.isAuthenticated = (req, res, next) => {
  try {
    const bearerToken = req.headers.authorization;

    if (typeof bearerToken !== "undefined") {
      const token = bearerToken.split(" ")[1];
      jwt.verify(token, process.env.SECRET, async (err, authData) => {
        if (err) {
          console.log(err);
          return res.status(403).json({
            success: false,
            message: "Token Expired",
          });
        } else {
          req.headers.authData = authData; // Attaching payload on successful token verification to req.headers
          const userAuthenticated = await User.findById(authData.userId);
          req.userAuthenticated = userAuthenticated; // Sending userAuthenticated as requset object

          // checking if the user exists on database
          if (!userAuthenticated) {
            return res.status(404).json({
              message: "logged in user not found",
            });
          }
          next();
        }
      });
    } else {
      console.log("smthng went wrong validating token");
      return res.status(403).json({
        message: "token not found",
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: error,
    });
  }
};

// check if user is suspended and unsuspending if account has served its time
module.exports.isSuspended = expressAsyncHandler(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.json({ message: "Invalid Credentials" });
  }

  req.requestingUser = user;

  console.log(user.suspended, Date.now());

  // check if user is suspended
  if (user.suspended && user.suspended > Date.now()) {
    const minutes = (new Date(user.suspended) - Date.now()) / 1000 / 60;
    console.log("time remaining ", minutes, " minutes");
    return res.status(403).json({
      message: "Account suspended try again later",
    });
  } else if (
    user.suspended &&
    new Date(user.suspended).getTime() < Date.now()
  ) {
    user.suspended = null;
    user.loginAttempt = 0;
    await user.save();
    console.log("unsuspended account");
  }
  next();
});
