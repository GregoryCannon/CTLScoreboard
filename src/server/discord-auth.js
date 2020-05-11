// Credit for most of this file goes to orel- on Github: https://github.com/orels1/discord-token-generator
const express = require("express");
const fetch = require("node-fetch");
const btoa = require("btoa");
const configData = require("./config_data");
const util = require("./util");
const logger = require("./logger");

/* Login flow:
  - User clicks link on CTL site (GET /discord-api/login)
  - User is redirected to Discord site and clicks "authorize"
  - Discord sends a request with a code to CTL Backend (/discord-api/authenticate)
  - CTL Backend sends a request to Discord API with the code and other things
  - Discord API responds with an auth token
  - CTL Backend sends a request to Discord API with the auth token
  - Discord API responds with user data
  - CTL Backend Hmac signs the user data and sends it to the frontend in a cookie
  - CTL Frontend loads the identity from cookies
  - CTL Frontend sends a request to CTL Backend (/discord-api/validate) to verify the identity
  - CTL Backend verifies the signature and responds
*/

const router = express.Router();
const CLIENT_ID = "672315783363166208";
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const redirect = encodeURIComponent(util.getApiUrl("discord-api/authenticate"));

/*
-------------------------
Helper Functions
-------------------------
*/

// Sign a string of text with a secret key, so that the server can verify that it hasn't changed
function hmacSign(rawText) {
  // Crypto is *NOT* reusable, so need to require it each time
  const cryptoHmac = require("crypto").createHmac(
    "sha256",
    process.env.ENCRYPTION_KEY
  );
  return cryptoHmac.update(rawText).digest("hex");
}

// Async/await error catcher
const catchAsyncErrors = fn => (req, res, next) => {
  const routePromise = fn(req, res, next);
  if (routePromise.catch) {
    routePromise.catch(err => next(err));
  }
};

// Check the access level of a discord user
function getPrivilegeLevel(discordIdentity) {
  if (configData.adminRole.includes(discordIdentity)) {
    return "Admin";
  } else if (configData.restreamerRole.includes(discordIdentity)) {
    return "Restreamer";
  }
  return "Player";
}

/*
-------------------
Request Handlers
-------------------
*/

// GET request for the initial forward of the user to Discord's site
router.get("/login", (req, res) => {
  logger.logRequest("Log in to Discord", req.body);
  logger.logResponseDescription("Redirecting to Oauth");
  res.redirect(
    `https://discordapp.com/api/oauth2/authorize?client_id=${CLIENT_ID}&scope=identify&response_type=code&redirect_uri=${redirect}`
  );
});

// GET request that Discord will redirect to with a code
router.get(
  "/authenticate",
  catchAsyncErrors(async (req, res) => {
    logger.logRequest("Authenticate (from Discord redirect)", req.body);
    if (!req.query.code) throw new Error("NoCodeProvided");

    // Get an auth token from Discord
    const code = req.query.code;
    const creds = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
    const response = await fetch(
      `https://discordapp.com/api/oauth2/token?grant_type=authorization_code&code=${code}&redirect_uri=${redirect}`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${creds}`
        }
      }
    );
    const authJson = await response.json();
    const token = authJson.access_token;
    logger.log("TOKEN:", token);

    // Get the USER object
    const userResponse = await fetch("https://discordapp.com/api/users/@me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const userJson = await userResponse.json();
    logger.log("USER JSON:", userJson);
    const discordIdentity = userJson.username + "#" + userJson.discriminator;

    logger.logResponseDescription(
      "Sending discord identity and signature in cookies, and redirecting to standings"
    );
    res.cookie("discordIdentity", discordIdentity);
    res.cookie("discordIdentitySignature", hmacSign(discordIdentity));
    res.redirect("/standings");
  })
);

// POST request for the frontend to validate identity saved in cookies
router.post("/validate", (req, res) => {
  logger.logRequest("Validate discord identity", req.body);
  const discordIdentity = req.body.discordIdentity;
  const discordIdentitySignature = req.body.discordIdentitySignature;

  if (hmacSign(discordIdentity) == discordIdentitySignature) {
    // All is good
    const responseBody = {
      valid: true,
      discordIdentity: discordIdentity,
      privilegeLevel: getPrivilegeLevel(discordIdentity)
    };
    logger.logResponse("Validate discord identity", responseBody);
    res.send(responseBody);
  } else {
    // Signature didn't match
    const responseBody = {
      valid: false,
      discordIdentity: "",
      privilegeLevel: ""
    };
    logger.logResponse("Validate discord identity", responseBody);
    res.send(responseBody);
  }
});

module.exports = {
  router
};
