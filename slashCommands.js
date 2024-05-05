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


const path = require('path');

// Utility function to write to an audit log
async function auditLog(type, username, data) {
    const timestamp = new Date().toISOString().replace(/:/g, '-'); // Replace colons in timestamps to ensure file name is valid
    const sanitizedUsername = username.replace(/[^a-zA-Z0-9]/g, '_'); // Replace any non-alphanumeric characters in username
    const folderPath = path.join(__dirname, 'Blacklist-Auditing', type);
    const filePath = path.join(folderPath, `${type}-${sanitizedUsername}-${timestamp}.json`);

    console.log(`Folder path: ${folderPath}`);
    console.log(`File path: ${filePath}`);

    try {
        await fs.mkdir(folderPath, { recursive: true });
        await fs.writeFile(filePath, JSON.stringify(data, null, 4));
        console.log(`Audit log created: ${filePath}`);
    } catch (error) {
        console.error('Failed to create audit log:', error);
    }
}







async function handleSlashCommand(interaction, client, logAction) {
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
                return interaction.reply({ content: "Du bist kein Führungsmitglied und darfst diesen Command nicht nutzen! 🤡", ephemeral: true });
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
                    .setLabel("Name")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setPlaceholder('Namen hier eingeben')
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('shortReason')
                    .setLabel("Kurzbegründung")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setPlaceholder('Bsp: Unfreundlich')
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('longReason')
                    .setLabel("Ausführliche Begründung")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false)
                    .setPlaceholder('Ausführliche Erklärung, warum der Benutzer auf die Blacklist kommt.')
            )
        );
}


async function showSelectMenu(interaction) {
    const addButton = new ButtonBuilder()
        .setCustomId('add-new-blacklist-user')
        .setLabel('Benutzer hinzufügen')
        .setStyle(ButtonStyle.Success);
    const listButton = new ButtonBuilder()
        .setCustomId('list-blacklist-users')
        .setLabel('Blacklist Anschauen')
        .setStyle(ButtonStyle.Secondary);
    const editButton = new ButtonBuilder()
        .setCustomId('edit-blacklist-user')
        .setLabel('Benutzer bearbeiten')
        .setStyle(ButtonStyle.Primary);
    const postButton = new ButtonBuilder()
        .setCustomId('post-blacklist')
        .setLabel('Blacklist Posten')
        .setStyle(ButtonStyle.Secondary);

    await interaction.reply({
        content: 'Willkommen im Helpina Blacklist Manager.\nMit den Buttons unten, kannst du einzelne Funktionen aktivieren:\n\n- **Benutzer Hinzufügen** - Fügt einen neuen Benutzer der Blacklist hinzu.\n- **Benutzer Bearbeiten** - Wähle und bearbeite bestehende Blacklist-Benutzer.\n- **Blacklist Anschauen** - Zeigt dir einen aktuellen Auszug der Blacklist.\n- **Blacklist Posten** - Helpina Postet die aktuelle Blacklist im aktuellen Channel.\n\n',
        components: [new ActionRowBuilder().addComponents(addButton, editButton, listButton, postButton)],
        ephemeral: true
    });
}

async function showSelectMenuForEditing(interaction) {
    const rawData = await fs.readFile('blacklist.json', 'utf8');
    const blacklist = JSON.parse(rawData).map(user => formatBlacklistEntry(user));

    const options = blacklist.map((user, index) => ({
        label: `${index + 1}. ${user.username}`,
        description: user.reason.substring(0, 50), // Shorten the description to fit
        value: `user-${index}`
    }));

    const selectMenu = new SelectMenuBuilder()
        .setCustomId('select-blacklist-user')
        .setPlaceholder('Wähle einen Benutzer aus, um Aktionen durchzuführen.')
        .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({
        content: 'Wähle einen Benutzer aus der Liste zum Bearbeiten:',
        components: [row],
        ephemeral: true
    });
}





async function handleButtonInteraction(interaction, client, logAction) {
    if (interaction.customId.startsWith('add-new-blacklist-user')) {
        await interaction.showModal(createAddUserModal());
    } else if (interaction.customId.startsWith('list-blacklist-users')) {
        await sendBlacklistContent(interaction);
    } else if (interaction.customId.startsWith('edit-user-')) {
        const index = parseInt(interaction.customId.split('-')[2], 10);
        await showBlacklistUser(interaction, index, client, logAction);
    } else if (interaction.customId.startsWith('delete-user-')) {
        const index = parseInt(interaction.customId.split('-')[2], 10);
        await deleteBlacklistUser(interaction, index, client, logAction);
    } else if (interaction.customId.startsWith('start-discussion-')) {
        const index = parseInt(interaction.customId.split('-')[2], 10);
        await startDiscussion(interaction, index, client, logAction);
    } else if (interaction.customId.startsWith('post-blacklist')) {
        await postBlacklist(interaction, client, logAction);
    } else if (interaction.customId === 'edit-blacklist-user') {
        await showSelectMenuForEditing(interaction, client, logAction);
    }
}







async function startDiscussion(interaction, index) {
    const data = await fs.readFile('blacklist.json', 'utf8');
    const blacklist = JSON.parse(data);
    if (index < 0 || index >= blacklist.length) {
        await interaction.reply({ content: "Index out of bounds", ephemeral: true });
        return;
    }

    const user = blacklist[index];
    const banDate = new Date(user.date);
    const currentDate = new Date();
    const timeDiff = Math.abs(currentDate - banDate);
    const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24)); // Difference in days

    const message = await interaction.channel.send(`Diskussion über: **${user.username}**`);
    const thread = await message.startThread({
        name: `Diskussion: ${user.username}`,
        autoArchiveDuration: 60
    });
    await thread.send({
        content: `**Blacklist-Grund (Kurzversion):** \n*${user.reason}*\n\n**Blacklist-Grund (Auführlich):** \n*${user.additionalNotes}*\n\n**Gebannt von:** \n${user.addedBy}\n\n**Gebannt am:** \n${user.date} (Das sind jetzt ${diffDays} Tage)\n------\nWas willst du besprechen **${interaction.user.tag}**?`
    });

    await interaction.reply({ content: `Diskussionsthread gestartet für **${user.username}**.`, ephemeral: true });
}




async function handleSelectMenuInteraction(interaction) {
    const rawData = await fs.readFile('blacklist.json', 'utf8');
    const blacklist = JSON.parse(rawData);
    const selectedValue = interaction.values[0];
    const index = parseInt(selectedValue.split('-')[1], 10);

    if (!isNaN(index) && index >= 0 && index < blacklist.length) {
        const user = blacklist[index];  // Define user based on the selected index

        const userOptions = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`edit-user-${index}`)
                    .setLabel('Details')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`delete-user-${index}`)
                    .setLabel('Entfernen')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`start-discussion-${index}`)
                    .setLabel('Starte Diskussion')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ content: `Was möchtest du mit **${user.username}** tun?`, components: [userOptions], ephemeral: true });
    } else {
        await interaction.reply({ content: "Error: Was machst du, es geht nicht. Berichte Nex davon.", ephemeral: true });
    }
}




async function showBlacklistUser(interaction, index) {
    const data = await fs.readFile('blacklist.json', 'utf8');
    const blacklist = JSON.parse(data);
    if (index < 0 || index >= blacklist.length) {
        await interaction.reply({ content: "Index out of bounds", ephemeral: true });
        return;
    }

    const user = blacklist[index];
    const modal = new ModalBuilder()
        .setCustomId(`edit-blacklist-user-${index}`)
        .setTitle('Benutzer Editieren')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('username')
                    .setLabel('Namen')
                    .setStyle(TextInputStyle.Short)
                    .setValue(user.username)
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('shortReason')
                    .setLabel('Kurzbegründung')
                    .setStyle(TextInputStyle.Short)
                    .setValue(user.reason)
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('longReason')
                    .setLabel('Ausführliche Begründung')
                    .setStyle(TextInputStyle.Paragraph)
                    .setValue(user.additionalNotes)
                    .setRequired(false)
            )
        );

    await interaction.showModal(modal);
}





async function sendBlacklistContent(interaction) {
    try {
        const data = await fs.readFile('blacklist.json', 'utf8');
        const blacklist = JSON.parse(data);
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('Aktuelle Blacklist')
            .setDescription('Hier sind die aktuellen Einträge der Blacklist in Kurzform.');

        blacklist.forEach((user, index) => {
            const truncatedReason = user.reason.length > 1020 ? `${user.reason.substring(0, 1017)}...` : user.reason;
            const separator = index === 0 ? '' : '\n-----------------------------\n';
            embed.addFields({
                name: `${separator}${index + 1}. ${user.username}`,
                value: `**Kurzbegründung:** ${truncatedReason}`,
                inline: false
            });
        });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
        console.error('Error sending blacklist content:', error);
        await interaction.reply({ content: `Fehler beim Laden der Blacklist: ${error.message}`, ephemeral: true });
    }
}






function formatBlacklistEntry(user) {
    // Ensure all required fields are present
    return {
        username: user.username,
        reason: user.reason, // Now treated as the short reason
        date: user.date || new Date().toISOString().split('T')[0], // Use current date if not provided
        addedBy: user.addedBy || 'System', // Default to 'System' if not provided
        additionalNotes: user.additionalNotes || '' // Default to an empty string if not provided
    };
}



async function handleModalSubmitInteraction(interaction, client, logAction) {
    if (interaction.customId === 'addUserModal') {
        const username = interaction.fields.getTextInputValue('username');
        const shortReason = interaction.fields.getTextInputValue('shortReason');
        const longReason = interaction.fields.getTextInputValue('longReason') || '';

        const blacklist = JSON.parse(await fs.readFile('blacklist.json', 'utf8'));

        const newEntry = {
            username,
            reason: shortReason,
            date: new Date().toISOString().split('T')[0],
            addedBy: interaction.user.tag,
            additionalNotes: longReason
        };

        blacklist.push(newEntry);
        await fs.writeFile('blacklist.json', JSON.stringify(blacklist, null, 4));
        await interaction.reply({ content: `**${username}** mit kleinem 🤏 wurde der Blacklist hinzugefügt. War sicher berechtigt 🤭.`, ephemeral: true });
        await logAction(`**${interaction.user.tag}** hat **${username}** der Blacklist hinzugefügt. ❌`);
    } else if (interaction.customId.startsWith('edit-blacklist-user')) {
        const indexPart = interaction.customId.split('-')[3]; 
        const index = parseInt(indexPart, 10);

        if (isNaN(index)) {
            return interaction.reply({ content: "Invalid user index format. Ask Nex for Help :D", ephemeral: true });
        }

        const data = await fs.readFile('blacklist.json', 'utf8');
        const blacklist = JSON.parse(data);

        if (index < 0 || index >= blacklist.length) {
            return interaction.reply({ content: "Error: User index out of bounds. Ask Nex for Help :D", ephemeral: true });
        }

        const user = blacklist[index];
        const oldData = { ...user }; // Snapshot of the data before changes
        const username = interaction.fields.getTextInputValue('username');
        const shortReason = interaction.fields.getTextInputValue('shortReason');
        const longReason = interaction.fields.getTextInputValue('longReason') || user.longReason;

        // Update user data
        user.username = username;
        user.reason = shortReason;
        user.additionalNotes = longReason;
        user.date = new Date().toISOString().split('T')[0];
        user.addedBy = interaction.user.tag;

        // Log the edit before saving
        await auditLog('edits', username, { oldData, newData: user, editedBy: interaction.user.tag });

        await fs.writeFile('blacklist.json', JSON.stringify(blacklist, null, 4));
        await interaction.reply({ content: "Blacklist wurde erfolgreich aktualisiert.", ephemeral: true });
        await logAction(`**${interaction.user.tag}** hat den Blacklist-Eintrag für **${oldData.username}** angepasst. 🥸`);
    }
}





async function deleteBlacklistUser(interaction, index, client, logAction) {
    const data = await fs.readFile('blacklist.json', 'utf8');
    const blacklist = JSON.parse(data);

    // Check if the index is valid before proceeding
    if (index < 0 || index >= blacklist.length) {
        await interaction.reply({ content: "Index out of bounds - ask Nex for help :D", ephemeral: true });
        return;
    }

    // Capture the username before deleting from the array
    const deletedUsername = blacklist[index].username;  // Save the username of the user to be deleted

    // Creating a backup before deletion
    await auditLog('backups', deletedUsername, { deletedBy: interaction.user.tag, blacklist });

    // Deleting the user from the blacklist
    blacklist.splice(index, 1);
    await fs.writeFile('blacklist.json', JSON.stringify(blacklist, null, 4));
    await interaction.reply({ content: `Benutzer **${deletedUsername}** aus der Blacklist entfernt. 👾`, ephemeral: true });

    // Log the action using the saved username
    await logAction(`**${interaction.user.tag}** hat **${deletedUsername}** aus der Blacklist entfernt. ❎`);
}










async function postBlacklist(interaction) {
    try {
        const data = await fs.readFile('blacklist.json', 'utf8');
        const blacklist = JSON.parse(data);
        const today = new Date().toLocaleDateString("de-DE");
        let currentEmbed = new EmbedBuilder()
            .setTitle(`Aktuelle Blacklist - Stand vom: ${today}`)
            .setColor(0x0099FF);

        blacklist.forEach((user, index) => {
            const separator = index === 0 ? '' : '\n────────────────────────────────────────\n';
            const entryText = `**Kurzbegründung:** ${user.reason}\n**Ausführliche Begründung:** ${user.additionalNotes}\n**Hinzugefügt am:** ${user.date}\n**Hinzugefügt von:** ${user.addedBy}`;
            if (index > 0) { // Add separator before the entry if it's not the first entry
                currentEmbed.addFields({ name: '\u200b', value: separator, inline: false });
            }
            currentEmbed.addFields({ name: `${index + 1}. ${user.username}`, value: entryText, inline: false });
        });

        // Check if the current embed exceeds Discord's character limit and handle appropriately
        if (currentEmbed.toJSON().length > 6000 || currentEmbed.data.fields.length >= 25) {
            console.log("Embed is too large, consider implementing pagination or splitting into multiple messages.");
        }

        // Send the embed publicly
        await interaction.channel.send({ embeds: [currentEmbed] });
        await interaction.reply({ content: "Blacklist wurde im Kanal gepostet.", ephemeral: true });
    } catch (error) {
        console.error('Failed to post blacklist:', error);
        await interaction.reply({ content: "Es gab einen Fehler beim Posten der Blacklist.", ephemeral: true });
    }
}









module.exports = {
    registerCommands,
    handleSlashCommand,
    handleButtonInteraction,
    handleSelectMenuInteraction,
    handleModalSubmitInteraction
};