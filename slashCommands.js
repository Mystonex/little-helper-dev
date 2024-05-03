const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, ActionRowBuilder, ButtonBuilder, EmbedBuilder } = require('@discordjs/builders');
const { TextInputStyle, ButtonStyle } = require('discord.js'); // Ensure ButtonStyle is imported from 'discord.js'
const fs = require('fs').promises; // For file operations
const config = require('./config'); 
require('dotenv').config();

const commands = [
    new SlashCommandBuilder()
        .setName('hilfe')
        .setDescription('Erhalte Hilfe von Helpina 🤩!')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('rename')
        .setDescription('Ändere deinen Nicknamen!')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('einführung')
        .setDescription('Starte die Einführung erneut!')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('blacklist')
        .setDescription('Blacklist Managen ❌.')
        .toJSON()
];

const rest = new REST({ version: '9' }).setToken(process.env.BOT_TOKEN);

async function registerCommands(clientId) {
    try {
        console.log('Started refreshing application (/) commands globally.');
        await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands }
        );
        console.log('Successfully reloaded application (/) commands globally.');
    } catch (error) {
        console.error(error);
    }
}

async function handleSlashCommand(interaction, client) {
    if (interaction.commandName === 'hilfe') {
        try {
            const helpMessage = `Huch, ich habe gehört, dass ich dir helfen kann?\nIch kann dir momentan folgende Funktionen anbieten, die du auf dem Server ausführen kannst:\n\n- **/hilfe** - Erhalte Hilfe von Helpina 🤩!\n- **/rename** - Ändere deinen Nicknamen!\n- **/einführung** - Starte die Einführung erneut.\n- **/blacklist** - Manage the blacklist for the server.\n\nSuchst du Guides, oder brauchst andere Hilfe?\n[Hier sind die Guides](${config.guideCH})\n\nDu kannst auch einfach die anderen RevenGER fragen \n[Andere RevenGER fragen](${config.revengerCH})`;
            await interaction.user.send(helpMessage);
            await interaction.reply({ content: 'Ich habe dir eine DM mit weiteren Informationen geschickt!', ephemeral: true });
        } catch (error) {
            console.error('Error sending DM:', error);
            await interaction.reply({ content: 'Konnte die DM nicht senden. Bitte prüfe, ob du in deinen Sicherheitseinstellungen, das zustellen von DMs von Fremden erlaubst.', ephemeral: true });
        }
    } else if (interaction.commandName === 'rename') {
        const modal = new ModalBuilder()
            .setCustomId('renameNicknameModal')
            .setTitle('Namensänderung')
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('nickname')
                        .setLabel("Dein neuer Nickname")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setPlaceholder('Neuer Nickname (max. 32 Zeichen)')
                )
            );
        await interaction.showModal(modal);
    } else if (interaction.commandName === 'einführung') {
        client.emit('guildMemberAdd', interaction.member);
        await interaction.reply({ content: 'Die Einführung wurde neu gestartet!', ephemeral: true });
    } else if (interaction.commandName === 'blacklist') {
        console.log('Blacklist command triggered');  // Debug log
        if (!interaction.member.roles.cache.has(config.leaderRoleId) && !interaction.member.roles.cache.has(config.vizeRoleId)) {
            console.log('Role check failed');  // Debug log
            return interaction.reply({ content: "Du bist kein Führungsmitglied, und darfst diesen Command nicht nutzen! 😵", ephemeral: true });
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('add_to_blacklist')
                    .setLabel('Jemand zur Blacklist hinzufügen')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('show_blacklist')
                    .setLabel('Aktuelle Blacklist anzeigen')
                    .setStyle(ButtonStyle.Secondary)
            );

        const blacklistChannel = await client.channels.fetch(config.blacklistCH); // Fetching the specific channel to send the message
        if(blacklistChannel) {
            await blacklistChannel.send({ content: "Wähle eine Option:", components: [row] });
            await interaction.reply({ content: 'Die Blacklist-Funktionen stehen dir unten zur verfügung.', ephemeral: true });
        } else {
            await interaction.reply({ content: "Blacklist Channel nicht gefunden - prüfe dia Variabeln oder melde dich bei Nex.", ephemeral: true });
        }
    }
}

async function handleModalSubmitInteraction(interaction) {
    if (interaction.customId === 'blacklist_modal') {
        const username = interaction.fields.getTextInputValue('blacklist_name');
        const reason = interaction.fields.getTextInputValue('blacklist_reason');
        const addedBy = interaction.user.tag;

        const newEntry = {
            username: username,
            reason: reason,
            date: new Date().toISOString().split('T')[0],
            addedBy: addedBy,
            additionalNotes: ''
        };

        const data = await fs.readFile('blacklist.json', 'utf8');
        const blacklist = JSON.parse(data);
        blacklist.push(newEntry);
        await fs.writeFile('blacklist.json', JSON.stringify(blacklist, null, 4));

        await interaction.reply({ content: `${username} has been added to the blacklist.`, ephemeral: true });
    }
}

async function handleButtonInteraction(interaction) {
    if (interaction.customId === 'add_to_blacklist') {
        const modal = new ModalBuilder()
            .setCustomId('blacklist_modal')
            .setTitle('Blacklist Manager')
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('blacklist_name')
                        .setLabel("Spielername")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setPlaceholder('Sein Ingame Name - z.B KnochenJochen')
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('blacklist_reason')
                        .setLabel("Begründung")
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                        .setPlaceholder('Beispiel: Hat Domschis witze nicht lustig gefunden')
                )
            );
        await interaction.showModal(modal);
    } else if (interaction.customId === 'show_blacklist') {
        const data = await fs.readFile('blacklist.json', 'utf8');
        const blacklist = JSON.parse(data); // Corrected line
        const embed = new EmbedBuilder()
            .setTitle('Mitglieder auf der Blacklist')
            .setDescription(blacklist.map(b => `**${b.username}**: ${b.reason}`). join('\n'))
            .setColor(0xff0000);

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
}


module.exports = { registerCommands, handleSlashCommand, handleModalSubmitInteraction, handleButtonInteraction };
