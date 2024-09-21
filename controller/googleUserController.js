const expressAsyncHandler = require("express-async-handler");
const querystring = require("querystring");
const axios = require("axios");
const User = require("../model/user");

const bcrypt = require("bcryptjs");

// SETTING UP GOOGLE OAUTH

// const redirectURI = `"${process.env.SELF_ORIGIN}/googleoauth/callback"`;
const redirectURI = `${process.env.SELF_ORIGIN}/googleoauth/callback`;

const googleAuthAPI = "https://accounts.google.com/o/oauth2/auth";
const googleTokenAPI = "https://oauth2.googleapis.com/token";

module.exports.redirectToGoogleConsent = expressAsyncHandler(
  async (req, res) => {
    const queryParams = querystring.stringify({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: redirectURI,
      response_type: "code",
      scope:
        "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
      access_type: "offline",
      prompt: "consent",
    });

    // Redirect the user to Google's OAuth 2.0 consent screen
    res.redirect(`${googleAuthAPI}?${queryParams}`);
  }
);

module.exports.googleCallBackHandler = expressAsyncHandler(async (req, res) => {
  const { code } = req.query;

  try {
    // Step 3: Exchange authorization code for an access token
    const tokenResponse = await axios.post(
      googleTokenAPI,
      querystring.stringify({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_SECRET_KEY,
        redirect_uri: redirectURI,
        grant_type: "authorization_code",
      })
    );

    const { access_token } = tokenResponse.data;

    res.redirect(`${process.env.CLIENT_ORIGIN}/google/${access_token}`);
  } catch (error) {
    res.json({ error: "Error during OAuth process", details: error.message });
  }
});

module.exports.registerOauthUser = expressAsyncHandler(async (req, res) => {
  const { name, email, password, picture } = req.body;

  const userFound = await User.findOne({ email: email });

  if (userFound) {
    return res.json({
      message: "user already exists",
    });
  }

  const hashedpassword = bcrypt.hashSync(password, 10);

  const oauthUser = new User({
    email: email,
    name: name,
    password: hashedpassword,
    picture: picture,
    verified: true,
  });

  await oauthUser.save();

  res.json({
    success: true,
    message: "account created. please login again",
  });
});
