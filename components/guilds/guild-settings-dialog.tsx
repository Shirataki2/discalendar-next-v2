/**
 * GuildSettingsDialog - ギルド設定ダイアログコンポーネント
 *
 * DIS-47: カレンダー表示領域最大化のため、GuildSettingsPanelをDialog内に配置
 */
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GuildSettingsPanel } from "./guild-settings-panel";

export type GuildSettingsDialogProps = {
  /** ダイアログの開閉状態 */
  open: boolean;
  /** ダイアログの開閉状態変更コールバック */
  onOpenChange: (open: boolean) => void;
  /** ギルドID */
  guildId: string;
  /** 現在の restricted フラグ */
  restricted: boolean;
};

/**
 * ギルド設定ダイアログ
 *
 * GuildSettingsPanelをDialogでラップし、ツールバーの歯車ボタンから開く。
 */
export function GuildSettingsDialog({
  open,
  onOpenChange,
  guildId,
  restricted,
}: GuildSettingsDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>サーバー設定</DialogTitle>
          <DialogDescription>
            サーバーのイベント管理設定を変更できます。
          </DialogDescription>
        </DialogHeader>
        <GuildSettingsPanel
          guildId={guildId}
          hideTitle
          restricted={restricted}
        />
      </DialogContent>
    </Dialog>
  );
}
