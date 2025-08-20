const express = require("express");
const app = express();

app.get("/", (req, res) => res.send("Bot is alive!"));
app.listen(3000, () => console.log("Web server running on port 3000"));

const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', (message) => {
  if (message.content === '!ping') {
    message.reply('Pong!');
  }
});

// Use environment variable for safety
client.login(process.env.TOKEN);