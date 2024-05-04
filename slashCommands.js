const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, ActionRowBuilder, ButtonBuilder, EmbedBuilder, SelectMenuBuilder } = require('@discordjs/builders');
const { TextInputStyle, ButtonStyle, InteractionType } = require('discord.js');
const fs = require('fs').promises;
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
        await rest.put(Routes.applicationCommands(clientId), { body: commands });
        console.log('Successfully reloaded application (/) commands globally.');
    } catch (error) {
        console.error(error);
    }
}

async function handleSlashCommand(interaction, client) {
    switch (interaction.commandName) {
        case 'hilfe':
            const helpMessage = `Huch, ich habe gehört, dass ich dir helfen kann?\nIch kann dir momentan folgende Funktionen anbieten, die du auf dem Server ausführen kannst:\n\n- **/hilfe** - Erhalte Hilfe von Helpina 🤩!\n- **/rename** - Ändere deinen Nicknamen!\n- **/einführung** - Starte die Einführung erneut.\n- **/blacklist** - Manage the blacklist for the server.\n\nSuchst du Guides, oder brauchst andere Hilfe?\n[Hier sind die Guides](${config.guideCH})\n\nDu kannst auch einfach die anderen RevenGER fragen \n[Andere RevenGER fragen](${config.revengerCH})`;
            await interaction.user.send(helpMessage);
            await interaction.reply({ content: 'Ich habe dir eine DM mit weiteren Informationen geschickt!', ephemeral: true });
            break;
        case 'rename':
            await interaction.showModal(createRenameModal());
            break;
        case 'einführung':
            client.emit('guildMemberAdd', interaction.member);
            await interaction.reply({ content: 'Die Einführung wurde neu gestartet!', ephemeral: true });
            break;
        case 'blacklist':
            if (!interaction.member.roles.cache.has(config.leaderRoleId) && !interaction.member.roles.cache.has(config.vizeRoleId)) {
                return interaction.reply({ content: "Du bist kein Führungsmitglied und darfst diesen Command nicht nutzen!", ephemeral: true });
            }
            showSelectMenu(interaction);
            break;
    }
}

function createRenameModal() {
    return new ModalBuilder()
        .setCustomId('renameNicknameModal')
        .setTitle('Namensänderung')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('nickname')
                    .setLabel("Neuer Nickname")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setPlaceholder('Gib deinen neuen Nickname ein')
            )
        );
}

function createAddUserModal() {
    return new ModalBuilder()
        .setCustomId('addUserModal')
        .setTitle('Benutzer zur Blacklist hinzufügen')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('username')
                    .setLabel("Benutzername")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setPlaceholder('Benutzername hier eingeben')
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('reason')
                    .setLabel("Begründung für Blacklist")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setPlaceholder('Begründung hier eingeben')
            )
        );
}

async function showSelectMenu(interaction) {
    const rawData = await fs.readFile('blacklist.json', 'utf8');
    const blacklist = JSON.parse(rawData).map(user => formatBlacklistEntry(user));  // Format each entry

    const options = blacklist.map((user, index) => ({
        label: user.username,
        description: user.reason.substring(0, 50),
        value: `user-${index}`
    }));

    const selectMenu = new SelectMenuBuilder()
        .setCustomId('select-blacklist-user')
        .setPlaceholder('Wähle einen Benutzer')
        .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);
    const addButton = new ButtonBuilder()
        .setCustomId('add-new-blacklist-user')
        .setLabel('Benutzer hinzufügen')
        .setStyle(ButtonStyle.Success);

    await interaction.reply({ content: 'Verwalte die Blacklist:', components: [row, new ActionRowBuilder().addComponents(addButton)], ephemeral: true });
}


async function handleButtonInteraction(interaction) {
    if (interaction.customId === 'add-new-blacklist-user') {
        await interaction.showModal(createAddUserModal());
    }
}

async function handleSelectMenuInteraction(interaction) {
    if (interaction.customId === 'select-blacklist-user') {
        const selectedValue = interaction.values[0];
        const index = parseInt(selectedValue.split('-')[1], 10);  // Ensure index is parsed as a base-10 integer

        console.log("Selected index:", index);  // Log the index to check its value

        if (!isNaN(index)) {
            await showBlacklistUser(interaction, index);
        } else {
            await interaction.reply({ content: "Error: Invalid selection.", ephemeral: true });
        }
    }
}

async function showBlacklistUser(interaction, index) {
    try {
        const data = await fs.readFile('blacklist.json', 'utf8');
        const blacklist = JSON.parse(data);

        if (index < 0 || index >= blacklist.length) {
            throw new Error("Index out of bounds");
        }

        const user = blacklist[index];

        const modal = new ModalBuilder()
            .setCustomId(`edit-blacklist-user-${index}`)
            .setTitle('Benutzer bearbeiten');

        const usernameInput = new TextInputBuilder()
            .setCustomId('username')
            .setLabel('Benutzername')
            .setStyle(TextInputStyle.Short)
            .setValue(user.username || '')
            .setRequired(true);

        const reasonInput = new TextInputBuilder()
            .setCustomId('reason')
            .setLabel('Begründung')
            .setStyle(TextInputStyle.Paragraph)
            .setValue(user.reason || '')
            .setRequired(true);

        const firstActionRow = new ActionRowBuilder().addComponents(usernameInput);
        const secondActionRow = new ActionRowBuilder().addComponents(reasonInput);

        modal.addComponents(firstActionRow, secondActionRow);

        await interaction.showModal(modal);
    } catch (error) {
        console.error('Error showing blacklist user:', error);
        await interaction.reply({ content: `Failed to edit user: ${error.message}`, ephemeral: true });
    }
}







function formatBlacklistEntry(user) {
    // Ensure all required fields are present
    return {
        username: user.username,
        reason: user.reason,
        date: user.date || new Date().toISOString().split('T')[0], // Use current date if not provided
        addedBy: user.addedBy || 'System', // Default to 'System' if not provided
        additionalNotes: user.additionalNotes || '' // Default to an empty string if not provided
    };
}


async function handleModalSubmitInteraction(interaction) {
    if (interaction.customId.startsWith('edit-blacklist-user')) {
        const indexPart = interaction.customId.split('-')[3]; // Make sure the index is the correct part
        const index = parseInt(indexPart, 10);
        
        if (isNaN(index)) {
            return interaction.reply({ content: "Invalid user index format.", ephemeral: true });
        }

        const data = await fs.readFile('blacklist.json', 'utf8');
        const blacklist = JSON.parse(data);

        if (index < 0 || index >= blacklist.length) {
            return interaction.reply({ content: "Error: User index out of bounds.", ephemeral: true });
        }

        const user = blacklist[index];
        const username = interaction.fields.getTextInputValue('username');
        const reason = interaction.fields.getTextInputValue('reason');

        // Update user data
        user.username = username;
        user.reason = reason;
        user.date = new Date().toISOString().split('T')[0];
        user.addedBy = interaction.user.tag;

        await fs.writeFile('blacklist.json', JSON.stringify(blacklist, null, 4));
        await interaction.reply({ content: "Blacklist updated successfully.", ephemeral: true });
        // await logAction(`Blacklist updated: **${username}** by **${interaction.user.tag}**`);
    } else if (interaction.customId === 'addUserModal') {
        const username = interaction.fields.getTextInputValue('username');
        const reason = interaction.fields.getTextInputValue('reason');

        const blacklist = JSON.parse(await fs.readFile('blacklist.json', 'utf8'));

        const newEntry = {
            username,
            reason,
            date: new Date().toISOString().split('T')[0],
            addedBy: interaction.user.tag,
            additionalNotes: ''
        };

        blacklist.push(newEntry);
        await fs.writeFile('blacklist.json', JSON.stringify(blacklist, null, 4));
        await interaction.reply({ content: `${username} added to the blacklist.`, ephemeral: true });
        //await logActionSlashcommands(`New blacklist addition: **${username}** by **${interaction.user.tag}**`);
    }
}







module.exports = {
    registerCommands,
    handleSlashCommand,
    handleButtonInteraction,
    handleSelectMenuInteraction,
    handleModalSubmitInteraction
};