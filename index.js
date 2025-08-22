import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js";
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
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
  new SlashCommandBuilder().setName('ping').setDescription('Pong!'),
  new SlashCommandBuilder().setName('hello').setDescription('Say hello!'),
  new SlashCommandBuilder().setName('meme').setDescription('Get a random meme'),
  new SlashCommandBuilder().setName('joke').setDescription('Get a random joke'),
  new SlashCommandBuilder().setName('fact').setDescription('Get a random fact'),
  new SlashCommandBuilder().setName('truth').setDescription('Get a truth for truth or dare'),
  new SlashCommandBuilder().setName('dare').setDescription('Get a dare for truth or dare'),
  new SlashCommandBuilder()
    .setName('study')
    .setDescription('Get a study problem')
    .addStringOption(option => 
      option.setName('subject')
            .setDescription('Choose subject')
            .setRequired(true)
            .addChoices(
              { name: 'Math', value: 'math' },
              { name: 'Physics', value: 'physics' },
              { name: 'Chemistry', value: 'chemistry' }
            ))
    .addStringOption(option => 
      option.setName('difficulty')
            .setDescription('Choose difficulty')
            .setRequired(true)
            .addChoices(
              { name: 'Easy', value: 'easy' },
              { name: 'Medium', value: 'medium' },
              { name: 'Hard', value: 'hard' }
            )),
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
    case 'ping':
      return interaction.reply('Pong! 🏓');
    case 'hello':
      return interaction.reply('Hello there! 👋');
    case 'meme': {
      const meme = await fetchRedditRandom('memes');
      return interaction.reply(meme);
    }
    case 'joke': {
      const joke = await fetchJSON('https://v2.jokeapi.dev/joke/Any');
      if (!joke) return interaction.reply('❌ Could not fetch joke.');
      const text = joke.type === 'single' ? joke.joke : `${joke.setup} ... ${joke.delivery}`;
      return interaction.reply(text);
    }
    case 'fact': {
      const factData = await fetchJSON('https://uselessfacts.jsph.pl/random.json?language=en');
      return interaction.reply(factData?.text || '❌ Could not fetch fact.');
    }
    case 'truth': {
      const truths = await fetchJSON('https://raw.githubusercontent.com/Anishukla/Truth-or-Dare/main/truth.json');
      return interaction.reply(truths ? truths[Math.floor(Math.random()*truths.length)] : '❌ Could not fetch truth.');
    }
    case 'dare': {
      const dares = await fetchJSON('https://raw.githubusercontent.com/Anishukla/Truth-or-Dare/main/dare.json');
      return interaction.reply(dares ? dares[Math.floor(Math.random()*dares.length)] : '❌ Could not fetch dare.');
    }
    case 'study': {
      const subject = interaction.options.getString('subject');
      const difficulty = interaction.options.getString('difficulty');
      let url;
      if (subject === 'math') url = 'https://raw.githubusercontent.com/Mechatronix/Math-Questions/main/questions.json';
      else if (subject === 'physics') url = 'https://raw.githubusercontent.com/kartikeya2401/IIT-JEE-Question-Bank/main/Physics.json';
      else if (subject === 'chemistry') url = 'https://raw.githubusercontent.com/kartikeya2401/IIT-JEE-Question-Bank/main/Chemistry.json';
      
      const questions = await fetchJSON(url);
      if (!questions) return interaction.reply('❌ Could not fetch study problems.');

      const filtered = questions.filter(q => q.difficulty?.toLowerCase() === difficulty.toLowerCase());
      const question = filtered.length ? filtered[Math.floor(Math.random()*filtered.length)] : questions[Math.floor(Math.random()*questions.length)];
      return interaction.reply(question.question || JSON.stringify(question));
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