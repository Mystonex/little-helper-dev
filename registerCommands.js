const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const readline = require('readline');
require('dotenv').config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let commands = [
    new SlashCommandBuilder().setName('hilfe').setDescription('Erhalte Hilfe vom Little Helper 🤩!'),
    new SlashCommandBuilder().setName('rename').setDescription('Ändere deinen Nicknamen!'),
];

function refreshCommands() {
    const rest = new REST({ version: '9' }).setToken(process.env.BOT_TOKEN);

    (async () => {
        try {
            console.log('Started refreshing application (/) commands.');

            await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands.map(command => command.toJSON()) }
            );

            console.log('Successfully reloaded application (/) commands.');
        } catch (error) {
            console.error(error);
        }
    })();
}

function showCommands() {
    console.log("Registered Commands:");
    commands.forEach((cmd, index) => {
        console.log(`${index + 1}: ${cmd.name} - ${cmd.description}`);
    });
}

function updateCommand() {
    showCommands();
    rl.question('Enter the number of the command you want to update: ', number => {
        const index = parseInt(number, 10) - 1;
        if (index >= 0 && index < commands.length) {
            rl.question('Enter the new description: ', description => {
                commands[index].setDescription(description);
                console.log('Command updated.');
                refreshCommands();
                rl.close();
            });
        } else {
            console.log('Invalid command number.');
            rl.close();
        }
    });
}

function addCommand() {
    rl.question('Enter the name of the new command: ', name => {
        rl.question('Enter the description of the new command: ', description => {
            const command = new SlashCommandBuilder().setName(name).setDescription(description);
            commands.push(command);
            console.log('New command added.');
            refreshCommands();
            console.log('Updated Commands:');
            showCommands(); // Show all commands to confirm addition
            rl.close();
        });
    });
}


function deleteCommand() {
    showCommands();
    rl.question('Enter the number of the command you want to delete: ', number => {
        const index = parseInt(number, 10) - 1;
        if (index >= 0 && index < commands.length) {
            commands.splice(index, 1);
            console.log('Command deleted.');
            refreshCommands();
            rl.close();
        } else {
            console.log('Invalid command number.');
            rl.close();
        }
    });
}

function mainMenu() {
    console.log("\nChoose an option:");
    console.log("1: See registered commands");
    console.log("2: Update an existing command");
    console.log("3: Register a new command");
    console.log("4: Delete an existing command");
    console.log("5: Exit");

    rl.question('Enter your choice: ', (answer) => {
        switch (answer) {
            case '1':
                showCommands();
                rl.close();
                break;
            case '2':
                updateCommand();
                break;
            case '3':
                addCommand();
                break;
            case '4':
                deleteCommand();
                break;
            case '5':
                console.log('Exiting...');
                rl.close();
                break;
            default:
                console.log('Invalid option. Please enter a number between 1 and 5.');
                mainMenu();
                break;
        }
    });
}

mainMenu();
