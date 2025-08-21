// index.js

const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");

// ===== Discord Bot =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, // for slash commands & guild events
    GatewayIntentBits.GuildMessages, // for reading messages
    GatewayIntentBits.MessageContent // for message content (needs to be enabled in Discord Dev Portal)
  ],
});

// When bot is ready
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// Example message listener
client.on("messageCreate", (message) => {
  if (message.content === "!ping") {
    message.reply("🏓 Pong!");
  }
});

// Login using environment variable
client.login(process.env.DISCORD_TOKEN);

// ===== Express Keep-Alive Server =====
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is running ✅");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Express server listening on port ${PORT}`);
}); in as ${client.user.tag}`);
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