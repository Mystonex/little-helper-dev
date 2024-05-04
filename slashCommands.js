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
                    .setCustomId('reason')
                    .setLabel("Begründung für Blacklist")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setPlaceholder('Bsp: Lacht nicht über Doms Witze. 😤')
            )
        );
}

async function showSelectMenu(interaction) {
    const rawData = await fs.readFile('blacklist.json', 'utf8');
    const blacklist = JSON.parse(rawData).map(user => formatBlacklistEntry(user));

    const options = blacklist.map((user, index) => ({
        label: `${index + 1}. ${user.username}`, // Prepend index to the username
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
    const listButton = new ButtonBuilder()
        .setCustomId('list-blacklist-users')
        .setLabel('Benutzerliste Anschauen')
        .setStyle(ButtonStyle.Primary);
    const postButton = new ButtonBuilder()
        .setCustomId('post-blacklist')
        .setLabel('Blacklist Posten')
        .setStyle(ButtonStyle.Secondary);

    await interaction.reply({ content: 'Verwalte die Blacklist:', components: [row, new ActionRowBuilder().addComponents(addButton, listButton, postButton)], ephemeral: true });
}





async function handleButtonInteraction(interaction) {
    if (interaction.customId.startsWith('add-new-blacklist-user')) {
        await interaction.showModal(createAddUserModal());
    } else if (interaction.customId.startsWith('list-blacklist-users')) {
        await sendBlacklistContent(interaction);
    } else if (interaction.customId.startsWith('edit-user-')) {
        const index = parseInt(interaction.customId.split('-')[2], 10);
        await showBlacklistUser(interaction, index);
    } else if (interaction.customId.startsWith('delete-user-')) {
        const index = parseInt(interaction.customId.split('-')[2], 10);
        await deleteBlacklistUser(interaction, index);
    } else if (interaction.customId.startsWith('start-discussion-')) {
        const index = parseInt(interaction.customId.split('-')[2], 10);
        await startDiscussion(interaction, index);
    } else if (interaction.customId.startsWith('post-blacklist')) {
        await postBlacklist(interaction);
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
        content: `**Blacklist-Grund:** \n*${user.reason}*\n\n**Gebannt von:** \n${user.addedBy}\n\n**Gebannt am:** \n${user.date} (Das sind jetzt ${diffDays} Tage)\n------\nWas willst du ansprechen **${interaction.user.tag}**?`
    });

    await interaction.reply({ content: `Diskussionsthread gestartet für **${user.username}**.`, ephemeral: true });
}




async function handleSelectMenuInteraction(interaction) {
    const selectedValue = interaction.values[0];
    const index = parseInt(selectedValue.split('-')[1], 10);

    if (!isNaN(index)) {
        const userOptions = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`edit-user-${index}`)
                    .setLabel('Editieren')
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

        await interaction.reply({ content: "Was möchtest du Tun?", components: [userOptions], ephemeral: true });
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
        .setTitle('Edit Blacklist User')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('username')
                    .setLabel('Username')
                    .setStyle(TextInputStyle.Short)
                    .setValue(user.username)
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('reason')
                    .setLabel('Reason')
                    .setStyle(TextInputStyle.Paragraph)
                    .setValue(user.reason)
                    .setRequired(true)
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
            .setDescription('Hier sind die aktuellen Einträge der Blacklist.');

        blacklist.forEach((user, index) => {
            const truncatedReason = user.reason.length > 1020 ? `${user.reason.substring(0, 1017)}...` : user.reason;
            // Adding a separator before each entry except the first
            const separator = index === 0 ? '' : '\n-----------------------------\n';
            embed.addFields({ 
                name: `${separator}${index + 1}. ${user.username}`, 
                value: `**Begründung:** ${truncatedReason}`, 
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
            return interaction.reply({ content: "Invalid user index format. Ask Nex for Help :D", ephemeral: true });
        }

        const data = await fs.readFile('blacklist.json', 'utf8');
        const blacklist = JSON.parse(data);

        if (index < 0 || index >= blacklist.length) {
            return interaction.reply({ content: "Error: User index out of bounds. Ask Nex for Help :D", ephemeral: true });
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
        await interaction.reply({ content: "Blacklist wurde erfolgreich aktualisert.", ephemeral: true });
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
        await interaction.reply({ content: `**${username}** mit kleinem 🤏 wurde der Blacklist hinzugefügt. War sicher berechtigt 🤭.`, ephemeral: true });
        //await logActionSlashcommands(`New blacklist addition: **${username}** by **${interaction.user.tag}**`);
    }
}


async function deleteBlacklistUser(interaction, index) {
    const data = await fs.readFile('blacklist.json', 'utf8');
    const blacklist = JSON.parse(data);
    if (index < 0 || index >= blacklist.length) {
        await interaction.reply({ content: "Index out of bounds - ask Nex for help :D", ephemeral: true });
        return;
    }
    
    blacklist.splice(index, 1);
    await fs.writeFile('blacklist.json', JSON.stringify(blacklist, null, 4));
    await interaction.reply({ content: "Benutzer aus der Blacklist entfernt. 👾.", ephemeral: true });
}





async function postBlacklist(interaction) {
    try {
        const data = await fs.readFile('blacklist.json', 'utf8');
        const blacklist = JSON.parse(data);
        const today = new Date().toLocaleDateString("de-DE"); // Format date as DD.MM.YYYY
        let currentEmbed = new EmbedBuilder()
            .setTitle(`Aktuelle Blacklist - Stand vom: ${today}`)
            .setColor(0x0099FF);

        blacklist.forEach((user, index) => {
            // Add the separator for entries after the first
            const separator = index === 0 ? '' : '\n────────────────────────────────────────\n';
            const entryText = `**Begründung:** ${user.reason.length > 1020 ? `${user.reason.substring(0, 1017)}...` : user.reason}\n**Hinzugefügt am:** ${user.date}\n**Hinzugefügt von:** ${user.addedBy}`;

            if (index > 0) { // Add separator before the entry if it's not the first entry
                currentEmbed.addFields({ name: '\u200b', value: separator, inline: false });
            }

            currentEmbed.addFields({ name: `${index + 1}. ${user.username}`, value: entryText, inline: false });
        });

        // Check if the current embed exceeds Discord's character limit and handle appropriately
        if (currentEmbed.toJSON().length > 6000 || currentEmbed.data.fields.length >= 25) {
            // Handle splitting into multiple embeds or messages here
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