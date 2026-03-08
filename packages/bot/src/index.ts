import { DiscalendarBot } from "./bot.js";
import { getConfig } from "./config.js";
import { logger } from "./utils/logger.js";

async function main(): Promise<void> {
  getConfig();
  logger.info("Configuration loaded");

  const bot = new DiscalendarBot();
  await bot.setup();
  await bot.start();

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down...`);
    await bot.destroy();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    shutdown("SIGINT").catch((error) => {
      logger.error({ error }, "Shutdown failed");
      process.exit(1);
    });
  });
  process.on("SIGTERM", () => {
    shutdown("SIGTERM").catch((error) => {
      logger.error({ error }, "Shutdown failed");
      process.exit(1);
    });
  });
}

main().catch((error) => {
  logger.error({ error }, "Failed to start bot");
  process.exit(1);
});
