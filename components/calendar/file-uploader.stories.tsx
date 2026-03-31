/**
 * FileUploader Stories
 *
 * Task 3.2: Storybookストーリー作成
 * - 空状態（アップロード領域のみ）
 * - アップロード中（プログレスバー）
 * - アップロード済み（画像+PDF混在）
 * - 上限到達（5件）
 * - エラー状態
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.4, 7.1
 */

import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { FileUploader } from "./file-uploader";

const meta: Meta<typeof FileUploader> = {
  title: "Calendar/FileUploader",
  component: FileUploader,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (StoryFn) => (
      <div style={{ width: "480px", padding: "1rem" }}>
        <StoryFn />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 空状態
 * ドラッグ&ドロップゾーンのみ表示 (Req 4.1)
 */
export const Empty: Story = {
  args: {
    guildId: "guild-1",
    onAttachmentsChange: fn(),
    onPendingDeletionsChange: fn(),
  },
};

/**
 * 既存添付ファイルあり
 * 画像とPDFが混在する状態 (Req 4.2)
 */
export const WithExistingAttachments: Story = {
  args: {
    guildId: "guild-1",
    eventId: "event-1",
    existingAttachments: [
      {
        name: "フライヤー.jpg",
        path: "guild-1/event-1/uuid1_flyer.jpg",
        type: "image/jpeg",
        size: 2_500_000,
      },
      {
        name: "会場地図.pdf",
        path: "guild-1/event-1/uuid2_map.pdf",
        type: "application/pdf",
        size: 1_200_000,
      },
      {
        name: "スケジュール.png",
        path: "guild-1/event-1/uuid3_schedule.png",
        type: "image/png",
        size: 800_000,
      },
    ],
    onAttachmentsChange: fn(),
    onPendingDeletionsChange: fn(),
  },
};

/**
 * 上限到達（5件）
 * アップロード領域が無効化される (Req 5.4)
 */
export const AtLimit: Story = {
  args: {
    guildId: "guild-1",
    eventId: "event-1",
    existingAttachments: Array.from({ length: 5 }, (_, i) => ({
      name: `ファイル${i + 1}.jpg`,
      path: `guild-1/event-1/uuid${i}_file${i}.jpg`,
      type: "image/jpeg",
      size: 500_000 + i * 100_000,
    })),
    onAttachmentsChange: fn(),
    onPendingDeletionsChange: fn(),
  },
};

/**
 * 無効状態
 * フォーム送信中などで操作不可
 */
export const Disabled: Story = {
  args: {
    guildId: "guild-1",
    disabled: true,
    onAttachmentsChange: fn(),
    onPendingDeletionsChange: fn(),
  },
};
