require('dotenv').config();
const path = require('path');
const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder
} = require('discord.js');

const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    getVoiceConnection // <-- NEW: Imported to check active connections
} = require('@discordjs/voice');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

// --- CONFIGURATION ---
const HELL_VC_ID = '1520944167667105792';
const MP3_FILE_PATH = path.join(__dirname, 'audio.mp3');

// NEW: The rosters for each game.
// Replace the dummy IDs with your friends' actual Discord User IDs!
const GAME_ROSTERS = {
    'tds': ['716313471960219699', '798139061004009472', '523917495862689813', '536263205060870184', '554380697469452288'],
};

const INSULTS = {
    'max': ['POOR MOLDOVAN BOY', 'RETARDED FUCK', 'CHUD'],
    'void': ['NAZI', 'IDOT'],
}

// --- SLASH COMMAND DEFINITIONS ---
const notifyCommand = new SlashCommandBuilder()
.setName('notify')
.setDescription('Drafts the squad for a specific game.')
.addStringOption(option =>
option.setName('game')
.setDescription('Select the game you want to play')
.setRequired(true)
.addChoices(
    { name: 'TDS', value: 'tds' },
)
);

const hellCommand = new SlashCommandBuilder()
.setName('hell')
.setDescription('Moves a user to a specific VC and plays an audio file.')
.addUserOption(option =>
option.setName('target')
.setDescription('The user to send to hell')
.setRequired(true)
);

// --- BOT STARTUP ---
client.once('ready', async () => {
    console.log(`Bot is online! Logged in as ${client.user.tag}`);

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('Registering slash commands...');
        await rest.put(
            Routes.applicationCommands(client.user.id),
                       { body: [notifyCommand.toJSON(), hellCommand.toJSON()] },
        );
        console.log('Successfully registered slash commands!');
    } catch (error) {
        console.error('Error registering slash commands:', error);
    }
});

// --- COMMAND HANDLING ---
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    // --- /NOTIFY COMMAND ---
    if (interaction.commandName === 'notify') {
        await interaction.deferReply();

        // 1. Get the game the user selected from the dropdown
        const selectedGame = interaction.options.getString('game');

        // 2. Look up the array of IDs for that specific game
        const targetUserIds = GAME_ROSTERS[selectedGame];

        // 3. Just in case a game has an empty array
        if (!targetUserIds || targetUserIds.length === 0) {
            return interaction.editReply(`❌ Nobody is configured in the roster for **${selectedGame}**!`);
        }

        // 4. Format the ping string
        const pingString = targetUserIds.map(id => `<@${id}>`).join(' ');

        let successCount = 0;
        let failCount = 0;

        // 5. Send out the DMs
        for (const userId of targetUserIds) {
            try {
                const user = await client.users.fetch(userId);
                if (user) {
                    await user.send(`**GET ON THE FUCKING GAME GET ON GET ON GET ON GET ON**`);
                    successCount++;
                }
            } catch (error) {
                failCount++;
            }
        }

        // 6. Send the final confirmation in the channel
        const gameNameDisplay = selectedGame.toUpperCase();
        await interaction.editReply(`🔔 **${gameNameDisplay} DRAFT!** GET THE FUCK ON!!! ${pingString}\n\n *Successfully drafted ${successCount} users. (Failed to draft ${failCount} users).*`);
    }

    // --- /HELL COMMAND ---
    if (interaction.commandName === 'hell') {
        await interaction.deferReply();

        // --- NEW SAFEGUARD ---
        // Check if the bot is already connected to a voice channel in this server
        const existingConnection = getVoiceConnection(interaction.guild.id);
        if (existingConnection) {
            return interaction.editReply('❌ I am already busy banishing someone. Get out of my sight, kid.');
        }
        // ---------------------

        const targetMember = interaction.options.getMember('target');

        if (!targetMember.voice.channelId) {
            if (interaction.user.id === '554380697469452288') {
                let insult = INSULTS['max'][Math.floor(Math.random() * INSULTS['max'].length)];
                return interaction.editReply(`❌ **${targetMember.user.username}** HEY YOU DUMB FUCKING ${insult}, THAT GUY ISN'T IN A VC I CAN'T MOVE HIM!!!!!.`);
            } else if (interaction.user.id === '536263205060870184') {
                let insult = INSULTS['void'][Math.floor(Math.random() * INSULTS['void'].length)];
                return interaction.editReply(`❌ **${targetMember.user.username}** HEY YOU DUMB FUCKING ${insult}, THAT GUY ISN'T IN A VC I CAN'T MOVE HIM!!!!!.`);
            }
        }

        try {
            await targetMember.voice.setChannel('1520944167667105792');

            const connection = joinVoiceChannel({
                channelId: '1520944167667105792',
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
            });

            const player = createAudioPlayer();
            const resource = createAudioResource(MP3_FILE_PATH);

            player.play(resource);
            connection.subscribe(player);

            await interaction.editReply(` Banished **${targetMember.user.username}** to hell.`);

            setTimeout(() => {
                if (connection) {
                    player.stop();
                    connection.destroy();
                    console.log('Successfully left the voice channel.');
                }
            }, 5000);

        } catch (error) {
            console.error('Error in /hell command:', error);
            await interaction.editReply('❌ Something went wrong while trying to execute the command. You did something wrong. Its your fault.');
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
