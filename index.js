const { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  SlashCommandBuilder, 
  Routes, 
  REST, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require('discord.js');
const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel],
});

// ================== Express keep-alive ==================
const app = express();
app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(3000, () => console.log('Uptime server started.'));

// ================== Slash Commands ==================
const commands = [
  new SlashCommandBuilder().setName('funny').setDescription('Get a funny meme'),
  new SlashCommandBuilder().setName('chill').setDescription('Get a chill meme'),
  new SlashCommandBuilder().setName('truthordare').setDescription('Start a Truth or Dare game')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Registering slash commands...');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('Commands registered ✅');
  } catch (error) {
    console.error(error);
  }
})();

// ================== Meme Fetching ==================
async function fetchRedditMeme(subreddit) {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=50`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.data) return null;
    const posts = data.data.children.filter(p => p.data && !p.data.over_18);

    // filter image posts
    const imgPosts = posts.filter(p => /\.(jpg|jpeg|png|gif|webp)$/i.test(p.data.url));
    const pick = imgPosts.length > 0 
      ? imgPosts[Math.floor(Math.random() * imgPosts.length)] 
      : posts[Math.floor(Math.random() * posts.length)];

    return {
      title: pick.data.title,
      url: pick.data.url,
      postLink: `https://reddit.com${pick.data.permalink}`
    };
  } catch (err) {
    console.error(err);
    return null;
  }
}

// ================== Truth or Dare Questions ==================
const truths = [
  "What’s the most embarrassing thing you’ve ever done?",
  "Have you ever kept a big secret from your best friend?",
  "What’s your biggest fear?"
];

const dares = [
  "Send a funny meme in this chat right now!",
  "Speak in emojis only for the next 2 minutes.",
  "Do 10 pushups and tell us when you’re done!"
];

let cardCounter = 0;

// ================== Event Handlers ==================
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    // ----- FUNNY -----
    if (interaction.commandName === 'funny') {
      await interaction.deferReply();
      const meme = await fetchRedditMeme('memes');
      if (!meme) return interaction.editReply("Couldn't fetch a meme right now 😢");

      const embed = new EmbedBuilder()
        .setTitle(meme.title)
        .setURL(meme.postLink)
        .setImage(meme.url)
        .setColor('Random');

      await interaction.editReply({ embeds: [embed] });
    }

    // ----- CHILL -----
    if (interaction.commandName === 'chill') {
      await interaction.deferReply();
      const meme = await fetchRedditMeme('wholesomememes');
      if (!meme) return interaction.editReply("Couldn't fetch a chill meme right now 😢");

      const embed = new EmbedBuilder()
        .setTitle(meme.title)
        .setURL(meme.postLink)
        .setImage(meme.url)
        .setColor('Random');

      await interaction.editReply({ embeds: [embed] });
    }

    // ----- TRUTH OR DARE -----
    if (interaction.commandName === 'truthordare') {
      cardCounter++;
      const type = Math.random() > 0.5 ? 'Truth' : 'Dare';
      const question = type === 'Truth'
        ? truths[Math.floor(Math.random() * truths.length)]
        : dares[Math.floor(Math.random() * dares.length)];

      const embed = new EmbedBuilder()
        .setAuthor({ name: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
        .setDescription(`**${question}**`)
        .setColor('Random')
        .setFooter({ text: `Type: ${type} | Card #${cardCounter}` });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('truth').setLabel('Truth').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('dare').setLabel('Dare').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('random').setLabel('Random').setStyle(ButtonStyle.Secondary)
      );

      await interaction.reply({ embeds: [embed], components: [row] });
    }
  }

  // ----- TRUTH/DARE BUTTONS -----
  if (interaction.isButton()) {
    await interaction.deferReply({ ephemeral: true });

    let type;
    if (interaction.customId === 'truth') type = 'Truth';
    if (interaction.customId === 'dare') type = 'Dare';
    if (interaction.customId === 'random') type = Math.random() > 0.5 ? 'Truth' : 'Dare';

    cardCounter++;
    const question = type === 'Truth'
      ? truths[Math.floor(Math.random() * truths.length)]
      : dares[Math.floor(Math.random() * dares.length)];

    const embed = new EmbedBuilder()
      .setAuthor({ name: `Requested by ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
      .setDescription(`**${question}**`)
      .setColor('Random')
      .setFooter({ text: `Type: ${type} | Card #${cardCounter}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('truth').setLabel('Truth').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('dare').setLabel('Dare').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('random').setLabel('Random').setStyle(ButtonStyle.Secondary)
    );

    // reply to old card (thread-style ping)
    const replied = await interaction.message.reply({ embeds: [embed], components: [row] });
    await interaction.editReply({ content: "✅ New card created!", ephemeral: true });
  }
});

client.login(process.env.TOKEN);