import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
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
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

// =========================
// Slash Commands Registration
// =========================
const commands = [
  new SlashCommandBuilder().setName("ping").setDescription("Check if bot is alive"),
  new SlashCommandBuilder().setName("hello").setDescription("Say hello!"),
  new SlashCommandBuilder().setName("funny").setDescription("Get a random joke or meme"),
  new SlashCommandBuilder().setName("fact").setDescription("Get a random fact"),
  new SlashCommandBuilder().setName("truthdare").setDescription("Play Truth or Dare"),
  new SlashCommandBuilder()
    .setName("remind")
    .setDescription("Set a reminder")
    .addIntegerOption((option) =>
      option.setName("time").setDescription("Time in seconds").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("task").setDescription("Task to be reminded of").setRequired(true)
    ),
].map((cmd) => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
(async () => {
  try {
    console.log("Registering slash commands...");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log("✅ Slash commands registered!");
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
    return "❌ Could not fetch from Reddit.";
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

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildTruthDareEmbed(user, type) {
  const isTruth = type === "truth";
  const question = isTruth ? getRandom(truths) : getRandom(dares);

  return new EmbedBuilder()
    .setAuthor({ name: `Requested by ${user.username}` })
    .setTitle(isTruth ? "🎭 TRUTH" : "🔥 DARE")
    .setDescription(question)
    .setFooter({ text: "Pick another one below 👇" })
    .setColor(isTruth ? "#3399FF" : "#FF5733");
}

function buildTruthDareButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("truth").setLabel("Truth").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("dare").setLabel("Dare").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("random").setLabel("Random").setStyle(ButtonStyle.Secondary)
  );
}

// =========================
// Interaction Handling
// =========================
client.on("interactionCreate", async (interaction) => {
  if (interaction.isCommand()) {
    const userId = interaction.user.id;
    const now = Date.now();
    if (cooldowns.has(userId) && now - cooldowns.get(userId) < 3000) {
      return interaction.reply("⏳ Please wait a few seconds before using another command.");
    }
    cooldowns.set(userId, now);

    switch (interaction.commandName) {
      case "ping": {
        const responses = [
          "I’m alive! 🚀",
          "Yes yes, I hear you 👂",
          "Beep boop 🤖",
          "Ping received. Pong denied. 🏓❌",
          "Alive and kicking 💥",
        ];
        return interaction.reply(responses[Math.floor(Math.random() * responses.length)]);
      }
      case "hello":
        return interaction.reply("Hello there! 👋");
      case "funny": {
        const choice = Math.random() < 0.5 ? "joke" : "meme";

        if (choice === "meme") {
          const meme = await fetchRedditRandom("memes");
          return interaction.reply(meme);
        } else {
          const joke = await fetchJSON("https://v2.jokeapi.dev/joke/Any?safe-mode");
          if (!joke) return interaction.reply("❌ Could not fetch joke.");
          const text = joke.type === "single" ? joke.joke : `${joke.setup} ... ${joke.delivery}`;
          return interaction.reply(text);
        }
      }
      case "fact": {
        const factData = await fetchJSON("https://uselessfacts.jsph.pl/random.json?language=en");
        return interaction.reply(factData?.text || "❌ Could not fetch fact.");
      }
      case "truthdare": {
        const embed = new EmbedBuilder()
          .setAuthor({ name: `Requested by ${interaction.user.username}` })
          .setTitle("🎭 Truth or Dare")
          .setDescription("Press a button below to get started!")
          .setFooter({ text: "Have fun playing!" })
          .setColor("#FF00FF");

        return interaction.reply({ embeds: [embed], components: [buildTruthDareButtons()] });
      }
      case "remind": {
        const time = interaction.options.getInteger("time");
        const task = interaction.options.getString("task");

        if (time <= 0) return interaction.reply("⚠️ Time must be greater than 0 seconds.");

        await interaction.reply(`✅ Okay! I will remind you in ${time} seconds: **${task}**`);
        setTimeout(() => {
          interaction.followUp(`⏰ Reminder: ${task}`);
        }, time * 1000);
        break;
      }
    }
  }

  // Button interactions for Truth/Dare
  if (interaction.isButton()) {
    let type = interaction.customId;
    if (type === "random") type = Math.random() > 0.5 ? "truth" : "dare";

    const embed = buildTruthDareEmbed(interaction.user, type);
    return interaction.update({ embeds: [embed], components: [buildTruthDareButtons()] });
  }
});

client.login(process.env.DISCORD_TOKEN);