import type { Meta, StoryObj } from "@storybook/react";
import { DOC_ENTRIES } from "@/lib/docs/config";
import { DocNavigation } from "./doc-navigation";

const meta: Meta<typeof DocNavigation> = {
  title: "Docs/DocNavigation",
  component: DocNavigation,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    entries: DOC_ENTRIES,
    currentSlug: "getting-started",
  },
};

export const MiddlePage: Story = {
  args: {
    entries: DOC_ENTRIES,
    currentSlug: "initialize",
  },
};

export const LastPage: Story = {
  args: {
    entries: DOC_ENTRIES,
    currentSlug: "commands",
  },
};
