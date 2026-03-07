import {
  type ChatInputCommandInteraction,
  Client,
  Collection,
  GatewayIntentBits,
  REST,
  Routes,
  type SharedNameAndDescription,
} from "discord.js";
import { getConfig } from "./config.js";
import { logger } from "./utils/logger.js";

export type Command = {
  data: SharedNameAndDescription & { toJSON: () => unknown };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
};

export class DiscalendarBot extends Client {
  commands = new Collection<string, Command>();

  constructor() {
    super({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
    });
  }

  async setup(): Promise<void> {
    await this.loadCommands();
    this.registerEventHandlers();
    this.startTasks();
    await this.registerSlashCommands();
  }

  async start(): Promise<void> {
    const config = getConfig();
    await this.login(config.botToken);
    logger.info("Bot logged in successfully");
  }

  private async loadCommands(): Promise<void> {
    try {
      const { readdir } = await import("node:fs/promises");
      const { fileURLToPath } = await import("node:url");
      const { dirname, join } = await import("node:path");

      const currentDir = dirname(fileURLToPath(import.meta.url));
      const commandsDir = join(currentDir, "commands");

      const files = await readdir(commandsDir);
      const commandFiles = files.filter(
        (f) => (f.endsWith(".js") || f.endsWith(".ts")) && !f.endsWith(".d.ts")
      );

      for (const file of commandFiles) {
        const mod = (await import(join(commandsDir, file))) as {
          default?: Command;
        };
        const command = mod.default;
        if (command && "data" in command && "execute" in command) {
          this.commands.set(command.data.name, command);
          logger.info(`Loaded command: ${command.data.name}`);
        } else {
          logger.warn(`Skipping invalid command module: ${file}`);
        }
      }
    } catch (_error) {
      logger.warn("No command modules found, skipping command loading");
    }

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
  }

  private registerEventHandlers(): void {
    this.on("guildCreate", async (guild) => {
      try {
        const { onGuildCreate } = await import("./events/guild.js");
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
        const { onGuildDelete } = await import("./events/guild.js");
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
        const { onGuildUpdate } = await import("./events/guild.js");
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

  private startTasks(): void {
    import("./tasks/notify.js")
      .then(({ startNotifyTask }) => {
        startNotifyTask(this);
        logger.info("Notify task started");
      })
      .catch((error) => {
        logger.warn({ error }, "Notify task module not found, skipping");
      });

    import("./tasks/presence.js")
      .then(({ startPresenceTask }) => {
        startPresenceTask(this);
        logger.info("Presence task started");
      })
      .catch((error) => {
        logger.warn({ error }, "Presence task module not found, skipping");
      });
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
