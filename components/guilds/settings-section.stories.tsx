import type { Meta, StoryObj } from "@storybook/react";
import { SettingsSection } from "./settings-section";

const meta = {
  title: "Guilds/SettingsSection",
  component: SettingsSection,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (StoryFn) => (
      <div style={{ width: 560 }}>
        <StoryFn />
      </div>
    ),
  ],
} satisfies Meta<typeof SettingsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "権限設定",
    description: "イベント編集の制限を管理します。",
    children: (
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm">イベント編集を管理者のみに制限</span>
        <span className="text-muted-foreground text-xs">OFF</span>
      </div>
    ),
  },
};
