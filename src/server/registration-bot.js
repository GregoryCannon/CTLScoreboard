const { Client, Intents } = require("discord.js");
const logger = require("./logger");
const { IS_PRODUCTION, getMatchDateFormatted } = require("./util");

const REGISTRATION_OPEN_CTL = false;
const REGISTRATION_OPEN_TNP = true;
const MAIN_EMOJI = "👍";
const CANCEL_EMOJI = "❌";
const INFO_EMOJI = "ℹ️";
const LINE_ASCII = "—————————————————————————";
const DELAY_MS = 4000;
const HIDE_REACTION_DELAY_MS = 4000;
let DIVISIONS_CTL = {
  "1": [],
  "2": [],
  "3": [],
  "4": [],
  "5": [],
};
let DIVISIONS_TNP = {
  Gold: [],
  Silver: [],
  Bronze: [],
  Beginner: [],
};
const SIGN_UP_MESSAGE_TNP =
  "React to sign up for a new division below! Your reaction will be hidden after 3 seconds.\n\nIf you are currently in a division, do not sign up here until both (1) 100% of your own matches have been completed, and (2) your division deadline is at the end of the current week or your tier for the next season is already a 100% certainty. Make sure your registration is for the correct tier and is current at 7:00 UTC each Sunday. New divisions will be created shortly thereafter and withdrawal after this point may be penalised. For full details, refer to #rules-and-standings.\n\n";
const SIGN_UP_MESSAGE_CTL =
  "React to sign up for a new division below! Your reaction will be hidden after 3 seconds.\n\nIf you are currently in a division, do not sign up here until both (1) 100% of your own matches have been completed, and (2) your division deadline is at the end of the current week or your tier for the next season is already a 100% certainty. Make sure your registration is for the correct tier. Deadline to join CTL Season 19 is December 23 23:59 UTC. If you need to withdraw after this point, DM the King before December 26 to be removed. For full details, refer to #rules-and-standings.\n\n";
const REGISTRATION_CLOSED_MESSAGE_CTL =
  "Registration for the current season is now closed. Please wait for an announcement later in the season for when you may begin to react to participate for the next season starting in May 2023";
const REGISTRATION_CLOSED_MESSAGE_TNP = "Registration is currently closed.";

class RegistrationAndMatchBot {
  constructor(isTNP) {
    let DIVISIONS = isTNP ? DIVISIONS_TNP : DIVISIONS_CTL;
    let SIGN_UP_MESSAGE = isTNP ? SIGN_UP_MESSAGE_TNP : SIGN_UP_MESSAGE_CTL;
    let previousVodUrl = "";
    let dataStoreChannel = null;
    let dataStoreBackupChannel = null;
    let reportingChannel = null;

    const dataStoreId = isTNP
      ? process.env.DATA_STORE_CHANNEL_TNP
      : process.env.DATA_STORE_CHANNEL_CTL;
    const dataStoreBackupId = isTNP
      ? process.env.DATA_STORE_BACKUP_CHANNEL_TNP
      : process.env.DATA_STORE_BACKUP_CHANNEL_CTL;
    const signUpChannelId = isTNP
      ? process.env.SIGNUP_CHANNEL_TNP
      : process.env.SIGNUP_CHANNEL_CTL;
    const commandChannelId = isTNP
      ? process.env.COMMAND_CHANNEL_TNP
      : process.env.COMMAND_CHANNEL_CTL;
    const reportingChannelId = isTNP
      ? process.env.REPORTING_CHANNEL_TNP
      : process.env.REPORTING_CHANNEL_CTL;
    const token = isTNP
      ? process.env.DISCORD_TOKEN_TNP
      : process.env.DISCORD_TOKEN_CTL;

    const registrationBot = new Client({
      intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
      ],
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
        toDelete = toDelete.filter((msg) => msg.author.bot);
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
          matchLine,
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
        if (msg.author.bot) {
          msgArray.push({
            content: msg.content,
            createdTimestamp: msg.createdTimestamp,
          });
        }
      }
      msgArray = msgArray.sort(
        (a, b) => a.createdTimestamp - b.createdTimestamp
      );
      console.log(msgArray);

      if (messages.size >= 1) {
        let dataString = "";
        for (const message of msgArray) {
          dataString += message.content;
        }
        console.log("Loading from data string", dataString);

        try {
          const oldDivKeys = Object.keys(DIVISIONS);
          DIVISIONS = JSON.parse(dataString);
          // Delete any divisions that used to exist but have been removed from the config set
          for (const key of Object.keys(DIVISIONS)) {
            if (!oldDivKeys.includes(key)) {
              delete DIVISIONS[key];
            }
          }
        } catch (error) {
          console.log(error);
          console.error("Failed to parse player list JSON");
        }
      }
    }

    async function updateRegistrationData() {
      let msgString = JSON.stringify(DIVISIONS);
      msgString = msgString.replace(/,/g, ",\n");
      let splitMessages = msgString.match(/(.|[\r\n]){1,1000}/g); // Replace n with the size of the substring

      // Clear existing messages
      await dataStoreChannel.messages.fetch().then((msgs) => {
        msgs.sort((a, b) => b.createdAt > a.createdAt);
        for (const [_, message] of msgs) {
          if (message.author.bot) {
            message.delete();
          }
        }
      });

      for (const msgContent of splitMessages) {
        await dataStoreChannel.send(msgContent);
        await dataStoreBackupChannel.send(msgContent);
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

      if (
        (isTNP && REGISTRATION_OPEN_TNP) ||
        (!isTNP && REGISTRATION_CLOSED_MESSAGE_CTL)
      ) {
        // Main registration section
        await channel.send(SIGN_UP_MESSAGE + LINE_ASCII);
        for (const divisionName of Object.keys(DIVISIONS)) {
          const message = await channel.send(
            `Sign up for Division ${divisionName}`
          );
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
      } else {
        channel.send(
          isTNP
            ? REGISTRATION_CLOSED_MESSAGE_TNP
            : REGISTRATION_CLOSED_MESSAGE_CTL
        );
      }
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

      forEachReactionUser(message, async (user) => {
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
      forEachReactionUser(cancelMsg, async (user) => {
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
      forEachReactionUser(infoMsg, async (user) => {
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
      dataStoreChannel = await registrationBot.channels.cache.get(dataStoreId);
      dataStoreBackupChannel = await registrationBot.channels.cache.get(
        dataStoreBackupId
      );
      reportingChannel = await registrationBot.channels.cache.get(
        reportingChannelId
      );
      loadRegistrationData(dataStoreChannel);

      const signUpChannel = await registrationBot.channels.cache.get(
        signUpChannelId
      );
      configureSignUpMessages(signUpChannel);
    });

    // Incoming message handler
    registrationBot.on("messageCreate", async (msg) => {
      if (msg.channel.id !== commandChannelId) {
        return;
      }

      console.log("got message:", msg.content);
      if (msg.content == "!who") {
        msg.channel.send(msg.author.username + "#" + msg.author.discriminator);
      }

      if (msg.content.match(/^!add /)) {
        const args = msg.content.split("!add ")[1];
        const divisionName = args.split(/ (.+)/)[0];
        const rest = args.split(/ (.+)/)[1];
        const newPlayers = rest.split(", ");

        registerUsers(divisionName, newPlayers);
        msg.channel.send(
          `Added ${newPlayers.length} players to division ${divisionName}.`
        );
      }

      if (msg.content.match(/^!remove /)) {
        const args = msg.content.split("!remove ")[1];
        const divisionName = args.split(/ (.+)/)[0];
        const rest = args.split(/ (.+)/)[1];
        const removedPlayers = rest.split(", ");

        const notFound = deregisterUsers(divisionName, removedPlayers);
        await updateRegistrationData();
        msg.channel.send(
          `Removed ${removedPlayers.length -
            notFound.length} players from division ${divisionName}.${
            notFound.length > 0
              ? " Unable to remove: " + notFound.join(", ")
              : ""
          }`
        );
      }

      if (msg.content.match(/^!removeall /)) {
        const divisionName = msg.content.split(" ")[1];
        const existingDivisions = Object.keys(DIVISIONS);
        if (existingDivisions.includes(divisionName)) {
          const removedPlayers = DIVISIONS[divisionName];
          DIVISIONS[divisionName] = [];
          msg.channel.send(
            `Removed ${removedPlayers.length} players from division ${divisionName}`
          );
          await updateRegistrationData();
        } else {
          msg.channel.send(`Unable to find division: ${divisionName}`);
        }
      }

      if (msg.content.match(/^!count/)) {
        let response = "Counts of registered players:";
        for (const divisionName of Object.keys(DIVISIONS)) {
          response += `\n Division ${divisionName}:\t${
            (DIVISIONS[divisionName] || []).length
          }`;
        }
        msg.channel.send(response);
      }
    });

    // Define the one public function to this()
    this.reportMatchImpl = (match) => {
      const messagesToSend = formatMatch(match);
      for (let i = 0; i < messagesToSend.length; i++) {
        reportingChannel.send(messagesToSend[i]);
      }
    };

    // Start the bot!
    registrationBot.login(token);
  }

  reportMatch(match) {
    this.reportMatchImpl(match);
  }
}

module.exports = {
  RegistrationAndMatchBot,
};
