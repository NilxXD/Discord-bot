import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js";
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

// import truth & dare JSON
import truths from "./truths.json" assert { type: "json" };
import dares from "./dares.json" assert { type: "json" };

dotenv.config();

// =========================
// Uptime server
// =========================
const app = express();
app.get("/", (req, res) => res.send("Bot is alive!"));
app.listen(3000, () => console.log("Uptime server running"));

// =========================
// Discord bot client
// =========================
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// =========================
// Slash Commands Registration
// =========================
const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Check if bot is alive'),
  new SlashCommandBuilder().setName('hello').setDescription('Say hello!'),
  new SlashCommandBuilder().setName('funny').setDescription('Get a random joke or meme'),
  new SlashCommandBuilder().setName('fact').setDescription('Get a random fact'),
  new SlashCommandBuilder().setName('truth').setDescription('Get a random truth question'),
  new SlashCommandBuilder().setName('dare').setDescription('Get a random dare'),
  new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Set a reminder')
    .addIntegerOption(option =>
      option.setName('time')
            .setDescription('Time in seconds')
            .setRequired(true))
    .addStringOption(option =>
      option.setName('task')
            .setDescription('Task to be reminded of')
            .setRequired(true))
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('✅ Slash commands registered!');
  } catch (err) {
    console.error(err);
  }
})();

// =========================
// Cooldowns
// =========================
const cooldowns = new Map();

// =========================
// Helper Functions
// =========================
async function fetchRedditRandom(subreddit) {
  try {
    const res = await fetch(`https://www.reddit.com/r/${subreddit}/random/.json`);
    const data = await res.json();
    const post = data[0].data.children[0].data;
    return post.url || post.title;
  } catch (err) {
    console.error(err);
    return '❌ Could not fetch from Reddit.';
  }
}

async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}

// =========================
// Interaction Handling
// =========================
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const userId = interaction.user.id;
  const now = Date.now();
  if (cooldowns.has(userId) && now - cooldowns.get(userId) < 3000) {
    return interaction.reply('⏳ Please wait a few seconds before using another command.');
  }
  cooldowns.set(userId, now);

  switch(interaction.commandName) {
    case 'ping': {
      const responses = [
        "I’m alive! 🚀",
        "Yes yes, I hear you 👂",
        "Beep boop 🤖",
        "Ping received. Pong denied. 🏓❌",
        "Alive and kicking 💥"
      ];
      return interaction.reply(responses[Math.floor(Math.random() * responses.length)]);
    }
    case 'hello':
      return interaction.reply('Hello there! 👋');
    case 'funny': {
      const choice = Math.random() < 0.5 ? 'joke' : 'meme';

      if (choice === 'meme') {
        const meme = await fetchRedditRandom('memes');
        return interaction.reply(meme);
      } else {
        const joke = await fetchJSON('https://v2.jokeapi.dev/joke/Any?safe-mode');
        if (!joke) return interaction.reply('❌ Could not fetch joke.');
        const text = joke.type === 'single' ? joke.joke : `${joke.setup} ... ${joke.delivery}`;
        return interaction.reply(text);
      }
    }
    case 'fact': {
      const factData = await fetchJSON('https://uselessfacts.jsph.pl/random.json?language=en');
      return interaction.reply(factData?.text || '❌ Could not fetch fact.');
    }
    case 'truth': {
      return interaction.reply(truths[Math.floor(Math.random() * truths.length)]);
    }
    case 'dare': {
      return interaction.reply(dares[Math.floor(Math.random() * dares.length)]);
    }
    case 'remind': {
      const time = interaction.options.getInteger('time');
      const task = interaction.options.getString('task');

      if (time <= 0) return interaction.reply('⚠️ Time must be greater than 0 seconds.');

      await interaction.reply(`✅ Okay! I will remind you in ${time} seconds: **${task}**`);
      setTimeout(() => {
        interaction.followUp(`⏰ Reminder: ${task}`);
      }, time * 1000);
      break;
    }
  }
});

client.login(process.env.DISCORD_TOKEN);