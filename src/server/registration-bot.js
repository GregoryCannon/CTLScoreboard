const { Client, Intents } = require("discord.js");
const logger = require("./logger");
const { IS_PRODUCTION, getMatchDateFormatted } = require("./util");
const dataStoreId = IS_PRODUCTION ? "909993522780844062" : "908287705803280404";
const signUpChannelId = IS_PRODUCTION
  ? "911873148591431730"
  : "910408711900635146";
const commandChannelId = IS_PRODUCTION
  ? "672333164978372608"
  : "908284602173513731";
const reportingChannelId = IS_PRODUCTION
  ? "609133593289293835"
  : "912317693162577981";
let previousVodUrl = "";
let dataStoreChannel;
const MAIN_EMOJI = "👍";
const CANCEL_EMOJI = "❌";
const INFO_EMOJI = "ℹ️";
const LINE_ASCII = "—————————————————————————";
const DELAY_MS = 4000;
const HIDE_REACTION_DELAY_MS = 4000;
let DIVISIONS = {
  "1": [],
  "2": [],
  "3": [],
  "4": [],
  "5": [],
  "6": [],
  "7": [],
  "8": [],
  "9": []
};

const token = process.env.DISCORD_TOKEN;
const registrationBot = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS
  ]
});

/* ------------ Helper methods ------------- */
function formatUser(user) {
  return `${user.username}#${user.discriminator}`;
}

async function sleep(ms) {
  await new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

async function clearChannel(channel) {
  let toDelete;
  do {
    toDelete = await channel.messages.fetch({ limit: 100 });
    toDelete = toDelete.filter(msg => msg.author.bot);
    await channel.bulkDelete(toDelete);
  } while (toDelete.size >= 2);
}

function removeItemAll(arr, value) {
  var i = 0;
  while (i < arr.length) {
    if (arr[i] === value) {
      arr.splice(i, 1);
    } else {
      ++i;
    }
  }
  return arr;
}

/* ------------- Reporting-related helpers ---------------- */

function checkVodSameness(vodUrl, previousVodUrl) {
  if (vodUrl === previousVodUrl) {
    return "identical";
  } else if (vodUrl.split("?")[0] === previousVodUrl.split("?")[0]) {
    return "new timestamp";
  }
  return "different";
}

function formatMatch(match) {
  const formattedDate = getMatchDateFormatted(match);

  const vodSameness = checkVodSameness(match.vod_url, previousVodUrl);
  previousVodUrl = match.vod_url;
  const matchLine = `:fire: ${formattedDate} ${match.winner} def. ${match.loser} ${match.winner_games}-${match.loser_games}`;

  if (vodSameness === "different") {
    // New post
    return [
      `--------------------------------\n${match.restreamer} restreamed:\n${match.vod_url}`,
      matchLine
    ];
  } else if (vodSameness === "new timestamp") {
    // Post the VOD with no preview and the match results
    const vodUrlNoPreview = "<" + match.vod_url + ">";
    return [`${vodUrlNoPreview}\n${matchLine}`];
  } else if (vodSameness === "identical") {
    // Post just the match results
    return [matchLine];
  }
}

/* ------------- Data-related operations ------------ */

function getExistingDivision(formattedUser) {
  let registeredDiv = null;
  for (const [divisionName, playerList] of Object.entries(DIVISIONS)) {
    if (playerList.includes(formattedUser)) {
      registeredDiv = divisionName;
    }
  }
  return registeredDiv;
}

async function registerUsers(divisionName, formattedUserList) {
  for (const user of formattedUserList) {
    DIVISIONS[divisionName].push(user);
  }
  await updateRegistrationData();
}

async function registerUser(divisionName, formattedUser) {
  DIVISIONS[divisionName].push(formattedUser);
  await updateRegistrationData();
}

function deregisterUser(formattedUser) {
  let registeredDiv = null;
  for (const [divisionName, playerList] of Object.entries(DIVISIONS)) {
    removeItemAll(playerList, formattedUser);
  }
  return registeredDiv;
}

/** Attempts to deregister a list of users, and returns a list of those that weren't able to be removed. */
function deregisterUsers(divisionName, formattedUserList) {
  let notFound = [];
  const playerList = DIVISIONS[divisionName];
  if (!playerList) {
    return formattedUserList;
  }
  for (const name of formattedUserList) {
    if (playerList.includes(name)) {
      removeItemAll(playerList, name);
    } else {
      notFound.push(name);
    }
  }
  return notFound;
}

async function loadRegistrationData(channel) {
  const messages = await channel.messages.fetch();
  let msgArray = [];
  for (const [_, msg] of messages) {
    if (msg.author.bot){
      msgArray.push({
        content: msg.content,
        createdTimestamp: msg.createdTimestamp
      });
    }
  }
  msgArray = msgArray.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
  console.log(msgArray);

  if (messages.size >= 1) {
    let dataString = "";
    for (const message of msgArray) {
      dataString += message.content;
    }
    console.log("Loading from data string", dataString);

    try {
      DIVISIONS = JSON.parse(dataString);
    } catch (error) {
      console.error("Failed to parse player list JSON");
    }
  }
}

async function updateRegistrationData() {
  let msgString = JSON.stringify(DIVISIONS);
  msgString = msgString.replace(/,/g, ",\n");
  let splitMessages = msgString.match(/(.|[\r\n]){1,1000}/g); // Replace n with the size of the substring

  // Clear existing messages
  await dataStoreChannel.messages.fetch().then(msgs => {
    msgs.sort((a, b) => b.createdAt > a.createdAt);
    for (const [_, message] of msgs) {
      if (message.author.bot) {
        message.delete();
      }
    }
  });

  for (const msgContent of splitMessages) {
    await dataStoreChannel.send(msgContent);
  }
}

/* ------------- Message management ------------ */

async function configureSignUpMessages(channel) {
  // Reset the channel and send sign-up messages
  try {
    await clearChannel(channel);
  } catch (error) {
    console.error(error);
  }

  // Main registration section
  await channel.send(
    "React to sign up for a new division below! Your reaction will be hidden after 3 seconds.\n\nIf you are currently in a division, do not sign up here until both (1) 100% of your own matches have been completed, and (2) your division deadline is at the end of the current week or 100% of your division's matches have already been scheduled to happen by the end of the current week. Make sure your registration is for the correct tier and is current at 23:59 UTC each Sunday. New divisions will be created shortly thereafter and withdrawal after this point may be penalised. For full details, refer to #rules-and-standings.\n" +
      LINE_ASCII
  );
  for (const divisionName of Object.keys(DIVISIONS)) {
    const message = await channel.send(`Sign up for Division ${divisionName}`);
    await message.react(MAIN_EMOJI);
    const collector = message.createReactionCollector();
    collector.on("collect", () => {
      checkForReactions(divisionName, message);
    });

    await sleep(100);
  }

  // Check registration button
  const infoMsg = await channel.send(
    LINE_ASCII + "\nReact here to confirm whether you're registered"
  );
  infoMsg.react(INFO_EMOJI);
  const infoCollector = infoMsg.createReactionCollector();
  infoCollector.on("collect", () => {
    checkForInfoReacts(infoMsg);
  });

  // Cancel registration button
  const cancelMsg = await channel.send(
    "React here to cancel your registration"
  );
  await channel.send(LINE_ASCII);
  cancelMsg.react(CANCEL_EMOJI);
  const cancelCollector = cancelMsg.createReactionCollector();
  cancelCollector.on("collect", () => {
    checkForCancelReacts(cancelMsg);
  });
}

async function forEachReactionUser(message, consumerFunction) {
  // Get the reactions on that message
  for (const [_, reaction] of message.reactions.cache) {
    const users = await reaction.users.fetch();
    // Loop through the users that reacted
    for (const [_, user] of users) {
      if (!user.bot) {
        const nameFormatted = user.username + "#" + user.discriminator;
        console.log("FOUND REACTION:", nameFormatted);

        consumerFunction(user);
        // Schedule the reaction to be deleted
        setTimeout(() => {
          reaction.users.remove(user.id);
        }, HIDE_REACTION_DELAY_MS);
      }
    }
  }
}

async function sendTemporaryMessage(channel, messageText) {
  const confirmationMessage = await channel.send(messageText);
  setTimeout(() => {
    confirmationMessage.delete();
  }, DELAY_MS);
}

async function checkForReactions(divisionName, message) {
  console.log("Checking for reactions");

  forEachReactionUser(message, async user => {
    const formattedUser = formatUser(user);
    if (getExistingDivision(formattedUser) == null) {
      // Register the player
      await registerUser(divisionName, formattedUser);

      // Send a temporary confirmation message
      sendTemporaryMessage(
        message.channel,
        `${formatUser(user)} is now signed up for Division ${divisionName}.`
      );
    } else {
      // Send a temporary error message
      sendTemporaryMessage(
        message.channel,
        `${formatUser(
          user
        )} is already signed up. If you need to change divisions, cancel your registration and try again.`
      );
    }
  });
}

async function checkForCancelReacts(cancelMsg) {
  forEachReactionUser(cancelMsg, async user => {
    const formattedUser = formatUser(user);

    // Wipe the player from registration lists
    deregisterUser(formattedUser);
    await updateRegistrationData();

    // Send a confirmation message
    sendTemporaryMessage(
      cancelMsg.channel,
      `${formatUser(user)} is no longer registered.`
    );
  });
}

async function checkForInfoReacts(infoMsg) {
  forEachReactionUser(infoMsg, async user => {
    const formattedUser = formatUser(user);
    const existingDivision = getExistingDivision(formattedUser);
    if (existingDivision == null) {
      sendTemporaryMessage(
        infoMsg.channel,
        `${formattedUser} is not currently registered.`
      );
    } else {
      sendTemporaryMessage(
        infoMsg.channel,
        `${formattedUser} is currently registered for Division ${existingDivision}`
      );
    }
  });
}

registrationBot.once("ready", async () => {
  logger.log("Registration Bot is online!");

  // Maybe load data from data store channel
  dataStoreChannel = await registrationBot.channels.fetch(dataStoreId);
  loadRegistrationData(dataStoreChannel);

  registrationBot.channels.fetch(signUpChannelId).then(channel => {
    configureSignUpMessages(channel);
  });
});

// Incoming message handler
registrationBot.on("messageCreate", async msg => {
  if (msg.channel.id !== commandChannelId) {
    return;
  }

  console.log("got message:", msg.content);
  if (msg.content == "!who") {
    msg.channel.send(msg.author.username + "#" + msg.author.discriminator);
  }
  if (msg.content.includes("!add")) {
    const args = msg.content.split("!add ")[1];
    const divisionName = args.split(/ (.+)/)[0];
    const rest = args.split(/ (.+)/)[1];
    const newPlayers = rest.split(", ");

    registerUsers(divisionName, newPlayers);
    msg.channel.send(
      `Added ${newPlayers.length} players to division ${divisionName}.`
    );
  }

  if (msg.content.includes("!remove")) {
    const args = msg.content.split("!remove ")[1];
    const divisionName = args.split(/ (.+)/)[0];
    const rest = args.split(/ (.+)/)[1];
    const removedPlayers = rest.split(", ");

    const notFound = deregisterUsers(divisionName, removedPlayers);
    await updateRegistrationData();
    msg.channel.send(
      `Removed ${removedPlayers.length -
        notFound.length} players from division ${divisionName}. Unable to remove: ${notFound.join(
        ", "
      )}`
    );
  }

  if (msg.content.includes("!count")) {
    let response = "Counts of registered players:";
    for (const divisionName of Object.keys(DIVISIONS)) {
      response += `\n Division ${divisionName}:\t${
        (DIVISIONS[divisionName] || []).length
      }`;
    }
    msg.channel.send(response);
  }
});

function startRegistrationBot() {
  // if (!IS_PRODUCTION) {
  //   return;
  // }
  registrationBot.login(token);
}

// Main entry point for using the bot from server-main.js
async function reportMatch(match) {
  const messagesToSend = formatMatch(match);
  const reportingChannel = await registrationBot.channels.fetch(
    reportingChannelId
  );
  for (let i = 0; i < messagesToSend.length; i++) {
    reportingChannel.send(messagesToSend[i]);
  }
}

module.exports = {
  startRegistrationBot,
  reportMatch
};
