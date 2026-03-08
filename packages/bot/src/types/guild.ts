export type GuildRow = {
  id: number;
  guild_id: string;
  name: string;
  avatar_url: string | null;
  locale: string;
};

export type GuildCreate = {
  guild_id: string;
  name: string;
  avatar_url?: string | null;
  locale?: string;
};

export type GuildConfig = {
  guild_id: string;
  restricted: boolean;
};
