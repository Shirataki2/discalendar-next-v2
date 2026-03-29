import { TextInputStyle } from "discord.js";
import { describe, expect, it } from "vitest";
import type { EventRecord } from "../types/event.js";
import {
  buildCreateModal,
  buildEditModal,
  MODAL_CUSTOM_IDS,
  MODAL_FIELD_IDS,
  parseEditCustomId,
} from "./modal.js";

function makeEvent(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: "550e8400-e29b-41d4-a716-446655440000",
    guild_id: "guild-1",
    name: "テストイベント",
    description: "テスト説明",
    color: "#3e44f7",
    is_all_day: false,
    start_at: "2025-03-29T06:00:00.000Z", // 15:00 JST
    end_at: "2025-03-29T08:00:00.000Z", // 17:00 JST
    location: null,
    channel_id: null,
    channel_name: null,
    notifications: [],
    created_at: "2025-03-01T00:00:00.000Z",
    updated_at: "2025-03-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("MODAL_FIELD_IDS", () => {
  it("should have correct field IDs", () => {
    expect(MODAL_FIELD_IDS.title).toBe("event-title");
    expect(MODAL_FIELD_IDS.description).toBe("event-description");
    expect(MODAL_FIELD_IDS.startAt).toBe("event-start-at");
    expect(MODAL_FIELD_IDS.endAt).toBe("event-end-at");
    expect(MODAL_FIELD_IDS.isAllDay).toBe("event-is-all-day");
  });
});

describe("MODAL_CUSTOM_IDS", () => {
  it("should have correct custom IDs", () => {
    expect(MODAL_CUSTOM_IDS.create).toBe("event-create");
    expect(MODAL_CUSTOM_IDS.editPrefix).toBe("event-edit:");
  });
});

describe("buildCreateModal", () => {
  it("should create a modal with correct customId and title", () => {
    const modal = buildCreateModal();
    const json = modal.toJSON();
    expect(json.custom_id).toBe("event-create");
    expect(json.title).toBe("イベント作成");
  });

  it("should have 5 action rows", () => {
    const modal = buildCreateModal();
    const json = modal.toJSON();
    expect(json.components).toHaveLength(5);
  });

  it("should have title field as required Short input", () => {
    const modal = buildCreateModal();
    const json = modal.toJSON();
    const titleRow = json.components[0];
    const titleInput = titleRow.components[0];
    expect(titleInput.custom_id).toBe("event-title");
    expect(titleInput.style).toBe(TextInputStyle.Short);
    expect(titleInput.required).toBe(true);
  });

  it("should have description field as optional Paragraph input", () => {
    const modal = buildCreateModal();
    const json = modal.toJSON();
    const descRow = json.components[1];
    const descInput = descRow.components[0];
    expect(descInput.custom_id).toBe("event-description");
    expect(descInput.style).toBe(TextInputStyle.Paragraph);
    expect(descInput.required).toBe(false);
  });

  it("should have start datetime field with placeholder", () => {
    const modal = buildCreateModal();
    const json = modal.toJSON();
    const startRow = json.components[2];
    const startInput = startRow.components[0];
    expect(startInput.custom_id).toBe("event-start-at");
    expect(startInput.style).toBe(TextInputStyle.Short);
    expect(startInput.required).toBe(true);
    expect(startInput.placeholder).toContain("/");
  });

  it("should have end datetime field with placeholder", () => {
    const modal = buildCreateModal();
    const json = modal.toJSON();
    const endRow = json.components[3];
    const endInput = endRow.components[0];
    expect(endInput.custom_id).toBe("event-end-at");
    expect(endInput.style).toBe(TextInputStyle.Short);
    expect(endInput.required).toBe(true);
    expect(endInput.placeholder).toContain("/");
  });

  it("should have all-day field with placeholder for true/false", () => {
    const modal = buildCreateModal();
    const json = modal.toJSON();
    const allDayRow = json.components[4];
    const allDayInput = allDayRow.components[0];
    expect(allDayInput.custom_id).toBe("event-is-all-day");
    expect(allDayInput.style).toBe(TextInputStyle.Short);
    expect(allDayInput.required).toBe(false);
    expect(allDayInput.placeholder).toContain("true");
  });
});

describe("buildEditModal", () => {
  it("should create a modal with edit customId containing event ID", () => {
    const event = makeEvent();
    const modal = buildEditModal(event);
    const json = modal.toJSON();
    expect(json.custom_id).toBe(
      "event-edit:550e8400-e29b-41d4-a716-446655440000"
    );
    expect(json.title).toBe("イベント編集");
  });

  it("should have 5 action rows", () => {
    const event = makeEvent();
    const modal = buildEditModal(event);
    const json = modal.toJSON();
    expect(json.components).toHaveLength(5);
  });

  it("should prefill title with existing event name", () => {
    const event = makeEvent({ name: "既存イベント" });
    const modal = buildEditModal(event);
    const json = modal.toJSON();
    const titleInput = json.components[0].components[0];
    expect(titleInput.value).toBe("既存イベント");
  });

  it("should prefill description with existing value", () => {
    const event = makeEvent({ description: "既存説明文" });
    const modal = buildEditModal(event);
    const json = modal.toJSON();
    const descInput = json.components[1].components[0];
    expect(descInput.value).toBe("既存説明文");
  });

  it("should prefill start datetime as JST formatted string", () => {
    const event = makeEvent({ start_at: "2025-03-29T06:00:00.000Z" });
    const modal = buildEditModal(event);
    const json = modal.toJSON();
    const startInput = json.components[2].components[0];
    // 2025-03-29T06:00:00Z = 2025/03/29 15:00 JST
    expect(startInput.value).toBe("2025/03/29 15:00");
  });

  it("should prefill end datetime as JST formatted string", () => {
    const event = makeEvent({ end_at: "2025-03-29T08:00:00.000Z" });
    const modal = buildEditModal(event);
    const json = modal.toJSON();
    const endInput = json.components[3].components[0];
    // 2025-03-29T08:00:00Z = 2025/03/29 17:00 JST
    expect(endInput.value).toBe("2025/03/29 17:00");
  });

  it("should prefill all-day flag as string", () => {
    const event = makeEvent({ is_all_day: true });
    const modal = buildEditModal(event);
    const json = modal.toJSON();
    const allDayInput = json.components[4].components[0];
    expect(allDayInput.value).toBe("true");
  });

  it("should handle null description", () => {
    const event = makeEvent({ description: null });
    const modal = buildEditModal(event);
    const json = modal.toJSON();
    const descInput = json.components[1].components[0];
    expect(descInput.value).toBeUndefined();
  });
});

describe("parseEditCustomId", () => {
  it("should extract event ID from edit customId", () => {
    expect(
      parseEditCustomId("event-edit:550e8400-e29b-41d4-a716-446655440000")
    ).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("should return null for create customId", () => {
    expect(parseEditCustomId("event-create")).toBeNull();
  });

  it("should return null for unknown customId", () => {
    expect(parseEditCustomId("unknown-modal")).toBeNull();
  });

  it("should return null for empty edit prefix", () => {
    expect(parseEditCustomId("event-edit:")).toBeNull();
  });

  it("should return null for non-UUID format", () => {
    expect(parseEditCustomId("event-edit:abc-123")).toBeNull();
    expect(parseEditCustomId("event-edit:not-a-uuid")).toBeNull();
  });
});
