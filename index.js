import { Client, GatewayIntentBits } from "discord.js";
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
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

async function askAI(prompt, retries = 3) {
  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/google/flan-t5-small",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HF_TOKES}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ inputs: prompt })
      }
    );

    console.log("HF status:", response.status); // debug status
    const data = await response.json();
    console.log("HF data:", data); // debug returned data

    if (data.error) {
      if (retries > 0) {
        console.log("⚡ Model busy. Retrying in 2 seconds...");
        await new Promise(res => setTimeout(res, 2000));
        return askAI(prompt, retries - 1);
      } else {
        return "⚠️ Model is busy or loading. Try again in a moment!";
      }
    }

    if (Array.isArray(data) && data[0]?.generated_text) return data[0].generated_text;
    if (data.generated_text) return data.generated_text;

    return "🤖 I couldn’t think of an answer.";
  } catch (err) {
    console.error("HF connection error:", err);
    if (retries > 0) {
      console.log("🔄 Retrying connection in 2 seconds...");
      await new Promise(res => setTimeout(res, 2000));
      return askAI(prompt, retries - 1);
    }
    return "❌ Error connecting to AI. Check your HF_TOKES or network.";
  }
}

// =========================
// Cooldowns + Request Queue
// =========================
const cooldowns = new Map();
const queue = [];
let processing = false;

async function processQueue() {
  if (processing || queue.length === 0) return;
  processing = true;

  const { message, prompt } = queue.shift();
  try {
    const reply = await askAI(prompt);
    await message.reply(reply);
  } catch (err) {
    console.error(err);
    await message.reply("❌ Something went wrong while processing your request.");
  }

  processing = false;
  setTimeout(processQueue, 1500); // 1.5s delay between requests
}

// =========================
// Message Handling
// =========================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // -------------------------
  // Basic commands
  // -------------------------
  if (message.content === "!ping") return message.reply("Pong! 🏓");
  if (message.content === "!hello") return message.reply("Hello there! 👋");

  // -------------------------
  // AI / Fun commands
  // -------------------------
  const aiCommands = {
    "!ask": (msg) => msg.content.replace("!ask", "").trim(),
    "!joke": () => "Tell me a funny short joke.",
    "!math": () => "Give me a random simple math problem for practice.",
    "!fact": () => "Tell me a random interesting educational fact.",
    "!truth": () => "Give me a fun 'Truth' question for a truth or dare game.",
    "!dare": () => "Give me a fun 'Dare' challenge for a truth or dare game.",
    "!meme": () => "Write a funny meme caption in one line."
  };

  const command = Object.keys(aiCommands).find((c) => message.content.startsWith(c));
  if (command) {
    const userId = message.author.id;
    const now = Date.now();

    if (cooldowns.has(userId) && now - cooldowns.get(userId) < 5000) {
      return message.reply("⏳ Please wait a few seconds before using another AI command.");
    }
    cooldowns.set(userId, now);

    const prompt = aiCommands[command](message);
    if (!prompt) return message.reply("❓ Please provide a valid question/text.");

    queue.push({ message, prompt });
    processQueue();
    return;
  }

  // -------------------------
  // Reminder command
  // -------------------------
  if (message.content.startsWith("!remind")) {
    const parts = message.content.split(" ");
    if (parts.length < 3) return message.reply("⏰ Usage: !remind <time-in-seconds> <task>");

    const time = parseInt(parts[1]);
    const task = parts.slice(2).join(" ");

    if (isNaN(time)) return message.reply("⚠️ Time must be a number (in seconds).");

    message.reply(`✅ Okay! I will remind you in ${time} seconds: **${task}**`);
    setTimeout(() => {
      message.reply(`⏰ Reminder: ${task}`);
    }, time * 1000);
  }
});

client.login(process.env.DISCORD_TOKEN);