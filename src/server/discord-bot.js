const Discord = require("discord.js");
const moment = require("moment");
const util = require("util");

/*

To report the result of a match in this channel (mandatory) please use the following 
format to include date, time (in UTC), home player (always listed first) 
v away player (always listed second), match score, link to VOD:

:fire: 13 August 2019 5:00am UTC PMYA (H) v berenyi_kft (A) 2-3 
https://www.twitch.tv/videos/4546845465421

*/

class BotClient {
  constructor(token) {
    this.token = token;
    this.client = new Discord.Client();
    this.mainChannel = "the-lab";
    this.isReady = false;
    this.pendingMessages = [];
  }

  getMatchDateFormatted(match) {
    if (!match.match_date) {
      return "unknown date";
    }
    const matchMoment = moment.unix(match.match_date);
    return matchMoment.format("DD MMMM YYYY hh:mm") + " UTC";
  }

  formatMatch(match) {
    const formattedDate = this.getMatchDateFormatted(match);
    const homePlayer = match.winner_home ? match.winner : match.loser;
    const awayPlayer = match.winner_home ? match.loser : match.winner;
    return `:fire: ${formattedDate} ${homePlayer} (H) v ${awayPlayer} (A) ${match.winner_games}-${match.loser_games} ${match.vod_url}\nRestreamed by ${match.restreamer}`;
  }

  sendMessageInChannel(messageText, channelName) {
    if (this.isReady) {
      this.client.channels.find(x => x.name === channelName).send(messageText);
    } else {
      this.pendingMessages.push([channelName, messageText]);
    }
  }

  sendMessage(messageText) {
    this.sendMessageInChannel(messageText, this.mainChannel);
  }

  reportMatch(match) {
    this.sendMessage(this.formatMatch(match));
  }

  start() {
    this.client.on("ready", () => {
      console.log("CTL-Reporting-Bot is ready");
      this.isReady = true;

      while (this.pendingMessages.length > 0) {
        const pendingMessage = this.pendingMessages.shift();
        this.sendMessage(pendingMessage[0], pendingMessage[1]);
      }
    });

    this.client.on("message", msg => {
      if (msg.channel.name !== this.mainChannel) {
        return;
      }

      console.log("got message in:", msg.channel.name);

      if (msg.content == "!hi") {
        msg.channel.send("Greetings traveler!");
      }

      if (msg.content == "!who") {
        msg.channel.send(
          `The person who just pinged me is ${msg.author.username}`
        );
      }
    });

    this.client.login(this.token);
  }
}

module.exports = {
  BotClient
};
