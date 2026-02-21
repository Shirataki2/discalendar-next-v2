import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { DatePicker } from "./date-picker";

const meta: Meta<typeof DatePicker> = {
  title: "UI/DatePicker",
  component: DatePicker,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (StoryFn) => (
      <div style={{ width: "280px", padding: "1rem" }}>
        <StoryFn />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: undefined,
    onChange: fn(),
    placeholder: "日付を選択",
  },
};

export const WithValue: Story = {
  args: {
    value: new Date(2026, 1, 15),
    onChange: fn(),
  },
};

export const Disabled: Story = {
  args: {
    value: new Date(2026, 1, 15),
    onChange: fn(),
    disabled: true,
  },
};

export const Error: Story = {
  args: {
    value: undefined,
    onChange: fn(),
    hasError: true,
    placeholder: "日付を選択",
  },
};

export const DarkMode: Story = {
  args: {
    value: new Date(2026, 1, 15),
    onChange: fn(),
  },
  decorators: [
    (StoryFn) => (
      <div className="dark" style={{ padding: "1rem", background: "#0e1629" }}>
        <StoryFn />
      </div>
    ),
  ],
};
