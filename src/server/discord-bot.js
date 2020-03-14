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
    this.mainChannel = "testmainchannel";
    this.testChannel = "the-lab";
    this.isReady = false;
    this.pendingMessages = [];
    this.previousVodUrl = "";
  }

  getMatchDateFormatted(match) {
    if (!match.match_date) {
      return "unknown date";
    }
    const matchMoment = moment.unix(match.match_date);
    return matchMoment.format("DD MMMM YYYY kk:mm") + " UTC";
  }

  formatMatch(match) {
    const formattedDate = this.getMatchDateFormatted(match);
    const homePlayer = match.winner_home ? match.winner : match.loser;
    const awayPlayer = match.winner_home ? match.loser : match.winner;
    const homeGames = match.winner_home
      ? match.winner_games
      : match.loser_games;
    const awayGames = match.winner_home
      ? match.loser_games
      : match.winner_games;
    // Don't embed a preview if it's a repeated vod
    const vodUrl =
      match.vod_url === this.previousVodUrl
        ? "<" + match.vod_url + ">"
        : match.vod_url;
    this.previousVodUrl = match.vod_url;
    return `:fire: ${formattedDate} ${homePlayer} (H) v ${awayPlayer} (A) ${homeGames}-${awayGames} ${vodUrl}\nRestreamed by ${match.restreamer}`;
  }

  sendMessageInChannel(messageText, channelName) {
    if (this.isReady) {
      const channel = this.client.channels.find(x => x.name === channelName);
      try {
        channel.send(messageText);
      } catch (err) {
        console.error(err);
      }
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
      // Main channel only listens for the bot check command
      if (msg.channel.name === this.mainChannel) {
        console.log("got message in main channel aka", msg.channel.name);

        if (msg.content == "!bot") {
          this.sendMessage(
            "I'm online and ready to report matches! Go to https://ctlscoreboard.herokuapp.com/ to report a match or view live standings."
          );
        }
      }
      // Test channel supports additional commands
      else if (msg.channel.name == this.testChannel) {
        console.log("got message in test channel, aka", msg.channel.name);

        if (msg.content == "!hi") {
          this.sendMessageInChannel("Greetings traveler!", this.testChannel);
        }

        if (msg.content == "!who") {
          this.sendMessageInChannel(
            `The person who just pinged me is ${msg.author.username}`,
            this.testChannel
          );
        }
      }
    });

    this.client.login(this.token);
  }
}

module.exports = {
  BotClient
};
