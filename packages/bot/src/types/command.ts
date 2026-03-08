import type {
  ChatInputCommandInteraction,
  SharedNameAndDescription,
} from "discord.js";

export type Command = {
  data: SharedNameAndDescription & { toJSON: () => unknown };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
};
