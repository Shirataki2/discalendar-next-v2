/**
 * AttachmentDisplay Stories
 *
 * Task 4.1: Storybookストーリー作成
 * - 画像のみ
 * - PDFのみ
 * - 画像+PDF混在
 * - 空（非表示）
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import type { Meta, StoryObj } from "@storybook/react";
import { AttachmentDisplay } from "./attachment-display";

const meta: Meta<typeof AttachmentDisplay> = {
  title: "Calendar/AttachmentDisplay",
  component: AttachmentDisplay,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (StoryFn) => (
      <div style={{ width: "400px", padding: "1rem" }}>
        <StoryFn />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 画像のみ
 * サムネイルグリッドで表示 (Req 6.1)
 */
export const ImagesOnly: Story = {
  args: {
    attachments: [
      {
        name: "フライヤー.jpg",
        path: "g1/e1/uuid1_flyer.jpg",
        type: "image/jpeg",
        size: 2_500_000,
        signedUrl: "https://picsum.photos/seed/flyer/400/300",
      },
      {
        name: "会場写真.png",
        path: "g1/e1/uuid2_venue.png",
        type: "image/png",
        size: 1_800_000,
        signedUrl: "https://picsum.photos/seed/venue/400/300",
      },
      {
        name: "地図.webp",
        path: "g1/e1/uuid3_map.webp",
        type: "image/webp",
        size: 900_000,
        signedUrl: "https://picsum.photos/seed/map/400/300",
      },
    ],
  },
};

/**
 * PDFのみ
 * ファイル名・サイズ付きダウンロードリンク (Req 6.2)
 */
export const PdfOnly: Story = {
  args: {
    attachments: [
      {
        name: "タイムテーブル.pdf",
        path: "g1/e1/uuid1_timetable.pdf",
        type: "application/pdf",
        size: 1_200_000,
        signedUrl: "#",
      },
      {
        name: "参加者リスト.pdf",
        path: "g1/e1/uuid2_attendees.pdf",
        type: "application/pdf",
        size: 350_000,
        signedUrl: "#",
      },
    ],
  },
};

/**
 * 画像+PDF混在
 * 両セクションを表示
 */
export const Mixed: Story = {
  args: {
    attachments: [
      {
        name: "ポスター.jpg",
        path: "g1/e1/uuid1_poster.jpg",
        type: "image/jpeg",
        size: 3_000_000,
        signedUrl: "https://picsum.photos/seed/poster/400/600",
      },
      {
        name: "スケジュール.pdf",
        path: "g1/e1/uuid2_schedule.pdf",
        type: "application/pdf",
        size: 500_000,
        signedUrl: "#",
      },
    ],
  },
};

/**
 * 空（非表示）
 * attachmentsが空配列のとき何も表示しない (Req 6.5)
 */
export const Empty: Story = {
  args: {
    attachments: [],
  },
};
