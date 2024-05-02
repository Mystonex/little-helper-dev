require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ActivityType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { registerCommands, handleSlashCommand } = require('./slashCommands');
const { setupTranslationListener } = require('./translation'); // include of the translate-bot
const config = require('./config');  



const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages  // Added to ensure the bot can send and receive DMs
    ]
});

const token = process.env.BOT_TOKEN;




function getTimestamp() {
    return new Date().toISOString();
}

async function logAction(message) {
    const logChannel = await client.channels.fetch(config.logChannelId);
    if (logChannel) {
        logChannel.send(`${message} ${getTimestamp()}`).catch(console.error);
    } else {
        console.error('Log channel not found!');
    }
}

client.once('ready', async () => {
    console.log('Bot is online!');
    logAction('🤖 Nex hat den Bot gestartet und ist nun Online 🤖');
    await registerCommands(client.user.id);  // Ensuring commands are registered after the bot is ready
    client.user.setPresence({
        activities: [{
            name: 'Wartet auf /hilfe Rufe 🤖',
            type: 4  // Custom status type
        }],
        status: 'online'
    });
    setupTranslationListener(client, `${config.dragonewsCH}`);
});



console.log('Config:', config);



client.on('interactionCreate', async interaction => {
    if (interaction.isCommand()) {
        await handleSlashCommand(interaction, client);
    }
    // Additional interaction handling logic should follow here
});


client.on('guildMemberAdd', async member => {
    const welcomeChannel = await client.channels.fetch(config.welcomeChannelId);
    const welcomeMessage = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`🤩 Willkommen bei RevenGER, ${member.user.username} 🤩`)
        .setDescription('Klicke auf den Button, um mit der Einführung zu beginnen.')
        .setImage(`${config.helloGIF}`);

    // Attach the member's user ID to the custom ID
    const rulesButton = new ButtonBuilder()
        .setCustomId(`redirectToRules-${member.user.id}`)
        .setLabel('▶️ Einführung Starten')
        .setStyle(ButtonStyle.Primary);

    await welcomeChannel.send({
        content: `Einführung`,
        embeds: [welcomeMessage],
        components: [new ActionRowBuilder().addComponents(rulesButton)]
    });

    logAction(`Willkommensnachricht an  **${member.user.tag}** gesendet 👶🏻.`);
});


client.on('interactionCreate', async interaction => {
    if (interaction.isButton()) {
        const customIdParts = interaction.customId.split('-');
        const action = customIdParts[0];
        const userId = customIdParts.length > 1 ? customIdParts[1] : null;  // Check if there's a user ID

        // Log the user IDs for debugging
        console.log(`Action: ${action}, Expected User ID: ${userId}, Actual User ID: ${interaction.user.id}`);

        // If an action requires a user ID and either it's missing or doesn't match the clicking user
        if (['redirectToRules', 'acceptRules', 'setNickname'].includes(action) && (userId === null || userId !== interaction.user.id)) {
            await logAction(`**${interaction.user.tag}** war zu Dumm um zu lesen - er wollte den Button drücken. 🤦`);
            return interaction.reply({ content: `Hey, dieser Button ist nicht für dich. Wenn ich dir helfen soll, dann schreib einfach in einen Channel /hilfe`, ephemeral: true });
        }

        switch (action) {
            case 'redirectToRules':
                await handleRedirectToRules(interaction);
                break;
            case 'acceptRules':
                await handleAcceptRules(interaction);
                break;
            case 'setNickname':
                await handleSetNickname(interaction);
                break;
            default:
                if (interaction.customId.startsWith('grantRevenger')) {
                    await handleGrantRevenger(interaction);
                }
                break;
        }
    } else if (interaction.isModalSubmit()) {
        switch (interaction.customId) {
            case 'nicknameModal':  // Handling onboarding nickname modal
                await handleNicknameModalSubmit(interaction);
                break;
            case 'renameNicknameModal':  // Handling rename command modal
                await handleNicknameModalSubmitForRename(interaction);
                break;
        }
    }
});






async function handleNicknameModalSubmitForRename(interaction) {
    const nickname = interaction.fields.getTextInputValue('nickname');
    try {
        await interaction.member.setNickname(nickname);
        await interaction.reply({
            content: `Wunderbar - Nicknamen geändert auf **${nickname}**`,
            ephemeral: true
        });
        // Log the action to whatever logging system you have set up
        logAction(`**${interaction.user.tag}** hat seinen Nicknamen mittels /rename gesetzt auf: **${nickname}**.`);
    } catch (error) {
        console.error('Failed to set nickname:', error);
        await interaction.reply({
            content: 'There was an error setting your nickname. Please contact Nex ;-).',
            ephemeral: true
        });
    }
}



async function handleNicknameModalSubmit(interaction) {
    const nickname = interaction.fields.getTextInputValue('nickname');
    try {
        await interaction.member.setNickname(nickname);
        const memberRole = interaction.guild.roles.cache.get(config.memberRoleId);
        if (memberRole) {
            await interaction.member.roles.add(memberRole);
        }
        await interaction.reply({
            content: `Top - Name gesetzt auf **${nickname}**. Du hast jetzt Zugriff auf den Standardbereich und kannst im Talk teilnehmen!\n\nSobald du von einem Lead entgegen genommen wirst, erhälst du die Rolle **"RevenGER"** und wirst in die Gilde eingeladen und hast damit Zugriff zu allen Funktionen und all unseren Guides 🤩 `,
            ephemeral: true
        });

        logAction(`Namen gesetzt  und **Friends** Rolle folgendem Benutzer vergeben **${interaction.user.tag}** (${nickname}) 🙏🏼.`);

        // Send notification to the leader channel with a button to grant the Revenger role
        const leaderChannel = await client.channels.fetch(config.leaderChannelId).catch(console.error);
        if (!leaderChannel) {
            console.error(`Leader channel with ID ${config.leaderChannelId} not found.`);
            return;
        }

        const notificationMessage = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('Neues Mitglied Eingeführt')
            .setDescription(`**${nickname}** (**${interaction.user.tag}**) hat die Einführung fertiggestellt und die Regeln akzeptiert. Die Person braucht nun noch die RevenGER Rolle sowie eine Gildeneinladung. 🤩\n\n**Wichtig**: Die Rolle erst erteilen, wenn die Person der Gilde beigetreten ist.`);

        const upgradeButton = new ButtonBuilder()
            .setCustomId(`grantRevenger-${interaction.user.id}`)
            .setLabel('RevenGER-Rolle zuweisen')
            .setStyle(ButtonStyle.Success);

        await leaderChannel.send({
            content: 'Liebes Führungsteam - eine ausstehende RevenGER-Discord-Rollenanfrage.',
            embeds: [notificationMessage],
            components: [new ActionRowBuilder().addComponents(upgradeButton)]
        }).catch(console.error);

        // Send DM with embed and buttons
        const introEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Wunderbar - du hast die Einführung erfolgreich abgeschlossen!!')
            .setDescription('Wenn du Hilfe brauchst, kannst du mich jederzeit mit "/hilfe" rufen! 🫡')
            .addFields([
                { name: 'Die nächsten Schritte:', value: '- Du hast nun Zugang zum öffentlichen Bereich\n- Sobald dich ein Leader der RevenGER-Rolle zugewiesen hat, hast du exklusiven Gildenzugang.\n- Bitte kontaktiere einen Leader, oder warte ab, bis du die Rolle erhälst  ' }
            ]);

    //    const introduceButton = new ButtonBuilder()
    //        .setLabel('Dich vorstellen')
    //        .setStyle(ButtonStyle.Link)
    //        .setURL(`${config.introductionCH}`);

        const chatwithothersButton = new ButtonBuilder()
            .setLabel('Zum öffentlichen Chat')
            .setStyle(ButtonStyle.Link)
            .setURL(`${config.generalCH}`);

    //    const guideButton = new ButtonBuilder()
    //        .setLabel('Guides anschauen')
    //        .setStyle(ButtonStyle.Link)
    //        .setURL(`${config.guideCH}`);

    //    const lvlguideButton = new ButtonBuilder()
    //        .setLabel('Low-Level Guide')
    //        .setStyle(ButtonStyle.Link)
    //        .setURL(`${config.lvguideCH}`);

    //    const skilltreeButton = new ButtonBuilder()
    //        .setLabel('Skillbaum PvE')
    //        .setStyle(ButtonStyle.Link)
    //        .setURL(`${config.skilltreeCH}`);

        const actionRow = new ActionRowBuilder()
            .addComponents(chatwithothersButton);

        await interaction.user.send({
            embeds: [introEmbed],
            components: [actionRow]
        });

    } catch (error) {
        console.error('Failed to set nickname or assign role:', error);
        await interaction.reply({
            content: 'There was an error setting your nickname or assigning your role. Please contact Nex ;-).',
            ephemeral: true
        });
    }
}





async function handleRedirectToRules(interaction) {
    const rulesChannel = await client.channels.fetch(config.rulesChannelId);
    const rulesMessage = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('**❗️Wichtig❗️**')
        .setDescription('Bitte lies dir die Regeln genau durch!')
        //.setImage(`${config.rulesGIF}`);

    // Set custom ID with the correct action name and append user ID
    const acceptRulesButton = new ButtonBuilder()
        .setCustomId(`acceptRules-${interaction.user.id}`)
        .setLabel('✅ Regeln Akzeptieren (15s)')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true);

    await rulesChannel.send({
        content: `<@${interaction.user.id}>`,
        embeds: [rulesMessage],
        components: [new ActionRowBuilder().addComponents(acceptRulesButton)]
    });

    await interaction.message.delete();

    await interaction.reply({
        content: 'Alles klar - starten wir mit deiner Einführung.\n\nAls erstes, gelangst du mittels dem unteren Button, zu unseren Regeln.',
        components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('📜 Zu unseren Regeln')
                .setStyle(ButtonStyle.Link)
                .setURL(`https://discord.com/channels/${interaction.guild.id}/${config.rulesChannelId}`)  
        )],
        ephemeral: true
    });

    logAction(`Das neue Mitglied **${interaction.user.tag}** liest sich nun die Regeln durch 🧐.`);

    // Countdown setup to enable the button after 15 seconds
    let countdown = 15;
    const countdownInterval = setInterval(async () => {
        countdown--;
        acceptRulesButton.setLabel(`✅ Regeln Akzeptieren (${countdown}s)`);
        const messages = await rulesChannel.messages.fetch({ limit: 1 });
        if (messages.size > 0) {
            const lastMessage = messages.first();
            if (lastMessage) {
                const components = lastMessage.components;
                const updatedComponents = components.map(component => {
                    const newComponent = new ActionRowBuilder();
                    component.components.forEach(btn => {
                        // Set the updated label and disabled status
                        const newButton = ButtonBuilder.from(btn).setLabel(acceptRulesButton.data.label).setDisabled(countdown > 0);
                        newComponent.addComponents(newButton);
                    });
                    return newComponent;
                });
                await lastMessage.edit({ components: updatedComponents });
            }
        }
        if (countdown === 0) {
            clearInterval(countdownInterval);
        }
    }, 1000);
}






async function handleAcceptRules(interaction) {
    const customIdParts = interaction.customId.split('-');
    if (customIdParts.length < 2) {
        console.error("Custom ID is missing the user ID part.");
        return;
    }

    const action = customIdParts[0];  // Correctly define 'action' here if needed elsewhere in the function
    const userId = customIdParts[1];  // Extract user ID from the button's customId

    if (userId !== interaction.user.id) {
        await logAction(`**${interaction.user.tag}** war zu Dumm um zu lesen - er wollte den Button drücken. 🤦`);
        return interaction.reply({ content: `Hey, dieser Button ist nicht für dich. Wenn ich dir helfen soll, dann schreib einfach in einen Channel /hilfe`, ephemeral: true });
    }

    await interaction.message.delete();

    const backToOnboardingButton = new ButtonBuilder()
        .setLabel('▶️ Zurück zur Einführung.')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${interaction.guild.id}/${config.welcomeChannelId}`);

    await interaction.reply({
        content: 'Wunderbar - du hast unsere Regeln akzeptiert.\n\nKehre jetzt zur Einführung zurück.',
        components: [new ActionRowBuilder().addComponents(backToOnboardingButton)],
        ephemeral: true
    });

    initiateNicknameSetting(interaction);
    logAction(`Das neue Mitglied **${interaction.user.tag}** hat die Regeln akzeptiert. ✅`);
}




async function initiateNicknameSetting(interaction) {
    const welcomeChannel = await client.channels.fetch(config.welcomeChannelId);
    
    // Create the button with the user-specific custom ID
    const customId = `setNickname-${interaction.user.id}`;  // Store customId in a variable for logging
    const setNicknameButton = new ButtonBuilder()
        .setCustomId(customId)
        .setLabel('🕵🏾‍♂️ Namen angeben')
        .setStyle(ButtonStyle.Primary);
    
    // Log the custom ID directly from the variable
    console.log(`Sending setNickname with ID: ${customId}`);

    const message = await welcomeChannel.send({
        content: `<@${interaction.user.id}>, 🫵 Sagst du mir deinen Ingame Namen?`,
        embeds: [new EmbedBuilder().setImage(`${config.nameGIF}`)],
        components: [new ActionRowBuilder().addComponents(setNicknameButton)]
    });

    setTimeout(() => message.delete().catch(console.error), 180000); // Deletes the message after 180 seconds
}







async function handleSetNickname(interaction) {
    const nicknameModal = new ModalBuilder()
        .setCustomId('nicknameModal')
        .setTitle('Namensänderung');

    const nicknameInput = new TextInputBuilder()
        .setCustomId('nickname')
        .setLabel("🤩 Dein InGame Name in Dragon Saga 🤩")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('KnochenJochen oder z.B: Knochen | Jochen (max. 32 Zeichen)');

    nicknameModal.addComponents(new ActionRowBuilder().addComponents(nicknameInput));
    await interaction.showModal(nicknameModal);
}







async function handleGrantRevenger(interaction) {
    const userId = interaction.customId.split('-')[1];
    const user = await interaction.guild.members.fetch(userId).catch(console.error);
    if (!user) {
        console.error(`User with ID ${userId} not found.`);
        await interaction.reply({ content: "Failed to find the user in the guild.", ephemeral: true });
        return;
    }

    const revengerRole = interaction.guild.roles.cache.get(config.revengerRoleId);
    if (!revengerRole) {
        console.error(`Revenger role with ID ${config.revengerRoleId} not found.`);
        await interaction.reply({ content: "Failed to find the Revenger role.", ephemeral: true });
        return;
    }

    // Defer the reply if expecting delay
    await interaction.deferReply({ ephemeral: false });

    await user.roles.add(revengerRole).catch(console.error);

    // Delete the original message with the button to prevent further clicks
    await interaction.message.delete().catch(console.error);

    const leaderTag = interaction.user.tag; // Get the tag of the leader who clicked the button

    // Follow up with a visible confirmation message
    await interaction.followUp({
        content: `Revenger Rolle erfolgreich an **${user.user.tag}** zugewiesen von **${leaderTag}**👌🏼.`
    });
    logAction(`Revenger Rolle erfolgreich an **${user.user.tag}** zugewiesen von **${leaderTag}**👌🏼`);

    // Send a DM to the user with the role assignment confirmation and additional resources
    const dmEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Herzlichen Glückwunsch und herzlich Willkommen bei RevenGER')
        .setDescription(`Du hast die RevenGER-Rolle von **${leaderTag}** erhalten.\n\nNun kannst Du dich den Mitgliedern von RevenGER vorstellen oder mit Ihnen chatten. \nDu hast jetzt auch Zugriff auf unsere tollen Guides.\nAls kompletter Neuling empfehle ich dir unseren tollen Low-Level Guide 🤩`);

    const introduceButton = new ButtonBuilder()
        .setLabel('Vorstellen')
        .setStyle(ButtonStyle.Link)
        .setURL(`${config.introductionCH}`);

    const revengerchatButton = new ButtonBuilder()
        .setLabel('Vorstellen')
        .setStyle(ButtonStyle.Link)
        .setURL(`${config.revengerCH}`);

    const guidesButton = new ButtonBuilder()
        .setLabel('Guides')
        .setStyle(ButtonStyle.Link)
        .setURL(`${config.guideCH}`);

    const lvlguidesButton = new ButtonBuilder()
        .setLabel('Low-Level Guide')
        .setStyle(ButtonStyle.Link)
        .setURL(`${config.lvguideCH}`);    

    const actionRow = new ActionRowBuilder()
        .addComponents(introduceButton, revengerchatButton, guidesButton, lvlguidesButton);

    await user.send({
        embeds: [dmEmbed],
        components: [actionRow]
    }).catch(console.error);
}



module.exports = { config };


client.login(token);
