const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const configPath = './config.json';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setupticketsystem')
        .setDescription('Setuped die Nachricht für das Ticket-System')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel für das Ticket-System')
                .setRequired(true)
        )
        .addChannelOption(option =>
            option.setName('log_channel')
                .setDescription('Channel für Logs')
                .setRequired(true)
        )
        .addRoleOption(option =>
            option.setName('admin_role')
                .setDescription('Admin-Rolle für Tickets')
                .setRequired(true)
        )
        .addRoleOption(option =>
            option.setName('mod_role')
                .setDescription('Mod-Rolle für Tickets')
                .setRequired(true)
        )
        .addChannelOption(option =>
            option.setName('ticket_category')
                .setDescription('Kategorie, in der die Tickets erstellt werden sollen')
                .setRequired(true)
        ),

    async execute(interaction) {
        let config = {};
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath));
        }

        const isFirstSetup = !config.setupDone;
        const requiredRoleId = config.adminRoleId;

        if (!isFirstSetup && !interaction.member.roles.cache.has(config.adminRoleId || requiredRoleId)) {
            return interaction.reply({ content: 'Du hast keine Berechtigung, diesen Command auszuführen!', ephemeral: true });
        }

        const channel = interaction.options.getChannel('channel');
        const logChannel = interaction.options.getChannel('log_channel');
        const adminRole = interaction.options.getRole('admin_role');
        const modRole = interaction.options.getRole('mod_role');
        const ticketCategory = interaction.options.getChannel('ticket_category');

        const configData = {
            ticketChannelId: channel.id,
            logChannelId: logChannel.id,
            adminRoleId: adminRole.id,
            modRoleId: modRole.id,
            ticketCategoryId: ticketCategory.id,
            setupDone: true
        };
        fs.writeFileSync(configPath, JSON.stringify(configData, null, 4));

        const embed = new EmbedBuilder()
            .setTitle('Ticket-System')
            .setDescription(
                'Erstelle ein Ticket, wenn du Hilfe bei deinem Anliegen brauchst, du ein Spiel für den heutigen Tag oder ein generell neues Spiel vorschlagen möchtest.\n\n' +
                'Wähle dazu ein unten aufgelistetes Thema aus und beschreibe dein Anliegen im ersten Feld. Wenn du noch Bemerkungen hast, schreibe diese in das zweite Feld.'
            )
            .setColor(0x00FF00);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_create')
                .setLabel('Ticket erstellen')
                .setStyle(ButtonStyle.Success)
        );

        await channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: 'Ticket-System Embed wurde gesendet und Konfiguration gespeichert!', ephemeral: true });
    },
};
