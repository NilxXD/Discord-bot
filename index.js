const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

// --- Keep-Alive Web Server ---
app.get("/", (req, res) => {
  res.send("Bot is running!");
});
app.listen(PORT, () => {
  console.log(`Uptime server running on port ${PORT}`);
});

// --- Discord Bot ---
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("messageCreate", (message) => {
  if (message.content === "!ping") {
    message.reply("Pong!");
  }
});

// Login with token from Render environment
client.login(process.env.DISCORD_TOKEN); === '!ping') {
    message.reply('Pong!');
  }
});

// Use environment variable for safety
client.login(process.env.TOKEN);