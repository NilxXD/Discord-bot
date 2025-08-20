const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const PREFIX = '!'; // try: !ping

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', (msg) => {
  if (msg.author.bot) return;
  if (!msg.content.startsWith(PREFIX)) return;

  const [command] = msg.content.slice(PREFIX.length).trim().split(/\s+/);

  if (command === 'ping') {
    msg.reply('Pong! 🏓');
  }
});

client.login(process.env.DISCORD_TOKEN);
