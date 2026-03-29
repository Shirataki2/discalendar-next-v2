import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import type { EventRecord } from "../types/event.js";
import { formatDateTime } from "./datetime.js";

export const MODAL_FIELD_IDS = {
  title: "event-title",
  description: "event-description",
  startAt: "event-start-at",
  endAt: "event-end-at",
  isAllDay: "event-is-all-day",
} as const;

export const MODAL_CUSTOM_IDS = {
  create: "event-create",
  editPrefix: "event-edit:",
} as const;

function buildTitleInput(value?: string): ActionRowBuilder<TextInputBuilder> {
  const input = new TextInputBuilder()
    .setCustomId(MODAL_FIELD_IDS.title)
    .setLabel("タイトル")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);
  if (value !== undefined) {
    input.setValue(value);
  }
  return new ActionRowBuilder<TextInputBuilder>().addComponents(input);
}

function buildDescriptionInput(
  value?: string
): ActionRowBuilder<TextInputBuilder> {
  const input = new TextInputBuilder()
    .setCustomId(MODAL_FIELD_IDS.description)
    .setLabel("説明")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(1024);
  if (value !== undefined) {
    input.setValue(value);
  }
  return new ActionRowBuilder<TextInputBuilder>().addComponents(input);
}

function buildStartAtInput(value?: string): ActionRowBuilder<TextInputBuilder> {
  const input = new TextInputBuilder()
    .setCustomId(MODAL_FIELD_IDS.startAt)
    .setLabel("開始日時")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder(`${new Date().getFullYear()}/03/29 15:00`);
  if (value !== undefined) {
    input.setValue(value);
  }
  return new ActionRowBuilder<TextInputBuilder>().addComponents(input);
}

function buildEndAtInput(value?: string): ActionRowBuilder<TextInputBuilder> {
  const input = new TextInputBuilder()
    .setCustomId(MODAL_FIELD_IDS.endAt)
    .setLabel("終了日時")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder(`${new Date().getFullYear()}/03/29 16:00`);
  if (value !== undefined) {
    input.setValue(value);
  }
  return new ActionRowBuilder<TextInputBuilder>().addComponents(input);
}

function buildIsAllDayInput(
  value?: string
): ActionRowBuilder<TextInputBuilder> {
  const input = new TextInputBuilder()
    .setCustomId(MODAL_FIELD_IDS.isAllDay)
    .setLabel("終日")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setPlaceholder("true または false");
  if (value !== undefined) {
    input.setValue(value);
  }
  return new ActionRowBuilder<TextInputBuilder>().addComponents(input);
}

export function buildCreateModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(MODAL_CUSTOM_IDS.create)
    .setTitle("イベント作成")
    .addComponents(
      buildTitleInput(),
      buildDescriptionInput(),
      buildStartAtInput(),
      buildEndAtInput(),
      buildIsAllDayInput()
    );
}

export function buildEditModal(event: EventRecord): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(`${MODAL_CUSTOM_IDS.editPrefix}${event.id}`)
    .setTitle("イベント編集")
    .addComponents(
      buildTitleInput(event.name),
      buildDescriptionInput(event.description ?? undefined),
      buildStartAtInput(formatDateTime(new Date(event.start_at))),
      buildEndAtInput(formatDateTime(new Date(event.end_at))),
      buildIsAllDayInput(String(event.is_all_day))
    );
}

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseEditCustomId(customId: string): string | null {
  if (!customId.startsWith(MODAL_CUSTOM_IDS.editPrefix)) {
    return null;
  }
  const eventId = customId.slice(MODAL_CUSTOM_IDS.editPrefix.length);
  if (!(eventId && UUID_V4_PATTERN.test(eventId))) {
    return null;
  }
  return eventId;
}
