const User = require("../model/user");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const axios = require("axios");

const nodemailer = require("nodemailer");

const Verification = require("../model/verification");

// token generator function
function generateToken(payload) {
  const token = jwt.sign(payload, process.env.SECRET, {
    expiresIn: "4h", // Token expiration time
  });
  return `Bearer ${token}`;
}

// verify recaptcha token function
async function verifyRecaptchaToken(recaptchaToken) {
  let success = false;
  let err = null;

  try {
    console.log("verifying captcha token");
    const response = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: recaptchaToken,
        },
      }
    );

    success = response.data.success;
  } catch (error) {
    err = error.message;
  }
  return { success, err }; // returning status object
}

// transporter for mail.
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS,
  },
});

// registering user
module.exports.register = asyncHandler(async (req, res) => {
  const { email, name, password, recaptchaToken } = req.body;

  if ((!email || !password || !name, !recaptchaToken)) {
    return res.status(400).json({
      success: false,
      message: "Please provide all required fields",
    });
  }

  // verifying recaptcha token recived from web client
  const { success, err } = await verifyRecaptchaToken(recaptchaToken);

  if (err) {
    return res.status(500).json({
      message: "error verifying reCaptcha token",
    });
  }

  if (success) {
    const userFound = await User.findOne({ email: email });

    // checking if user exists using provided email
    if (userFound) {
      return res.json({
        success: false,
        message: "Email already in use",
      });
    }

    console.log("registering user");

    // hashing password using bcrypt
    const hashedPassword = bcrypt.hashSync(password, 10);

    const newUser = new User({
      email,
      name,
      password: hashedPassword,
    });

    await newUser.save();

    // payload to generate json web token
    const payload = { userId: newUser._id.toString(), name: newUser.name };

    // generating token
    const token = generateToken(payload);

    // storing and generating verification link using verification document id
    const verificationForNewUser = new Verification({
      user_id: newUser.id,
      for: "account_verification",
      created: Date.now(),
    });

    await verificationForNewUser.save();

    const accountVerificationMailOptions = {
      from: process.env.EMAIL,
      to: email, // sending to user
      subject: "Verify Your Email to Create Your Account",
      text: "Finalize your account creation",
      // sending verification id to user mail using client_origin to handle verifying
      html: `<div>Click on this link to verify your account. <a href=${process.env.CLIENT_ORIGIN}/verification/${verificationForNewUser._id}>VERIFY MY ACCOUNT</a></div>`,
    };

    // sending verification link to user
    transporter.sendMail(
      accountVerificationMailOptions,
      function (error, info) {
        if (error) {
          console.log(error);
          return res.status(500).json({
            message: "SERVER ERROR",
          });
        } else {
          console.log("registered User and email sent " + info.response);
          res.json({
            success: true,
            message: "User Registered. Check your mail for verification link",
            user: {
              token,
              name: newUser.name,
              email: newUser.email,
              verified: newUser.verified,
            },
          });
        }
      }
    );
  } else {
    res.status(400).send("reCAPTCHA verification failed");
  }
});

// user login
module.exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const user = req.requestingUser;

  // validating password
  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    const loginAttempts = user.loginAttempt;
    user.loginAttempt = loginAttempts + 1;

    // suspending user on login attempts more than 5
    if (user.loginAttempt > 4) {
      user.suspended = Date.now() + 5 * 60 * 1000;
    }

    await user.save();
    console.log(user.loginAttempt);
    return res.status(401).json({ message: "Invalid password" });
  }

  // payload for jwt signing
  const payload = {
    userId: user._id.toString(),
    name: user.name,
    email: user.email,
  };
  if (user.picture) {
    payload.picture = user.picture;
  }

  // generating token passing payload
  const token = generateToken(payload);

  res.status(200).json({
    success: true,
    message: "Login successful",
    user: {
      token,
      name: user.name,
      email: user.email,
      verified: user.verified,
    },
  });
});

// getting user by token
module.exports.getUserByToken = asyncHandler(async (req, res) => {
  const userAuthenticated = req.userAuthenticated;

  if (userAuthenticated) {
    return res.json({
      success: true,
      message: "user resolved",
      user: {
        name: userAuthenticated.name,
        email: userAuthenticated.email,
        verified: userAuthenticated.verified,
        picture: userAuthenticated.picture ? userAuthenticated.picture : null,
      },
    });
  } else {
    return res.status(404).json({
      message: "user not found",
    });
  }
});

// to sent account verification link
module.exports.resendVerificationLink = asyncHandler(async (req, res) => {
  const { userId } = req.headers.authData;

  console.log("checking to resend");

  const userAuthenticated = req.userAuthenticated;

  if (userAuthenticated && userAuthenticated.verified) {
    console.log("user already verified");
    return res.json({
      success: true,
      message: "User Already Verified",
    });
  }

  if (userAuthenticated) {
    console.log("user Found");
    const prevVerifications = await Verification.find({ user_id: userId })
      .sort({ created: -1 })
      .limit(1);

    if (prevVerifications.length > 0) {
      // converting date to milliseconds to compare
      const dateCreated = prevVerifications[0].created;
      timestampInMs = dateCreated.getTime();

      // checking if 5 minutes have passed since creating last verification
      if (timestampInMs + 3 * 60 * 1000 > Date.now()) {
        console.log("wait for prev link to expire");
        const timeRemaining = timestampInMs + 3 * 60 * 1000 - Date.now();
        return res.json({
          success: false,
          timeRemaining,
          message: "Wait for your previous link to expire",
        });
      } else {
        console.log("deleting prev link");
        await Verification.deleteMany({ user_id: userId });
        console.log("deleted previous verifications");
      }
    }
    console.log("generating new verification link via id");
    const newVerification = new Verification({
      user_id: userAuthenticated._id,
      for: "account_verification",
      created: Date.now(),
    });
    await newVerification.save();

    // sending verification link again
    const accountVerificationMailOptions = {
      from: process.env.EMAIL,
      to: userAuthenticated.email, // sending to user
      subject: "Verify Your Email to Create Your Account",
      text: "Finalize your account creation",
      // sending verification id to user mail using client_origin to handle verifying
      html: `<div>Click on this link to verify your account. <a href=${process.env.CLIENT_ORIGIN}/verification/${newVerification._id} target="_blank">VERIFY MY ACCOUNT</a></div>`,
    };

    // sending verification link to user
    transporter.sendMail(
      accountVerificationMailOptions,
      function (error, info) {
        if (error) {
          return res.status(500).json({
            message: "SERVER ERROR",
          });
        } else {
          console.log("registered User and email sent " + info.response);
          res.json({
            success: true,
            message: "Verification Link Sent",
          });
        }
      }
    );
  } else {
    res.status(403).json({
      message: "not authorized",
    });
  }
});

// to verify user account on certain conditions
module.exports.verifyAccount = asyncHandler(async (req, res) => {
  const { verificationId } = req.body;

  const userAuthenticated = req.userAuthenticated;

  if (userAuthenticated && userAuthenticated.verified) {
    console.log("user already verified");
    return res.json({
      success: true,
      message: "User Already Verified",
    });
  }

  if (userAuthenticated) {
    // finding verification linked to user
    const keyVerified = await Verification.findOne({
      _id: verificationId,
      for: "account_verification",
      user_id: userAuthenticated._id,
    });

    console.log("key Found ", keyVerified);

    if (!keyVerified) {
      return res.json({
        message: "no key found. request link again",
      });
    }

    const keyCreationDateInMilliseconds = new Date(
      keyVerified.created
    ).getTime();

    // validating key if it is 5 minutes old
    const keyValid = keyCreationDateInMilliseconds + 5 * 60 * 5000 > Date.now();

    console.log("key validaty Status: ", keyValid);

    if (keyValid) {
      userAuthenticated.verified = true;
      await userAuthenticated.save();

      // Deleting verification linked with user on verifying
      await Verification.findByIdAndDelete(verificationId);

      res.json({
        success: true,
        message: "Account Verified",
        user: {
          name: userAuthenticated.name,
          email: userAuthenticated.email,
          verified: userAuthenticated.verified,
        },
      });
    } else {
      // clearing verifications linked to user on its expiry i.e 5 minutes
      await Verification.deleteMany({ user_id: userAuthenticated._id });
      return res.json({
        success: false,
        message: "validation link expired. Request Link",
      });
    }
  }
});

// password reset using old password
module.exports.resetPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = req.userAuthenticated;
  const match = await bcrypt.compare(currentPassword, user.password);

  console.log(match);
  if (match) {
    if (currentPassword === newPassword) {
      return res.json({
        success: false,
        message: "New Password cannot be same as Old password.",
      });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    res.json({
      success: true,
      message: "Password Updated",
    });
  } else {
    res.status(401).json({
      message: "Incorrect Password",
    });
  }
});

// password reset link generation
module.exports.sendPasswordResetLink = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const userFound = await User.findOne({ email: email });

  if (userFound) {
    let prevKeyValid = false;

    const prevKey = await Verification.findOne({ for: "password_reset" }).sort(
      "-created"
    );

    if (prevKey) {
      // check if verification key is still valid
      if (new Date(prevKey.created).getTime() + 5 * 60 * 1000 > Date.now()) {
        prevKeyValid = true;
      }
    }

    // sending reset link if previous verification is not valid
    if (!prevKeyValid) {
      const forgetPasswordVerification = new Verification({
        user_id: userFound._id,
        created: Date.now(),
        for: "password_reset",
      });
      await forgetPasswordVerification.save();

      // sending password reset link
      const accountVerificationMailOptions = {
        from: process.env.EMAIL,
        to: userFound.email, // sending to user
        subject: "Reset Password Link",
        // sending verification id to user mail using client_origin to handle verifying
        html: `<div>Click on this link to reset password of your account. <a href=${process.env.CLIENT_ORIGIN}/password_reset/${userFound._id}/${forgetPasswordVerification._id} target="_blank">RESET PASSWORD</a></div>`,
      };

      // sending verification link to user
      transporter.sendMail(
        accountVerificationMailOptions,
        function (error, info) {
          if (error) {
            return res.status(500).json({
              message: "SERVER ERROR",
            });
          } else {
            console.log("registered User and email sent " + info.response);
            return res.json({
              success: true,
              message: "Password reset Link Sent to your email address",
            });
          }
        }
      );
    } else {
      res.json({
        success: true,
        message: "password reset link already sent",
      });
    }
  } else {
    res.json({
      success: true,
      message: "password reset link will be sent if your account exists",
    });
  }
});

// checking if reset link is valid
module.exports.verifyPasswordResetLink = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: "please reset your password",
  });
});

// password reset using link
module.exports.setNewPassword = asyncHandler(async (req, res) => {
  const { newPassword, userId, resetKey } = req.body;

  console.log("resetting user password");

  const user = await User.findById(userId);

  if (!user) {
    res.status(404).json({
      message: "user not found",
    });
  }
  const hashedPassword = bcrypt.hashSync(newPassword, 10);

  console.log(hashedPassword);

  user.password = hashedPassword;

  // verifying user on password resetting if not verified
  if (!user.verified) {
    user.verified = true;
  }

  await user.save();

  await Verification.findByIdAndDelete(resetKey);

  res.json({
    success: true,
    message: "Login with your new password",
  });
});
