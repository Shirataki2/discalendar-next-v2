/**
 * NotificationChannelSelect - 通知チャンネル選択コンポーネント
 *
 * Task 5.1: 通知チャンネル選択ドロップダウンコンポーネント
 * - マウント時にチャンネル一覧を Server Action 経由で取得
 * - カテゴリ別グループ表示
 * - BOT権限なしチャンネルは disabled + インジケーター
 * - 楽観的UI更新 → 保存失敗時ロールバック
 *
 * Requirements: 2.1-2.7, 3.3, 3.4, 4.2, 4.3, 6.3
 */
"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  fetchGuildChannels,
  updateNotificationChannel,
} from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DiscordTextChannel } from "@/lib/discord/notification-channel-service";

export type NotificationChannelSelectProps = {
  /** ギルドID */
  guildId: string;
  /** 現在設定されているチャンネルID（未設定時はnull） */
  currentChannelId: string | null;
};

/** カテゴリ別にグループ化されたチャンネル */
type ChannelGroup = {
  /** グループの一意キー（parentId またはフォールバック文字列） */
  key: string;
  categoryName: string;
  channels: DiscordTextChannel[];
};

/**
 * チャンネルをカテゴリ別にグループ化する
 *
 * parentId をキーに使い、同名カテゴリが存在しても別グループとして扱う
 */
function groupByCategory(channels: DiscordTextChannel[]): ChannelGroup[] {
  const groupMap = new Map<
    string,
    { categoryName: string; channels: DiscordTextChannel[] }
  >();
  const uncategorized: DiscordTextChannel[] = [];

  for (const channel of channels) {
    if (channel.parentId) {
      const existing = groupMap.get(channel.parentId);
      if (existing) {
        existing.channels.push(channel);
      } else {
        groupMap.set(channel.parentId, {
          categoryName: channel.categoryName ?? "不明なカテゴリ",
          channels: [channel],
        });
      }
    } else {
      uncategorized.push(channel);
    }
  }

  const groups: ChannelGroup[] = [];

  // カテゴリなしチャンネルを先頭に
  if (uncategorized.length > 0) {
    groups.push({
      key: "__uncategorized__",
      categoryName: "その他",
      channels: uncategorized,
    });
  }

  for (const [parentId, group] of groupMap) {
    groups.push({
      key: parentId,
      categoryName: group.categoryName,
      channels: group.channels,
    });
  }

  return groups;
}

export function NotificationChannelSelect({
  guildId,
  currentChannelId,
}: NotificationChannelSelectProps) {
  const [channels, setChannels] = useState<DiscordTextChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(
    currentChannelId
  );
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // チャンネル一覧を取得する
  const loadChannels = useCallback(async (targetGuildId: string) => {
    setIsLoadingChannels(true);
    setFetchError(null);

    const result = await fetchGuildChannels(targetGuildId);

    if (result.success) {
      setChannels(result.data);
    } else {
      setFetchError(result.error.message);
    }

    setIsLoadingChannels(false);
  }, []);

  // マウント時・guildId変更時にチャンネル一覧を取得
  useEffect(() => {
    setSelectedChannelId(currentChannelId);
    setError(null);
    setSuccessMessage(null);
    loadChannels(guildId);
  }, [guildId, currentChannelId, loadChannels]);

  // チャンネル選択時のハンドラー
  const handleSelect = useCallback(
    (channelId: string) => {
      setError(null);
      setSuccessMessage(null);
      const previousValue = selectedChannelId;
      setSelectedChannelId(channelId);

      startTransition(async () => {
        const result = await updateNotificationChannel({
          guildId,
          channelId,
        });

        if (result.success) {
          setSuccessMessage("保存しました");
        } else {
          setSelectedChannelId(previousValue);
          setError(result.error.message);
        }
      });
    },
    [guildId, selectedChannelId]
  );

  // リトライ
  const handleRetry = useCallback(() => {
    loadChannels(guildId);
  }, [guildId, loadChannels]);

  // ローディング中
  if (isLoadingChannels) {
    return (
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">読み込み中...</p>
      </div>
    );
  }

  // 取得エラー
  if (fetchError) {
    return (
      <div className="space-y-2">
        <p className="text-destructive text-sm" role="alert">
          {fetchError}
        </p>
        <Button onClick={handleRetry} size="sm" variant="outline">
          再試行
        </Button>
      </div>
    );
  }

  const groups = groupByCategory(channels);

  return (
    <div className="space-y-2">
      <Select
        disabled={isPending}
        onValueChange={handleSelect}
        value={selectedChannelId ?? undefined}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="チャンネルを選択" />
        </SelectTrigger>
        <SelectContent>
          {groups.map((group) => (
            <SelectGroup key={group.key}>
              <SelectLabel>{group.categoryName}</SelectLabel>
              {group.channels.map((channel) => (
                <SelectItem
                  disabled={!channel.canBotSendMessages}
                  key={channel.id}
                  value={channel.id}
                >
                  # {channel.name}
                  {!channel.canBotSendMessages && (
                    <span className="ml-1 text-muted-foreground text-xs">
                      (BOT権限なし)
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>

      {!!error && (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      )}

      {!!successMessage && (
        <output className="text-green-600 text-xs">{successMessage}</output>
      )}
    </div>
  );
}
