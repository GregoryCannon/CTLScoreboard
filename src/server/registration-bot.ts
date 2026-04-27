import type {
  CompetitionSettings,
  Match
} from "../types.ts";
import { TextChannel, Client, Intents, User, Message, DiscordAPIError } from "discord.js";
import { log } from "./logger.ts";
import { getMatchDateFormatted } from "./util.ts";

type VodSameness = "identical" | "new timestamp" | "different";

const MAIN_EMOJI = "👍";
const CANCEL_EMOJI = "❌";
const INFO_EMOJI = "ℹ️";
const LINE_ASCII = "—————————————————————————";
const DELAY_MS = 4000;
const HIDE_REACTION_DELAY_MS = 4000;

class RegistrationAndMatchBot {
  #previousVodUrl = "";
  #dataStoreChannel: TextChannel | null = null;
  #dataStoreBackupChannel: TextChannel | null = null;
  #reportingChannel: TextChannel | null = null;
  #signUpChannel: TextChannel | null = null;
  #divisions: Record<string, string[]> = {};
  #registrationBot = new Client({
    intents: [
      Intents.FLAGS.GUILDS,
      Intents.FLAGS.GUILD_MESSAGES,
      Intents.FLAGS.GUILD_MESSAGE_REACTIONS
    ]
  });
  #competition: CompetitionSettings;

  constructor(competition: CompetitionSettings) {
    this.#competition = competition;
    const compSuffix = competition.abbreviation.toUpperCase();
    for (const divisionName of competition.registrationBotInfo.divisions) {
      this.#divisions[divisionName] = [];
    }
    
    this.#registrationBot.once("ready", async () => this.#registrationBotReady(compSuffix));

    // Incoming message handler
    this.#registrationBot.on("messageCreate", async msg => this.#registrationBotMessageCreate(msg, compSuffix));

    // Start the bot!
    const token = process.env[`DISCORD_TOKEN_${compSuffix}`];
    this.#registrationBot.login(token);
  }

  reportMatch(match: Match) {
    // this.reportMatchImpl(match);
    const messagesToSend = this.#formatMatch(match);
    if (this.#reportingChannel === null) {
      console.error("Could not report match; reporting channel undefined");
    } else {
      for (let i = 0; i < messagesToSend.length; i++) {
        this.#reportingChannel.send(messagesToSend[i]);
      }
    }
  }

  #formatMatch(match: Match): string[] {
    const formattedDate = getMatchDateFormatted(match);

    const vodSameness = this.#checkVodSameness(match.vod_url, this.#previousVodUrl);
    this.#previousVodUrl = match.vod_url;
    const matchLine = `:fire: ${formattedDate} [${match.division}] **${match.winner}** def. **${match.loser}** (${match.winner_games}-${match.loser_games})`;

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
    } else {
      // vodSameness === "identical"; post just the match results
      return [matchLine];
    }
  }
  /* ------------- Reporting-related helpers ---------------- */

  #checkVodSameness(vodUrl: string, previousVodUrl: string): VodSameness {
    if (vodUrl === previousVodUrl) {
      return "identical";
    } else if (vodUrl.split("?")[0] === previousVodUrl.split("?")[0]) {
      return "new timestamp";
    }
    return "different";
  }

  async #registrationBotReady(compSuffix: string): Promise<void> {
    this.#logWithSuffix("Registration bot is online!");

    const dataStoreId = process.env[`DATA_STORE_CHANNEL_${compSuffix}`];
    const dataStoreBackupId =
      process.env[`DATA_STORE_BACKUP_CHANNEL_${compSuffix}`];
    const signUpChannelId = process.env[`SIGNUP_CHANNEL_${compSuffix}`];
    const reportingChannelId = process.env[`REPORTING_CHANNEL_${compSuffix}`];

    // Maybe load data from data store channel
    this.#dataStoreChannel = await this.#fetchChannelData(dataStoreId);
    this.#dataStoreBackupChannel = await this.#fetchChannelData(dataStoreBackupId);
    this.#reportingChannel = await this.#fetchChannelData(reportingChannelId);
    this.#signUpChannel = await this.#fetchChannelData(signUpChannelId);

    this.#loadRegistrationData();
    this.#configureSignUpMessages();
  }

  async #registrationBotMessageCreate(msg: Message, compSuffix: string): Promise<void> {
    const commandChannelId = process.env[`COMMAND_CHANNEL_${compSuffix}`];
    if (msg.channel.id !== commandChannelId) {
      return;
    }

    this.#logWithSuffix("got message: " + msg.content);
    if (msg.content == "!who") {
      msg.channel.send(msg.author.username + "#" + msg.author.discriminator);
    }

    if (msg.content.match(/^!add /)) {
      const args = msg.content.split("!add ")[1];
      const divisionName = args.split(/ (.+)/)[0];
      const rest = args.split(/ (.+)/)[1];
      const newPlayers = rest.split(", ");

      this.#registerUsers(divisionName, newPlayers);
      msg.channel.send(
        `Added ${newPlayers.length} players to division ${divisionName}.`
      );
    }

    if (msg.content.match(/^!remove /)) {
      const args = msg.content.split("!remove ")[1];
      const divisionName = args.split(/ (.+)/)[0];
      const rest = args.split(/ (.+)/)[1];
      const removedPlayers = rest.split(", ");

      const notFound = this.#deregisterUsers(divisionName, removedPlayers);
      await this.#updateRegistrationData();
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
      const existingDivisions = Object.keys(this.#divisions);
      if (existingDivisions.includes(divisionName)) {
        const removedPlayers = this.#divisions[divisionName];
        this.#divisions[divisionName] = [];
        msg.channel.send(
          `Removed ${removedPlayers.length} players from division ${divisionName}`
        );
        await this.#updateRegistrationData();
      } else {
        msg.channel.send(`Unable to find division: ${divisionName}`);
      }
    }

    if (msg.content.match(/^!count/)) {
      let response = "Counts of registered players:";
      for (const divisionName of Object.keys(this.#divisions)) {
        response += `\n Division ${divisionName}:\t${
          (this.#divisions[divisionName] || []).length
        }`;
      }
      msg.channel.send(response);
  }
}

  async #fetchChannelData(id: string | undefined): Promise<TextChannel | null> {
    if (id == undefined) return null;
    const channel = await this.#registrationBot.channels.fetch(id) as TextChannel | null;
    return channel;
  }

  /* ------------ Helper methods ------------- */
  #formatUser(user: User): string {
    return `${user.username}#${user.discriminator}`;
  }

  async #sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async #loadRegistrationData() {
    const channel = this.#dataStoreChannel;
    if (channel === null) {
      this.#logWithSuffix("Data store channel undefined or lacks permissions");
      return;
    }

    const messages = await channel.messages.fetch();
    let msgArray = [];
    for (const [_, msg] of messages) {
      if (msg.author.bot) {
        msgArray.push({
          content: msg.content,
          createdTimestamp: msg.createdTimestamp
        });
      }
    }
    msgArray = msgArray.sort(
      (a, b) => a.createdTimestamp - b.createdTimestamp
    );

    if (messages.size >= 1) {
      let dataString = "";
      for (const message of msgArray) {
        dataString += message.content;
      }
      this.#logWithSuffix("Loading from data string " + dataString);

      try {
        const oldDivKeys = Object.keys(this.#divisions);
        const dataStringNoBackticks = dataString.replaceAll('`', '');
        this.#divisions = JSON.parse(dataStringNoBackticks);
        // Delete any divisions that used to exist but have been removed from the config set
        for (const key of Object.keys(this.#divisions)) {
          if (!oldDivKeys.includes(key)) {
            delete this.#divisions[key];
          }
        }
        for (const key of oldDivKeys) {
          if (!Object.keys(this.#divisions).includes(key)) {
            this.#divisions[key] = [];
          }
        }
      } catch (error) {
        this.#logWithSuffix((error as Error).message);
        console.error("Failed to parse player list JSON");
      }
    }
  }

  /* ------------- Message management ------------ */

  async #configureSignUpMessages() {
    const channel = this.#signUpChannel;
    if (channel === null) {
      this.#logWithSuffix("Signup channel undefined or lacks permissions");
      return;
    }

    // Reset the channel and send sign-up messages
    try {
      await this.#clearChannel(channel);
    } catch (error) {
      if (error instanceof DiscordAPIError && error.code === 50034) {
        this.#logWithSuffix(`Some messages too old to be cleared from signup channel`);
      } else {
        console.error(error);
      }
    }

    if (this.#competition.registrationBotInfo.registrationOpen) {
      // Main registration section
      await channel.send(this.#competition.registrationBotInfo.signupMessage + LINE_ASCII);
      for (const divisionName of Object.keys(this.#divisions)) {

        const messageString = divisionName.length > 2 
          ? `Sign up for a ${divisionName} division`
          : `Sign up for division ${divisionName}`
        const message = await channel.send(messageString);
        await message.react(MAIN_EMOJI);
        const collector = message.createReactionCollector();
        collector.on("collect", () => {
          this.#checkForReactions(divisionName, message);
        });

        await this.#sleep(100);
      }

      // Check registration button
      const infoMsg = await channel.send(
        LINE_ASCII + "\nReact here to confirm whether you're signed up"
      );
      infoMsg.react(INFO_EMOJI);
      const infoCollector = infoMsg.createReactionCollector();
      infoCollector.on("collect", () => {
        this.#checkForInfoReacts(infoMsg);
      });

      // Cancel registration button
      const cancelMsg = await channel.send(
        "React here to cancel your signup"
      );
      await channel.send(LINE_ASCII);
      cancelMsg.react(CANCEL_EMOJI);
      const cancelCollector = cancelMsg.createReactionCollector();
      cancelCollector.on("collect", () => {
        this.#checkForCancelReacts(cancelMsg);
      });
    } else {
      channel.send(this.#competition.registrationBotInfo.registrationClosedMessage);
    }
  }

  async #forEachReactionUser(message: Message, consumerFunction: (user: User) => Promise<void>) {
    // Get the reactions on that message
    for (const [_, reaction] of message.reactions.cache) {
      const users = await reaction.users.fetch();
      // Loop through the users that reacted
      for (const [_, user] of users) {
        if (!user.bot) {
          const nameFormatted = user.username + "#" + user.discriminator;
          this.#logWithSuffix("FOUND REACTION: " + nameFormatted);

          consumerFunction(user);
          // Schedule the reaction to be deleted
          setTimeout(() => {
            reaction.users.remove(user.id);
          }, HIDE_REACTION_DELAY_MS);
        }
      }
    }
  }

  async #sendTemporaryMessage(channel: TextChannel, messageText: string) {
    const confirmationMessage = await channel.send(messageText);
    setTimeout(() => {
      confirmationMessage.delete();
    }, DELAY_MS);
  }

  async #checkForReactions(divisionName: string, message: Message) {
    this.#logWithSuffix("Checking for reactions");

    this.#forEachReactionUser(message, async user => {
      const formattedUser = this.#formatUser(user);
      if (
        this.#getExistingDivision(formattedUser) == null ||
        this.#getExistingDivision(formattedUser) == "VeryLarge"
      ) {
        // Register the player
        await this.#registerUser(divisionName, formattedUser);

        // Send a temporary confirmation message
        const temporaryMessage = divisionName.length > 2
          ? `${this.#formatUser(user)} is now signed up for a ${divisionName} Division.`
          : `${this.#formatUser(user)} is now signed up for Division ${divisionName}.`;
        this.#sendTemporaryMessage(message.channel as TextChannel, temporaryMessage);
      } else {
        // Send a temporary error message
        this.#sendTemporaryMessage(
          message.channel as TextChannel,
          `${this.#formatUser(
            user
          )} is already signed up. If you need to change divisions, cancel your signup and try again.`
        );
      }
    });
  }

  async #checkForCancelReacts(cancelMsg: Message) {
    this.#forEachReactionUser(cancelMsg, async user => {
      const formattedUser = this.#formatUser(user);

      // Wipe the player from registration lists
      this.#deregisterUser(formattedUser);
      await this.#updateRegistrationData();

      // Send a confirmation message
      this.#sendTemporaryMessage(
        cancelMsg.channel as TextChannel,
        `${this.#formatUser(user)} is no longer registered.`
      );
    });
  }

  async #checkForInfoReacts(infoMsg: Message) {
    this.#forEachReactionUser(infoMsg, async user => {
      const formattedUser = this.#formatUser(user);
      const existingDivision = this.#getExistingDivision(formattedUser);
      if (existingDivision == null) {
        this.#sendTemporaryMessage(
          infoMsg.channel as TextChannel,
          `${formattedUser} is not currently signed up.`
        );
      } else {
        this.#sendTemporaryMessage(
          infoMsg.channel as TextChannel,
          `${formattedUser} is currently signed up for Division ${existingDivision}`
        );
      }
    });
  }

  async #clearChannel(channel: TextChannel) {
    let toDelete;
    do {
      toDelete = await channel.messages.fetch({ limit: 100 });
      toDelete = toDelete.filter(msg => msg.author.bot);
      await channel.bulkDelete(toDelete);
    } while (toDelete.size >= 2);
  }

  /* ------------- Data-related operations ------------ */

  #getExistingDivision(formattedUser: string) {
    let registeredDiv = null;
    for (const [divisionName, playerList] of Object.entries(this.#divisions)) {
      if (playerList.includes(formattedUser)) {
        registeredDiv = divisionName;
      }
    }
    return registeredDiv;
  }

  async #registerUsers(divisionName: string, formattedUserList: string[]) {
    for (const user of formattedUserList) {
      this.#divisions[divisionName].push(user);
    }
    await this.#updateRegistrationData();
  }

  async #registerUser(divisionName: string, formattedUser: string) {
    this.#divisions[divisionName].push(formattedUser);
    await this.#updateRegistrationData();
  }

  #deregisterUser(formattedUser: string) {
    let registeredDiv = null;
    for (const [divisionName, playerList] of Object.entries(this.#divisions)) {
      this.#removeItemAll(playerList, formattedUser);
    }
    return registeredDiv;
  }

  /** Attempts to deregister a list of users, and returns a list of those that weren't able to be removed. */
  #deregisterUsers(divisionName: string, formattedUserList: string[]) {
    let notFound = [];
    const playerList = this.#divisions[divisionName];
    if (!playerList) {
      return formattedUserList;
    }
    for (const name of formattedUserList) {
      if (playerList.includes(name)) {
        this.#removeItemAll(playerList, name);
      } else {
        notFound.push(name);
      }
    }
    return notFound;
  }


  async #updateRegistrationData() {
    if (this.#dataStoreChannel === null) {
      this.#logWithSuffix("error: ")
      console.error("Data store channel is null");
      return;
    }

    let msgString = JSON.stringify(this.#divisions);
    msgString = "```\n" + msgString.replace(/,/g, ",\n") + "\n```";
    let splitMessages = msgString.match(/(.|[\r\n]){1,1000}/g); // Replace n with the size of the substring

    // Clear existing messages
    await this.#dataStoreChannel.messages.fetch().then(msgs => {
      msgs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      for (const [_, message] of msgs) {
        if (message.author.bot) {
          message.delete();
        }
      }
    });

    if (splitMessages === null) return;
    for (const msgContent of splitMessages) {
      await this.#dataStoreChannel.send(msgContent);
      if (this.#dataStoreBackupChannel === null) {
        this.#logWithSuffix("error:")
        console.error("Data store backup channel is null");
      } else {
        await this.#dataStoreBackupChannel.send(msgContent);
      }
    }
  }

  #removeItemAll<T>(arr: Array<T>, value: T): Array<T> {
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

  #logWithSuffix(msg: string) {
    const compSuffix = this.#competition.abbreviation.toUpperCase();
    console.log(`(${compSuffix}) ${msg}`);

  }
}

export {
  RegistrationAndMatchBot
};
