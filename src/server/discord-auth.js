// Credit for this file goes to orel- on Github: https://github.com/orels1/discord-token-generator

const express = require("express");
const fetch = require("node-fetch");
const btoa = require("btoa");

// async/await error catcher
const catchAsyncErrors = fn => (req, res, next) => {
  const routePromise = fn(req, res, next);
  if (routePromise.catch) {
    routePromise.catch(err => next(err));
  }
};

/* Login flow:
  - User clicks link on CTL site (GET /discord-api/login)
  - Redirected to Discord site
  - Discord sends a request with a code to /discord-api/authenticate
  - CTL Backend sends a request with the code and other things to discord API
  - Discord API responds with an auth token
  - CTL Backend saves the auth token to a cookie
  - CTL Backend redirects the user to the standings page, but logged in
*/

const router = express.Router();
const CLIENT_ID = "672315783363166208";
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const redirect = encodeURIComponent(
  "http://localhost:8080/discord-api/authenticate"
);

router.get("/login", (req, res) => {
  res.redirect(
    `https://discordapp.com/api/oauth2/authorize?client_id=${CLIENT_ID}&scope=identify&response_type=code&redirect_uri=${redirect}`
  );
});

router.get(
  "/authenticate",
  catchAsyncErrors(async (req, res) => {
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
    console.log("TOKEN:", token);

    // Get the USER object
    const userResponse = await fetch("https://discordapp.com/api/users/@me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const userJson = await userResponse.json();
    console.log("USER JSON:", userJson);
    const discordIdentity = userJson.username + "#" + userJson.discriminator;

    res.cookie("discordIdentity", discordIdentity);
    res.redirect("/standings");
  })
);

// // Create a router for discord api calls
// var discordRouter = express.Router();

// function makeAuthTokenRequest(code) {
//   var request = new XMLHttpRequest();
//   request.open("POST", API_ENDPOINT, true);
//   request.setRequestHeader("Content-type", "application/json");

//   const requestBody = {
//     client_id: CLIENT_ID,
//     client_secret: CLIENT_SECRET,
//     grant_type: "authorization_code",
//     code: code,
//     redirect_uri: REDIRECT_URI,
//     scope: "identify"
//   };

//   // Set callback for response
//   request.onload = function() {
//     console.log("Received response:", request.response);
//     const response = JSON.parse(request.response);
//     console.log("Parsed JSON", response);
//   }.bind(this);

//   console.log("Sending discord auth token request with body:", requestBody);
//   request.send(JSON.stringify(requestBody));
// }

// discordRouter.get("/authenticate", function(req, res) {
//   console.log("DISC - Received auth request with query:", req.query);
//   makeAuthTokenRequest(req.query.code);
//   res.redirect("/standings");
// });

// discordRouter.get("*", function(req, res) {
//   console.log("DISC - Received unknown get request", req);
// });

module.exports = {
  router
};
