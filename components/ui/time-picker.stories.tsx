import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { TimePicker } from "./time-picker";

const meta: Meta<typeof TimePicker> = {
  title: "UI/TimePicker",
  component: TimePicker,
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
    placeholder: "時刻を選択",
  },
};

export const WithValue: Story = {
  args: {
    value: new Date(2026, 1, 15, 14, 30),
    onChange: fn(),
  },
};

export const CustomStep: Story = {
  args: {
    value: new Date(2026, 1, 15, 10, 0),
    onChange: fn(),
    minuteStep: 15,
  },
};

export const Disabled: Story = {
  args: {
    value: new Date(2026, 1, 15, 14, 30),
    onChange: fn(),
    disabled: true,
  },
};

export const Error: Story = {
  args: {
    value: undefined,
    onChange: fn(),
    hasError: true,
    placeholder: "時刻を選択",
  },
};
