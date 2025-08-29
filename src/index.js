require('dotenv').config({ path: __dirname + '/../.env' });
const { Client, GatewayIntentBits, ActivityType, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const claimedTickets = new Map();
const closedTickets = new Set();

client.commands = new Map();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}
client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    client.user.setActivity('Pornhub', { type: ActivityType.Watching });
});
let config = {};
const configPath = './config.json';

if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath));
    console.log('✅ Ticket-System Config geladen:', config);
} else {
    console.log('⚠️ Keine Config gefunden. Bitte /setupticketsystem ausführen.');
}
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'Fehler beim Ausführen.', ephemeral: true });
            } else {
                await interaction.reply({ content: 'Fehler beim Ausführen.', ephemeral: true });
            }
        }
    }
    else if (interaction.isButton()) {
        if (interaction.customId === 'ticket_create') {
            const modal = new ModalBuilder()
                .setCustomId('ticket_modal')
                .setTitle('Ticket erstellen');

            const input1 = new TextInputBuilder()
                .setCustomId('anliegen')
                .setLabel("Dein Anliegen")
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder("Beschreibe dein Anliegen hier...")
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(input1),
            );
            await interaction.showModal(modal);
        }
        else if (interaction.isButton() && interaction.customId === 'ticket_claim') {
            if (closedTickets.has(interaction.channel.id)) {
                return interaction.reply({ content: 'Das Ticket ist momentan geschlossen, wenn du es wieder öffnen willst, dann benütze den reopen button', ephemeral: true });
            }
            const allowedRoles = [config.modRoleId, config.adminRoleId];
            const memberRoles = interaction.member.roles.cache.map(r => r.id);
            const hasPermission = memberRoles.some(rid => allowedRoles.includes(rid));
            if (!hasPermission) return interaction.reply({ content: 'Du hast keine Berechtigung', ephemeral: true });

            const claimedUserId = claimedTickets.get(interaction.channel.id);

            if (!claimedUserId) {
                claimedTickets.set(interaction.channel.id, interaction.user.id);

                await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true
                });
                const claimEmbed = new EmbedBuilder()
                    .setDescription(` ${interaction.user} hat dieses Ticket geclaimed`)
                    .setColor(0x0099ff);
                await interaction.deferUpdate();
                await interaction.channel.send({ embeds: [claimEmbed] });

                const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor(0x0099ff) // blau für "claimed"
                        .setAuthor({name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL()})
                        .setDescription(`**Aktion:** Claimed\n**Ticket:** ${interaction.channel.name}`);
                    await logChannel.send({embeds: [logEmbed]});
                }
            }
            else if (claimedUserId === interaction.user.id) {
                claimedTickets.delete(interaction.channel.id);

                await interaction.channel.permissionOverwrites.delete(interaction.user.id);

                const unclaimEmbed = new EmbedBuilder()
                    .setDescription(` ${interaction.user} hat das Ticket wieder unclaimed`)
                    .setColor(0x0099ff);
                await interaction.deferUpdate();
                await interaction.channel.send({ embeds: [unclaimEmbed] });

                const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setColor(0x0099ff) // blau für "claimed"
                            .setAuthor({name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL()})
                            .setDescription(`**Aktion:** Unclaimed\n**Ticket:** ${interaction.channel.name}`);
                        await logChannel.send({embeds: [logEmbed]});
                    }
            }
            else {
                return interaction.reply({ content: 'Das Ticket wurde bereits von jemand anderem geclaimt', ephemeral: true });
            }
        }
        else if (interaction.isButton() && interaction.customId === 'ticket_close') {
            if (closedTickets.has(interaction.channel.id)) {
                return interaction.reply({content: 'Das Ticket ist bereits geschlossen', ephemeral: true});
            }
            const ticketCreatorId = interaction.channel.topic;

            if (!ticketCreatorId) {
                return interaction.reply({
                    content: 'Ticket-Ersteller konnte nicht ermittelt werden',
                    ephemeral: true
                });
            }
            const isAdmin = interaction.member.roles.cache.has(config.adminRoleId);

            closedTickets.add(interaction.channel.id);
            await interaction.channel.permissionOverwrites.delete(ticketCreatorId);


            const closeEmbed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setDescription(`Das Ticket wurde von ${interaction.user} geschlossen.`);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_delete')
                    .setLabel('Delete')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('ticket_reopen')
                    .setLabel('Reopen')
                    .setStyle(ButtonStyle.Primary)
            );
            await interaction.reply({embeds: [closeEmbed], components: [row]});
        }
        else if (interaction.isButton() && interaction.customId === 'ticket_reopen') {
            if (!closedTickets.has(interaction.channel.id)) {
                return interaction.reply({ content: 'Das Ticket ist noch offen', ephemeral: true });
            }

            const ticketCreatorId = interaction.channel.topic;
            if (!ticketCreatorId) {
                return interaction.reply({
                    content: 'Ticket-Ersteller konnte nicht ermittelt werden',
                    ephemeral: true
                });
            }
            closedTickets.delete(interaction.channel.id);

            await interaction.channel.permissionOverwrites.edit(ticketCreatorId, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });
            const reopenEmbed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setDescription(`Das Ticket wurde erneut geöffnet`);

            await interaction.reply({
                embeds: [reopenEmbed],
                content: `<@${ticketCreatorId}>`,
            });
        }
        else if (interaction.isButton() && interaction.customId === 'ticket_delete') {
            const isClosed = closedTickets.has(interaction.channel.id);
            if (!isClosed) {
                return interaction.reply({ content: 'Das Ticket ist noch nicht geschlossen', ephemeral: true });
            }

            const isAdmin = interaction.member.roles.cache.has(config.adminRoleId);
            if (!isAdmin) {
                return interaction.reply({ content: 'Nur Admins dürfen Tickets löschen', ephemeral: true });
            }
            const messages = await interaction.channel.messages.fetch({ limit: 100 });
            const sortedMessages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

            let html = `
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Transcript - ${interaction.channel.name}</title>
<style>
body {
    background-color: #36393f;
    color: #dcddde;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    margin: 0; padding: 20px;
}
.channel-name {
    font-size: 1.5em;
    font-weight: bold;
    margin-bottom: 20px;
}
.message {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
}
.message img {
    border-radius: 50%;
}
.message-content {
    flex: 1;
}
.message-header {
    font-weight: bold;
    font-size: 0.9em;
}
.timestamp {
    font-weight: normal;
    color: #72767d;
    font-size: 0.8em;
    margin-left: 5px;
}
.embed {
    border-left: 4px solid #3498db;
    background-color: #2f3136;
    padding: 10px;
    margin-top: 5px;
    margin-bottom: 5px;
    border-radius: 8px;
    max-width: 520px;
    box-shadow: rgba(0, 0, 0, 0.2) 0px 2px 6px;
}
.embed-title {
    font-weight: bold;
    margin-bottom: 4px;
    font-size: 0.95em;
}
.embed-description {
    font-size: 0.9em;
    line-height: 1.4em;
}
.embed-field {
    margin-top: 8px;
}
.embed-field-name {
    font-weight: bold;
    font-size: 0.85em;
    margin-bottom: 2px;
}
.embed-field-value {
    font-size: 0.85em;
}
.embed-footer {
    margin-top: 8px;
    font-size: 0.75em;
    color: #72767d;
}
.embed-author {
    font-weight: bold;
    margin-bottom: 6px;
}
.embed-image {
    max-width: 100%;
    border-radius: 5px;
    margin-top: 10px;
}
.embed-thumbnail {
    float: right;
    width: 40px;
    height: 40px;
    border-radius: 4px;
    margin-left: 8px;
}

</style>
</head>
<body>
<div class="channel-name">#${interaction.channel.name}</div>
`;

            for (const msg of sortedMessages.values()) {
                const timestamp = new Date(msg.createdTimestamp).toLocaleString();
                const username = msg.author.tag;
                const avatar = msg.author.displayAvatarURL({ format: 'png', size: 64 });
                const content = msg.content
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/\n/g, "<br/>");

                // Wenn Embed vorhanden
                let embedHTML = '';
                if (msg.embeds.length > 0) {
                    for (const embed of msg.embeds) {
                        const color = embed.color ? `#${embed.color.toString(16).padStart(6,'0')}` : '#3498db';

                        // einzelne Teile
                        const title = embed.title ? `<div class="embed-title">${embed.title}</div>` : '';
                        const desc = embed.description ? `<div class="embed-description">${embed.description.replace(/\n/g, "<br/>")}</div>` : '';

                        let fieldsHTML = '';
                        if (embed.fields && embed.fields.length > 0) {
                            fieldsHTML = embed.fields.map(f => `
                <div class="embed-field">
                    <div class="embed-field-name">${f.name}</div>
                    <div class="embed-field-value">${f.value.replace(/\n/g,"<br/>")}</div>
                </div>
            `).join('');
                        }

                        const footer = embed.footer ? `<div class="embed-footer">${embed.footer.text}</div>` : '';
                        const author = embed.author ? `<div class="embed-author">${embed.author.name}</div>` : '';
                        const image = embed.image ? `<img class="embed-image" src="${embed.image.url}"/>` : '';
                        const thumbnail = embed.thumbnail ? `<img class="embed-thumbnail" src="${embed.thumbnail.url}"/>` : '';

                        embedHTML += `
        <div class="embed" style="border-left-color:${color}">
            ${author}
            ${title}
            ${desc}
            ${fieldsHTML}
            ${thumbnail}
            ${image}
            ${footer}
        </div>`;
                    }
                }

                html += `
<div class="message">
    <img src="${avatar}" width="40" height="40"/>
    <div class="message-content">
        <div class="message-header">${username} <span class="timestamp">${timestamp}</span></div>
        <div class="message-text">${content}</div>
        ${embedHTML}
    </div>
</div>
`;
            }

            html += `
</body>
</html>
`;

            const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
            if (logChannel) {
                const deleteEmbed = new EmbedBuilder()
                    .setColor(0xff0000)
                    .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
                    .setDescription(`**Aktion:** Deleted\n**Ticket:** ${interaction.channel.name}`);

                await logChannel.send({
                    embeds: [deleteEmbed],
                    files: [{ attachment: Buffer.from(html, "utf-8"), name: `${interaction.channel.name}.html` }]
                });
            }
            closedTickets.delete(interaction.channel.id);
            await interaction.channel.delete();
        }
    }
    else if (interaction.isModalSubmit()) {
        if (interaction.customId === 'ticket_modal') {
            const anliegen = interaction.fields.getTextInputValue('anliegen');

            const randomNumber = Math.floor(100 + Math.random() * 900);
            const channelName = `ticket-${randomNumber}`;

            const modRole = interaction.guild.roles.cache.get(config.modRoleId);
            const adminRole = interaction.guild.roles.cache.get(config.adminRoleId);

            if (!modRole || !adminRole) {
                return interaction.reply({ content: '❌ Mod- oder Admin-Rolle konnte nicht gefunden werden!', ephemeral: true });
            }
            const ticketChannel = await interaction.guild.channels.create({
                name: channelName,
                type: 0,
                parent: config.ticketCategoryId,
                topic: interaction.user.id,
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone.id,
                        deny: ['ViewChannel', 'SendMessages']
                    },
                    {
                        id: config.modRoleId,
                        allow: ['ViewChannel', 'ReadMessageHistory'],
                        deny: ['SendMessages']
                    },
                    {
                        id: config.adminRoleId,
                        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                    },
                    {
                        id: interaction.user.id,
                        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                    }
                ]
            });
            const messageContent = `<@&${config.modRoleId}> ${interaction.user}`;

            const embed = new EmbedBuilder()
                .setTitle('Ticket Details')
                .setColor(0x00FF00)
                .addFields(
                    { name: 'Wer hat das Ticket erstellt?', value: `${interaction.user}`, inline: false },
                    { name: 'Was ist dein Anliegen?', value: `${anliegen}`, inline: false }
                );
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_close')
                    .setLabel('Close')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('ticket_claim')
                    .setLabel('Claim')
                    .setStyle(ButtonStyle.Primary)
            );
            await ticketChannel.send({ content: messageContent, embeds: [embed], components: [row] });

            const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
                    .setDescription(`**Aktion:** Ticket erstellt\n**Ticket:** ${ticketChannel.name}`);
                await logChannel.send({ embeds: [logEmbed] });
            }

            await interaction.reply({ content: `Dein Ticket wurde erstellt: ${ticketChannel}`, ephemeral: true });
        }
    }

});

client.login(process.env.DISCORD_TOKEN);