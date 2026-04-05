import {
  type ChatInputCommandInteraction,
  Client,
  Collection,
  GatewayIntentBits,
  type Interaction,
  type ModalSubmitInteraction,
  REST,
  Routes,
} from "discord.js";
import createCommand from "./commands/create.js";
import editCommand from "./commands/edit.js";
import helpCommand from "./commands/help.js";
import initCommand from "./commands/init.js";
import inviteCommand from "./commands/invite.js";
import listCommand from "./commands/list.js";
import rsvpCommand from "./commands/rsvp.js";
import { getConfig } from "./config.js";
import { onGuildCreate, onGuildDelete, onGuildUpdate } from "./events/guild.js";
import { handleModalSubmit } from "./handlers/modal-submit.js";
import { startHeartbeatTask } from "./tasks/heartbeat.js";
import { startNotifyTask } from "./tasks/notify.js";
import { startPresenceTask } from "./tasks/presence.js";
import type { Command } from "./types/command.js";
import { logger } from "./utils/logger.js";
import { captureError } from "./utils/sentry.js";

async function safeReplyError(
  interaction: ModalSubmitInteraction | ChatInputCommandInteraction,
  message: string
): Promise<void> {
  const reply = { content: message, ephemeral: true };
  if (interaction.replied || interaction.deferred) {
    await interaction.followUp(reply);
  } else {
    await interaction.reply(reply);
  }
}

export class DiscalendarBot extends Client {
  commands = new Collection<string, Command>();
  private taskTimers: NodeJS.Timeout[] = [];

  constructor() {
    super({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
    });
  }

  async setup(): Promise<void> {
    this.loadCommands();
    this.registerEventHandlers();
    await this.registerSlashCommands();
  }

  async start(): Promise<void> {
    const config = getConfig();
    await this.login(config.botToken);
    logger.info("Bot logged in successfully");
  }

  override async destroy(): Promise<void> {
    for (const timer of this.taskTimers) {
      clearInterval(timer);
    }
    this.taskTimers = [];
    logger.info("Cleared all task timers");
    await super.destroy();
  }

  private loadCommands(): void {
    const commands: Command[] = [
      createCommand,
      editCommand,
      helpCommand,
      initCommand,
      inviteCommand,
      listCommand,
      rsvpCommand,
    ];

    for (const command of commands) {
      this.commands.set(command.data.name, command);
      logger.info(`Loaded command: ${command.data.name}`);
    }
  }

  private async handleInteraction(interaction: Interaction): Promise<void> {
    if (interaction.isModalSubmit()) {
      try {
        await handleModalSubmit(interaction);
      } catch (error) {
        logger.error({ error }, "Modal submit handler failed");
        captureError(error, {
          source: "modal",
          guildId: interaction.guildId ?? undefined,
          userId: interaction.user.id,
        });
        await safeReplyError(
          interaction,
          "モーダルの処理中にエラーが発生しました。"
        );
      }
      return;
    }

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
      captureError(error, {
        source: "command",
        name: interaction.commandName,
        guildId: interaction.guildId ?? undefined,
        userId: interaction.user.id,
      });
      await safeReplyError(
        interaction,
        "コマンドの実行中にエラーが発生しました。"
      );
    }
  }

  private registerEventHandlers(): void {
    this.on("interactionCreate", (interaction) =>
      this.handleInteraction(interaction)
    );

    this.on("guildCreate", async (guild) => {
      try {
        await onGuildCreate(guild);
      } catch (error) {
        logger.error(
          { error, guildId: guild.id },
          "guildCreate handler failed"
        );
        captureError(error, {
          source: "event",
          name: "guildCreate",
          guildId: guild.id,
        });
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
        captureError(error, {
          source: "event",
          name: "guildDelete",
          guildId: guild.id,
        });
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
        captureError(error, {
          source: "event",
          name: "guildUpdate",
          guildId: newGuild.id,
        });
      }
    });

    this.once("ready", (client) => {
      logger.info(`Ready! Logged in as ${client.user.tag}`);
      this.startTasks();
    });
  }

  private startTasks(): void {
    this.taskTimers.push(startNotifyTask(this));
    logger.info("Notify task started");

    this.taskTimers.push(startPresenceTask(this));
    logger.info("Presence task started");

    this.taskTimers.push(startHeartbeatTask(this));
    logger.info("Heartbeat task started");
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
      const route = config.devGuildId
        ? Routes.applicationGuildCommands(
            config.applicationId,
            config.devGuildId
          )
        : Routes.applicationCommands(config.applicationId);

      await rest.put(route, { body: commandData });

      const scope = config.devGuildId ? `guild ${config.devGuildId}` : "global";
      logger.info(
        `Registered ${commandData.length} slash command(s) (${scope})`
      );
    } catch (error) {
      logger.error({ error }, "Failed to register slash commands");
      throw error;
    }
  }
}
