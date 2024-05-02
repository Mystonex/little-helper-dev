const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, ActionRowBuilder } = require('@discordjs/builders');
const { TextInputStyle } = require('discord.js');
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

async function handleSlashCommand(interaction, client) {  // Accept client as a parameter
    if (interaction.commandName === 'hilfe') {
        try {
            const helpMessage = `Huch, ich habe gehört, dass ich dir helfen kann?\nIch kann dir momentan folgende Funktionen anbieten, die du auf dem Server ausführen kannst:\n\n- **/hilfe** - Erhalte Hilfe von Helpina 🤩!\n- **/rename** - Ändere deinen Nicknamen!\n- **/einführung** - Starte die Einführung erneut.\n\nSuchst du Guides, oder brauchst andere Hilfe?\n[Hier sind die Guides](${config.guideCH})\n\nDu kannst auch einfach die anderen RevenGER fragen \n[Andere RevenGER fragen](${config.revengerCH})`;
            await interaction.user.send(helpMessage);
            await interaction.reply({ content: 'Ich habe dir eine DM mit weiteren Informationen geschickt!', ephemeral: true });
        } catch (error) {
            console.error('Error sending DM:', error);
            await interaction.reply({ content: 'Failed to send DM. Please ensure your DMs are open.', ephemeral: true });
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
        // Use the client passed as parameter
        client.emit('guildMemberAdd', interaction.member);
        await interaction.reply({ content: 'Die Einführung wurde neu gestartet!', ephemeral: true });
    }
}

module.exports = { registerCommands, handleSlashCommand };
