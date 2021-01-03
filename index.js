const Discord = require('discord.js');
const ytdl = require('ytdl-core');
require('dotenv').config();

const prefix = '$';

const client = new Discord.Client();

const queue = new Map();

client.once('ready', () => {
  console.log('Ready!');
});

client.once('reconnecting', () => {
  console.log('Reconnecting!');
});

client.once('disconnect', () => {
  console.log('Disconnect!');
});

client.on('message', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  try {
    const serverQueue = queue.get(message.guild.id);

    if (message.content === `${prefix}help`) {
      message.channel.send(`
        Lệnh:
        - ${prefix}play + [Link YouTube]: Phát nhạc
        - ${prefix}skip: Chuyển bài tiếp theo
        - ${prefix}stop: Dừng phát nhạc
        - ${prefix}list: Hiển thị list nhạc hiện tại
        - ${prefix}np: Hiển thị bài nhạc đang phát
        `);
      return;
    }

    if (message.content.startsWith(`${prefix}play`)) {
      execute(message, serverQueue);
      return;
    }

    if (message.content.startsWith(`${prefix}skip`)) {
      skip(message, serverQueue);
      console.log('Skip');
      return;
    }

    if (message.content === `${prefix}stop`) {
      stop(message, serverQueue);
      console.log('Stop');
      return;
    }

    if (message.content === `${prefix}list`) {
      listPlayingSong(message, serverQueue);
      console.log('List');
      return;
    }

    if (message.content === `${prefix}np`) {
      playing(message, serverQueue);
      return;
    }

    message.channel.send('Sai lệnh rồi');
  } catch (e) {
    console.log(e);
    message.channel.send(e);
  }
});

async function execute(message, serverQueue) {
  const args = message.content.split(' ');

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) {
    return message.channel.send(
      'Chưa vào voice channel thì sao nghe làm sao được mà mở nhạc',
    );
  }
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
    return message.channel.send('Cấp quyền để tôi vào và phát âm thanh');
  }

  let songInfo;

  try {
    songInfo = await ytdl.getInfo(args[1]);
  } catch (e) {
    console.log(e);
    message.channel.send('Tính năng phát nhạc bằng từ khóa chưa hỗ trợ');
    return;
  }

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

    queueContruct.songs = [...queueContruct.songs, song];

    try {
      var connection = await voiceChannel.join();
      queueContruct.connection = connection;
      play(message.guild, queueContruct.songs[0], message);
    } catch (err) {
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    if (!!serverQueue.songs.find((item) => item.url === song.url)) {
      serverQueue.textChannel.send(`Bài này có người mở rồi`);
      return;
    }
    if (!serverQueue.songs.length) {
      serverQueue.songs = [...serverQueue.songs, song];
      play(message.guild, serverQueue.songs[0], message);
      return;
    }
    serverQueue.songs = [...serverQueue.songs, song];
    message.channel.send(`Đã thêm **${song.title}** vào list nhạc`);
    listPlayingSong(message, serverQueue);
  }
}

function skip(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      'Không có ở trong voice channel thì không stop được',
    );
  if (!serverQueue) {
    return message.channel.send('Làm gì có nhạc mà skip');
  }
  serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
  if (!message.member.voice.channel) {
    return message.channel.send(
      'Không có ở trong voice channel thì không stop được',
    );
  }

  if (!serverQueue) return message.channel.send('Làm gì có nhạc mà dừng');

  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
}

function play(guild, song, message) {
  try {
    const serverQueue = queue.get(guild.id);
    if (!song) {
      setTimeout(() => {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
      }, 3600000);
      return;
    }

    const dispatcher = serverQueue.connection
      .play(ytdl(song.url))
      .on('finish', () => {
        serverQueue.songs.shift();
        play(guild, serverQueue.songs[0]);
      })
      .on('error', (error) => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(`Đã mở: **${song.title}**`);
  } catch (e) {
    console.log(e);
    serverQueue.textChannel.send(e);
  }
}

const listPlayingSong = (message, serverQueue) => {
  if (!serverQueue?.songs || !serverQueue?.songs?.length) {
    message.channel.send('List trống trơn');
    return;
  }

  const songTitle = serverQueue.songs
    .map((song, index) => `> ${index + 1}) - ${song.title}`)
    .join('\n');

  message.channel.send(`
    Danh sách những bài đang mở
    ${songTitle}
    `);
};

const playing = (message, serverQueue) => {
  if (!serverQueue) return;
  if (!serverQueue.songs.length) {
    message.channel.send('Không có bài nào đang phát cả');
    return;
  }

  message.channel.send(`> Đang phát: **${serverQueue.songs[0].title}**`);
};

client.login(process.env.TOKEN);
