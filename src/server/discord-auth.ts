// Credit for most of this file goes to orel- on Github: https://github.com/orels1/discord-token-generator
import {
  Router,
  type Request,
  type Response,
  type NextFunction,
  type RequestHandler
} from "express";
import fetch from "node-fetch";
import FormData from "form-data";
import { adminRole, restreamerRole } from "./config_data.ts";
import { log, logRequest, logResponse, logResponseDescription } from "./logger.ts";
import crypto from "crypto";
import type { PrivilegeLevel } from "../types.ts";

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

const router = Router();
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
// const REDIRECT_URL = encodeURIComponent(process.env.API_BASE + "discord-api/authenticate");
const REDIRECT_URL = process.env.API_BASE
  ? process.env.API_BASE + "discord-api/authenticate"
  : "https://ctlscoreboard.herokuapp.com/discord-api/authenticate";

/*
-------------------------
Helper Functions
-------------------------
*/

// Sign a string of text with a secret key, so that the server can verify that it hasn't changed
function hmacSign(rawText: string): string {
  if (!process.env.ENCRYPTION_KEY)
    throw new Error("ENCRYPTION_KEY environment variable not found");
  const enc = new TextEncoder();
  const secretKey = enc.encode(process.env.ENCRYPTION_KEY);
  const cryptoHmac = crypto.createHmac("sha256", secretKey);
  return cryptoHmac.update(rawText).digest("hex");
}

// Async/await error catcher
const catchAsyncErrors = (fn: RequestHandler) => (req: Request, res: Response, next: NextFunction) => {
  const routePromise = fn(req, res, next) as unknown as Promise<void>;
  if (routePromise.catch) {
    routePromise.catch(err => next(err));
  }
};

// Check the access level of a discord user
function getPrivilegeLevel(discordIdentity: string): PrivilegeLevel {
  if (adminRole.includes(discordIdentity)) {
    return "Admin";
  } else if (restreamerRole.includes(discordIdentity)) {
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
  logRequest("Log in to Discord", req.body);
  logResponseDescription("Redirecting to Oauth");
  res.redirect(
    `https://discordapp.com/api/oauth2/authorize?client_id=${CLIENT_ID}&scope=identify&response_type=code&redirect_uri=${REDIRECT_URL}`
  );
});

// GET request that Discord will redirect to with a code
router.get(
  "/authenticate",
  catchAsyncErrors(async (req, res) => {
    logRequest("Authenticate (from Discord redirect)", req.body);
    if (!req.query.code) throw new Error("NoCodeProvided");

    // STAGE 0 - Get an auth code from the request
    const code = req.query.code;
    log("Auth code:", code as string);

    // STAGE 1 - Use the auth code to obtain a token
    const data = new FormData();
    data.append("client_id", CLIENT_ID);
    data.append("client_secret", CLIENT_SECRET);
    data.append("grant_type", "authorization_code");
    data.append("redirect_uri", REDIRECT_URL);
    data.append("scope", "identify");
    data.append("code", code);
    const tokenResult = await fetch("https://discordapp.com/api/oauth2/token", {
      method: "POST",
      body: data
    });
    const tokenJson = await tokenResult.json();
    const token = tokenJson.access_token;

    // If it fails to get a token
    if (token == undefined) {
      log("Failed to get access token");
      log("tokenJson", tokenJson);
      if (tokenResult.body !== undefined) {
        log("TokenResult:", await new Response(tokenResult.body as unknown as BodyInit).text());
      }
      return res.redirect("/standings");
    }

    // STAGE 2 - Use the token to get the User object
    const userResponse = await fetch("https://discordapp.com/api/users/@me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const userJson = await userResponse.json();
    log("USER JSON:", userJson);
    const discordIdentity = userJson.username + "#" + userJson.discriminator;

    logResponseDescription(
      "Sending discord identity and signature in cookies, and redirecting to standings"
    );
    res.cookie("discordIdentity", discordIdentity);
    res.cookie("discordIdentitySignature", hmacSign(discordIdentity));
    res.redirect("/standings");
  })
);

// POST request for the frontend to validate identity saved in cookies
router.post("/validate", (req, res) => {
  logRequest("Validate discord identity", req.body);
  const discordIdentity = req.body.discordIdentity;
  const discordIdentitySignature = req.body.discordIdentitySignature;

  if (
    hmacSign(discordIdentity) != discordIdentitySignature ||
    discordIdentity == "undefined#undefined"
  ) {
    // Signature didn't match
    const responseBody = {
      valid: false,
      discordIdentity: "",
      privilegeLevel: ""
    };
    logResponse("Validate discord identity", responseBody);
    res.send(responseBody);
  } else {
    // All is good
    const responseBody = {
      valid: true,
      discordIdentity: discordIdentity,
      privilegeLevel: getPrivilegeLevel(discordIdentity)
    };
    logResponse("Validate discord identity", responseBody);
    res.send(responseBody);
  }
});

export {
  router
};
