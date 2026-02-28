import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Guild } from "@/lib/guilds/types";

export type UserGuildListProps = {
  guilds: Guild[];
};

const ICON_SIZE = 32;

function getGuildInitial(name: string): string {
  if (!name || name.length === 0) {
    return "?";
  }
  return name.charAt(0).toUpperCase();
}

export function UserGuildList({ guilds }: UserGuildListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>参加ギルド</CardTitle>
      </CardHeader>
      <CardContent>
        {guilds.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm">
            参加しているギルドがありません
          </p>
        ) : (
          <ul className="space-y-1">
            {guilds.map((guild) => (
              <li key={guild.guildId}>
                <Link
                  className="flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-accent/50"
                  href={`/dashboard?guild=${guild.guildId}`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                    {guild.avatarUrl ? (
                      <Image
                        alt={`${guild.name}のアイコン`}
                        className="h-full w-full object-cover"
                        height={ICON_SIZE}
                        src={guild.avatarUrl}
                        width={ICON_SIZE}
                      />
                    ) : (
                      <span className="font-medium text-muted-foreground text-xs">
                        {getGuildInitial(guild.name)}
                      </span>
                    )}
                  </div>
                  <span className="truncate font-medium text-sm">
                    {guild.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
