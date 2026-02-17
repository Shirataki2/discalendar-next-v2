import type { Meta, StoryObj } from "@storybook/react";
import { DocPagination } from "./doc-pagination";

const meta: Meta<typeof DocPagination> = {
  title: "Docs/DocPagination",
  component: DocPagination,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const BothLinks: Story = {
  args: {
    prev: {
      slug: "login",
      title: "ログイン",
      order: 1,
      description: "",
    },
    next: {
      slug: "invite",
      title: "Botの招待",
      order: 2,
      description: "",
    },
  },
};

export const PrevOnly: Story = {
  args: {
    prev: {
      slug: "edit",
      title: "予定の編集と削除",
      order: 5,
      description: "",
    },
    next: undefined,
  },
};

export const NextOnly: Story = {
  args: {
    prev: undefined,
    next: {
      slug: "login",
      title: "ログイン",
      order: 1,
      description: "",
    },
  },
};
