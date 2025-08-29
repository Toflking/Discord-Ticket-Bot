# 🎫 Discord Ticket Bot

A powerful and customizable Ticket Bot for Discord servers.  
Supports ticket creation, claim/unclaim, closing, reopening, deleting, and automatic logging with transcripts.

---

## ✨ Features
- 📩 Create tickets with a button
- 👮 Claim system for moderators
- ✅ Close & Reopen tickets
- 🗑️ Delete tickets with transcript export
- 📜 Discord-style HTML transcripts (Darkmode with embeds)
- 🔔 Logging for every action (Create, Claim, Close, Reopen, Delete)
- ⚡ Easy setup with `/setupticketsystem` command

---

## 📦 Installation

1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/yourusername/ticket-bot.git
   cd ticket-bot
   npm install
   ```

2. Create a `.env` file in the project root and fill in the values:
   ```env
   TOKEN=YOUR_DISCORD_BOT_TOKEN
   CLIENT_ID=YOUR_BOT_CLIENT_ID
   GUILD_ID=YOUR_GUILD_ID
   ```

   - `TOKEN` → Your bot token from the [Discord Developer Portal](https://discord.com/developers/applications).
   - `CLIENT_ID` → Your bot's Application ID.
   - `GUILD_ID` → The Discord server (guild) ID where the bot should run.

---

## ▶️ Starting the bot
```bash
node index.js
```

After starting, the bot will be online but not fully configured until you run the setup command.

---

## ⚙️ Initial Setup (`/setupticketsystem`)

When you start the bot for the first time, you need to run the **`/setupticketsystem` command** in any Channel of your Discord.  

### First Run:
- No role requirement → anyone can use `/setupticketsystem`.
- You will be asked to configure:
  - **Ticket Channel** → where users create new tickets.
  - **Log Channel** → where all ticket logs & transcripts are sent.
  - **Admin Role** → has full ticket control (can delete, always write).
  - **Mod Role** → can only claim and manage tickets they claim.
  - **Ticket Category** → where new tickets will be created.

### After First Setup:  
- After finishing the setup, **restart the bot once**.  
- From then on, the bot will fully function.

---

## 👮 Roles Explained

- **Admin Role**
  - Can always write in tickets (even without claiming).
  - Can delete tickets.
  - Can reconfigure bot via `/setupticketsystem`.

- **Mod Role**
  - Can only write in tickets **after claiming**.
  - Cannot delete tickets.
  - Gets pinged when a new ticket is created.

This ensures admins have full control while mods handle day-to-day tickets.

---

## 📝 Ticket Lifecycle

- **Create** → User creates a ticket, mods are pinged.
- **Claim / Unclaim** → Mods can claim a ticket to handle it.
- **Close** → Ticket is closed (user loses access).
- **Reopen** → Ticket is reopened, user gets access again.
- **Delete** → Ticket is permanently deleted, full transcript exported.

---

## 🔔 Logging

Every ticket action is logged into the configured log channel:  
- 🟢 **Created** – when a user opens a ticket  
- 🔵 **Claimed / Reopened** – when staff handles tickets   
- 🔴 **Deleted** – when a ticket is deleted (includes transcript file)

---

## 📜 Transcripts

- Stored as **`.html` files** styled like Discord (Darkmode & Embeds).
- Raw messages are also stored as **`.txt`**.
- Transcripts are automatically uploaded to the log channel when a ticket is deleted.

---

## 📖 License
MIT – Free to use and modify.

---
