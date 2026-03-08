import {
  Client,
  Collection,
  GatewayIntentBits,
  REST,
  Routes,
} from "discord.js";
import createCommand from "./commands/create.js";
import helpCommand from "./commands/help.js";
import initCommand from "./commands/init.js";
import inviteCommand from "./commands/invite.js";
import listCommand from "./commands/list.js";
import { getConfig } from "./config.js";
import { onGuildCreate, onGuildDelete, onGuildUpdate } from "./events/guild.js";
import type { Command } from "./types/command.js";
import { logger } from "./utils/logger.js";

export class DiscalendarBot extends Client {
  commands = new Collection<string, Command>();

  constructor() {
    super({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
    });
  }

  async setup(): Promise<void> {
    this.loadCommands();
    this.registerEventHandlers();
    await this.startTasks();
    await this.registerSlashCommands();
  }

  async start(): Promise<void> {
    const config = getConfig();
    await this.login(config.botToken);
    logger.info("Bot logged in successfully");
  }

  private loadCommands(): void {
    const commands: Command[] = [
      createCommand,
      helpCommand,
      initCommand,
      inviteCommand,
      listCommand,
    ];

    for (const command of commands) {
      this.commands.set(command.data.name, command);
      logger.info(`Loaded command: ${command.data.name}`);
    }
  }

  private registerEventHandlers(): void {
    this.on("interactionCreate", async (interaction) => {
      if (!interaction.isChatInputCommand()) {
        return;
      }

      const command = this.commands.get(interaction.commandName);
      if (!command) {
        logger.warn(`Unknown command: ${interaction.commandName}`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        logger.error(
          { error, command: interaction.commandName },
          "Command execution failed"
        );
        const reply = {
          content: "コマンドの実行中にエラーが発生しました。",
          ephemeral: true,
        };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply);
        } else {
          await interaction.reply(reply);
        }
      }
    });

    this.on("guildCreate", async (guild) => {
      try {
        await onGuildCreate(guild);
      } catch (error) {
        logger.error(
          { error, guildId: guild.id },
          "guildCreate handler failed"
        );
      }
    });

    this.on("guildDelete", async (guild) => {
      try {
        await onGuildDelete(guild);
      } catch (error) {
        logger.error(
          { error, guildId: guild.id },
          "guildDelete handler failed"
        );
      }
    });

    this.on("guildUpdate", async (oldGuild, newGuild) => {
      try {
        await onGuildUpdate(oldGuild, newGuild);
      } catch (error) {
        logger.error(
          { error, guildId: newGuild.id },
          "guildUpdate handler failed"
        );
      }
    });

    this.once("ready", (client) => {
      logger.info(`Ready! Logged in as ${client.user.tag}`);
    });
  }

  private async startTasks(): Promise<void> {
    try {
      const { startNotifyTask } = await import("./tasks/notify.js");
      startNotifyTask(this);
      logger.info("Notify task started");
    } catch (error) {
      logger.warn({ error }, "Notify task module not found, skipping");
    }

    try {
      const { startPresenceTask } = await import("./tasks/presence.js");
      startPresenceTask(this);
      logger.info("Presence task started");
    } catch (error) {
      logger.warn({ error }, "Presence task module not found, skipping");
    }
  }

  private async registerSlashCommands(): Promise<void> {
    if (this.commands.size === 0) {
      logger.info("No commands to register");
      return;
    }

    const config = getConfig();
    const rest = new REST({ version: "10" }).setToken(config.botToken);

    const commandData = this.commands.map((cmd) => cmd.data.toJSON());

    try {
      await rest.put(Routes.applicationCommands(config.applicationId), {
        body: commandData,
      });
      logger.info(`Registered ${commandData.length} slash command(s)`);
    } catch (error) {
      logger.error({ error }, "Failed to register slash commands");
      throw error;
    }
  }
}
