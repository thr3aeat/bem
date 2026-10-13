const { REST, Routes } = require('discord.js');
const { config, TOKEN } = require('./constants');
const fs = require('fs');
const path = require('path');
const { prepareCommand } = require('./commandAccess');

async function deployCommands() {
    const commands = [];
    const commandsPath = path.join(__dirname, '..', 'commands');
    
    const getFilesRecursively = (dir) => {
        let files = [];
        if (!fs.existsSync(dir)) return files;
        fs.readdirSync(dir).forEach(file => {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                files = files.concat(getFilesRecursively(fullPath));
            } else if (file.endsWith('.js')) {
                files.push(fullPath);
            }
        });
        return files;
    };

    const commandFiles = getFilesRecursively(commandsPath);

    for (const filePath of commandFiles) {
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            commands.push(prepareCommand(command).data.toJSON());
        }
    }

    const rest = new REST().setToken(process.env.DISCORD_TOKEN || TOKEN);

    try {
        console.log(`[🚀] ${commands.length} komut otomatik olarak kaydediliyor...`);

        const data = await rest.put(
            Routes.applicationCommands(config.CLIENT_ID),
            { body: commands },
        );

        console.log(`[✅] ${data.length} komut başarıyla güncellendi.`);
    } catch (error) {
        console.error('[❌] Komut kayıt hatası:', error);
    }
}

module.exports = { deployCommands };
