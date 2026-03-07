import { DiscalendarBot } from "./bot.js";
import { getConfig } from "./config.js";
import { logger } from "./utils/logger.js";

async function main(): Promise<void> {
  getConfig();
  logger.info("Configuration loaded");

  const bot = new DiscalendarBot();
  await bot.setup();
  await bot.start();

  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}, shutting down...`);
    bot.destroy();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((error) => {
  logger.error({ error }, "Failed to start bot");
  process.exit(1);
});
