/**
 * DashboardHeader Storybook
 *
 * ダッシュボード共通ヘッダーのストーリー。
 * ロゴ、ThemeSwitcher、UserMenu（ドロップダウン）を表示する。
 */
import type { Meta, StoryObj } from "@storybook/react";
import type { DashboardUser } from "@/types/user";
import { DashboardHeader } from "./dashboard-header";

const meta = {
  title: "Components/Dashboard/DashboardHeader",
  component: DashboardHeader,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof DashboardHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockUserWithAvatar: DashboardUser = {
  id: "user-1",
  email: "test@example.com",
  fullName: "Test User",
  avatarUrl: "https://cdn.discordapp.com/avatars/123456789/abc123.png",
};

const mockUserWithoutAvatar: DashboardUser = {
  id: "user-2",
  email: "noavatar@example.com",
  fullName: "No Avatar User",
  avatarUrl: null,
};

const mockUserWithoutFullName: DashboardUser = {
  id: "user-3",
  email: "nofullname@example.com",
  fullName: null,
  avatarUrl: "https://cdn.discordapp.com/avatars/456789123/def456.png",
};

export const Default: Story = {
  args: {
    user: mockUserWithAvatar,
  },
};

export const NoAvatar: Story = {
  args: {
    user: mockUserWithoutAvatar,
  },
};

export const NoFullName: Story = {
  args: {
    user: mockUserWithoutFullName,
  },
};
