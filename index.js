const Discord = require("discord.js");
const ytdl = require("ytdl-core");
require("dotenv").config();

const prefix = "hz!";

const client = new Discord.Client();

const queue = new Map();

client.once("ready", () => {
  console.log("Ready!");
});

client.once("reconnecting", () => {
  console.log("Reconnecting!");
});

client.once("disconnect", () => {
  console.log("Disconnect!");
});

client.on("message", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const serverQueue = queue.get(message.guild.id);

  if (message.content.startsWith(`${prefix}play`)) {
    execute(message, serverQueue);
    return;
  }

  if (message.content.startsWith(`${prefix}skip`)) {
    skip(message, serverQueue);
    console.log("Skip");
    return;
  }

  if (message.content === `${prefix}stop`) {
    stop(message, serverQueue);
    console.log("Stop");
    return;
  }

  if (message.content === `${prefix}list`) {
    listPlayingSong(message, serverQueue);
    console.log("List");
    return;
  }

  message.channel.send("Sai lệnh rồi");
});

async function execute(message, serverQueue) {
  const args = message.content.split(" ");

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel)
    return message.channel.send(
      "Chưa vào voice channel thì sao nghe làm sao được mà mở nhạc"
    );
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send("Cấp quyền để tôi vào và phát âm thanh");
  }

  const songInfo = await ytdl.getInfo(args[1]);
  const song = {
    title: songInfo.videoDetails.title,
    url: songInfo.videoDetails.video_url,
  };

  if (!serverQueue) {
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true,
    };

    queue.set(message.guild.id, queueContruct);

    queueContruct.songs.push(song);

    try {
      var connection = await voiceChannel.join();
      queueContruct.connection = connection;
      play(message.guild, queueContruct.songs[0]);
    } catch (err) {
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    serverQueue.songs.push(song);
    return message.channel.send(`Đã thêm ${song.title} vào list nhạc`);
  }
}

function skip(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "Không có ở trong voice channel thì không stop được"
    );
  if (!serverQueue) return message.channel.send("Làm gì có nhạc mà skip");
  serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "Không có ở trong voice channel thì không stop được"
    );

  if (!serverQueue) return message.channel.send("Làm gì có nhạc mà dừng");

  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
}

function play(guild, song) {
  try {
    const serverQueue = queue.get(guild.id);
    if (!song) {
      serverQueue.voiceChannel.leave();
      queue.delete(guild.id);
      return;
    }

    const dispatcher = serverQueue.connection
      .play(ytdl(song.url))
      .on("finish", () => {
        serverQueue.songs.shift();
        play(guild, serverQueue.songs[0]);
      })
      .on("error", (error) => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(`Đang mở: **${song.title}**`);
  } catch (e) {
    console.log(e);
  }
}

const listPlayingSong = (message, serverQueue) => {
  if (!serverQueue?.songs || !serverQueue.song.length) {
    message.channel.send("List trống trơn");
    return;
  }

  const songTitle = serverQueue.songs
    .map((song, index) => `> [${index + 1}] - ${song.title}`)
    .join("\n");

  message.channel.send(`
  Danh sách những bài đang mở
  ${songTitle}
  `);
};

client.login(process.env.TOKEN);
