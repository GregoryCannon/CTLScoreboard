const { Client, Intents } = require("discord.js");
const logger = require("./logger");
const { IS_PRODUCTION } = require("./util");
const dataStoreId = IS_PRODUCTION ? "909993522780844062" : "908287705803280404";
const signUpChannelId = IS_PRODUCTION
  ? "911873148591431730"
  : "910408711900635146";
const commandChannelId = IS_PRODUCTION
  ? "672333164978372608"
  : "908284602173513731";
let dataStoreChannel;
const MAIN_EMOJI = "👍";
const CANCEL_EMOJI = "❌";
const DELAY_MS = 5000;
const HIDE_REACTION_DELAY_MS = 5000;
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

const token2 = process.env.DISCORD_TOKEN_2;
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
  let fetched;
  do {
    fetched = await channel.messages.fetch({ limit: 100 });
    channel.bulkDelete(fetched);
  } while (fetched.size >= 2);
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
  if (messages.size >= 1) {
    for (const [_, message] of messages) {
      if (message.author.bot) {
        DIVISIONS = JSON.parse(message);
        return;
      }
    }
  }
}

async function updateRegistrationData() {
  let msgString = JSON.stringify(DIVISIONS);
  msgString = msgString.replace(/,/g, ",\n");
  const messages = await dataStoreChannel.messages.fetch();

  for (const [_, message] of messages) {
    if (message.author.bot) {
      await message.edit(msgString);
      return;
    }
  }

  await dataStoreChannel.send(msgString);
}

/* ------------- Message management ------------ */

async function configureSignUpMessages(channel) {
  // Reset the channel and send sign-up messages
  await clearChannel(channel);

  await channel.send(
    "React on your assigned division below! Your reaction will be hidden after 5 seconds."
  );
  for (const divisionName of Object.keys(DIVISIONS)) {
    const message = await channel.send(`Sign up for Divison ${divisionName}`);
    await message.react(MAIN_EMOJI);

    // Add react listener
    const collector = message.createReactionCollector();
    collector.on("collect", () => {
      checkForReactions(divisionName, message);
    });

    await sleep(100);
  }
  const cancelMsg = await channel.send(
    "==================\nReact here to cancel your registration"
  );
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

async function checkForReactions(divisionName, message) {
  console.log("Checking for reactions");

  forEachReactionUser(message, async user => {
    const formattedUser = formatUser(user);
    if (getExistingDivision(formattedUser) == null) {
      // Register the player
      await registerUser(divisionName, formattedUser);

      // Send a temporary confirmation message
      const confirmationMessage = await message.channel.send(
        `${formatUser(user)} is now signed up for Division ${divisionName}.`
      );
      setTimeout(() => {
        confirmationMessage.delete();
      }, DELAY_MS);
    } else {
      // Send a temporary error message
      const confirmationMessage = await message.channel.send(
        `${formatUser(
          user
        )} is already signed up. If you need to change divisions, cancel your registration and try again.`
      );
      setTimeout(() => {
        confirmationMessage.delete();
      }, DELAY_MS);
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
    const confirmationMessage = await cancelMsg.channel.send(
      `${formatUser(user)} is no longer registered.`
    );

    // Schedule the confirmation to be deleted
    setTimeout(() => {
      confirmationMessage.delete();
    }, DELAY_MS);
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

const startRegistrationBot = () => {
  registrationBot.login(token2);
};

module.exports = {
  startRegistrationBot
};