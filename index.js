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
import dotenv from "dotenv";

import truths from "./truths.json" assert { type: "json" };
import dares from "./dares.json" assert { type: "json" };
import chills from "./chill.json" assert { type: "json" };

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
  new SlashCommandBuilder().setName("chill").setDescription("Get a random chill content"),
  new SlashCommandBuilder().setName("fact").setDescription("Get a random fact"),
  new SlashCommandBuilder().setName("truthdare").setDescription("Play Truth or Dare"),
  new SlashCommandBuilder()
    .setName("remind")
    .setDescription("Set a reminder (format: HH:MM:SS)")
    .addStringOption((option) =>
      option.setName("time").setDescription("Time in HH:MM:SS format").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("task").setDescription("Task to be reminded of").setRequired(true)
    ),
].map((cmd) => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
(async () => {
  try {
    console.log("Registering slash commands...");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });
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
// Truth or Dare Session Tracker
// =========================
const truthDareSessions = new Map();

// =========================
// Helper Functions
// =========================
function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildTruthDareEmbed(user, type, count) {
  const isTruth = type === "truth";
  const question = isTruth ? getRandom(truths) : getRandom(dares);

  return new EmbedBuilder()
    .setAuthor({ name: `Requested by ${user.username}` })
    .setDescription(`**${question}**`)
    .setFooter({ text: `Type: ${isTruth ? "Truth" : "Dare"} | Card #${count}` })
    .setColor(isTruth ? "#3399FF" : "#FF5733");
}

function buildTruthDareButtons(disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("truth")
      .setLabel("Truth")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId("dare")
      .setLabel("Dare")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId("random")
      .setLabel("Random")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled)
  );
}

function parseTimeString(timeStr) {
  const parts = timeStr.split(":").map(Number);
  if (parts.length !== 3) return null;
  const [hr, min, sec] = parts;
  return hr * 3600 + min * 60 + sec;
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
      case "chill": {
        const content = getRandom(chills);
        return interaction.reply(content);
      }

      case "fact": {
        try {
          const res = await fetch("https://uselessfacts.jsph.pl/random.json?language=en");
          const factData = await res.json();
          return interaction.reply(factData?.text || "🤔 Couldn't come up with a fact right now!");
        } catch {
          return interaction.reply("🤔 Couldn't fetch a fact right now!");
        }
      }

      case "truthdare": {
        truthDareSessions.set(interaction.user.id, { count: 0 });

        const embed = new EmbedBuilder()
          .setAuthor({ name: `Requested by ${interaction.user.username}` })
          .setTitle("🎭 Truth or Dare")
          .setDescription("Press a button below to get started!")
          .setColor("#FF00FF");

        return interaction.reply({ embeds: [embed], components: [buildTruthDareButtons()] });
      }

      case "remind": {
        const timeStr = interaction.options.getString("time");
        const task = interaction.options.getString("task");

        const seconds = parseTimeString(timeStr);
        if (seconds === null || seconds <= 0) return interaction.reply("⚠️ Invalid time format! Use HH:MM:SS.");

        await interaction.reply(`✅ Okay! I will remind you in ${timeStr}: **${task}**`);
        setTimeout(() => {
          interaction.followUp(`⏰ Reminder: ${task}`);
        }, seconds * 1000);
        break;
      }
    }
  }

  // Button interactions for Truth/Dare
  if (interaction.isButton()) {
    await interaction.deferUpdate().catch(() => {});

    let type = interaction.customId;
    if (type === "random") type = Math.random() > 0.5 ? "truth" : "dare";

    const session = truthDareSessions.get(interaction.user.id) || { count: 0 };
    session.count += 1;

    const embed = buildTruthDareEmbed(interaction.user, type, session.count);

    // Disable previous card's buttons
    try {
      await interaction.message.edit({
        embeds: interaction.message.embeds,
        components: [buildTruthDareButtons(true)], // disable old buttons
      });
    } catch (e) {
      console.error("Failed to disable old buttons:", e);
    }

    // Send new card
    await interaction.message.reply({
      embeds: [embed],
      components: [buildTruthDareButtons()],
      allowedMentions: { repliedUser: true },
    });

    truthDareSessions.set(interaction.user.id, session);
  }
});

client.login(process.env.DISCORD_TOKEN);