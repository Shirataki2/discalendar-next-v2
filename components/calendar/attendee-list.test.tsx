/**
 * AttendeeList - テスト
 *
 * Task 5: AttendeeList コンポーネントを実装する
 * - ステータス別（参加 / 未定 / 不参加）の参加者数サマリーを表示する
 * - 参加者一覧をステータス別にグループ化し、Discord アバターとユーザー名を表示する
 * - 出欠回答者がいない場合は空状態メッセージを表示する
 *
 * Requirements: 3.1, 3.2, 3.3
 */
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type {
  AttendeeRecord,
  AttendeeSummary,
} from "@/lib/calendar/rsvp-types";
import { AttendeeList } from "./attendee-list";

function createAttendee(
  overrides: Partial<AttendeeRecord> = {}
): AttendeeRecord {
  return {
    id: crypto.randomUUID(),
    event_id: "event-1",
    event_series_id: null,
    occurrence_date: null,
    guild_id: "guild-1",
    user_id: "user-1",
    discord_user_id: "discord-1",
    discord_username: "TestUser",
    discord_avatar_url: null,
    status: "going",
    responded_at: new Date().toISOString(),
    ...overrides,
  };
}

function createSummary(going = 0, maybe = 0, notGoing = 0): AttendeeSummary {
  return { going, maybe, notGoing, total: going + maybe + notGoing };
}

describe("AttendeeList", () => {
  // Req 3.3: 空状態メッセージ
  describe("空状態", () => {
    it("参加者がいない場合に空状態メッセージを表示する", () => {
      render(<AttendeeList attendees={[]} summary={createSummary()} />);
      expect(screen.getByText("まだ回答がありません")).toBeInTheDocument();
    });

    it("参加者がいない場合にサマリーを表示しない", () => {
      render(<AttendeeList attendees={[]} summary={createSummary()} />);
      expect(screen.queryByText(/参加/)).not.toBeInTheDocument();
    });
  });

  // Req 3.1: ステータス別参加者数サマリー
  describe("サマリー表示", () => {
    it("ステータス別の参加者数サマリーを表示する", () => {
      const attendees = [
        createAttendee({ discord_username: "Alice", status: "going" }),
        createAttendee({ discord_username: "Bob", status: "going" }),
        createAttendee({ discord_username: "Charlie", status: "maybe" }),
        createAttendee({ discord_username: "Dave", status: "not_going" }),
      ];
      const summary = createSummary(2, 1, 1);

      render(<AttendeeList attendees={attendees} summary={summary} />);

      const summaryEl = screen.getByTestId("attendee-summary");
      expect(summaryEl).toHaveTextContent("参加 2");
      expect(summaryEl).toHaveTextContent("未定 1");
      expect(summaryEl).toHaveTextContent("不参加 1");
    });

    it("0人のステータスも表示する", () => {
      const attendees = [
        createAttendee({ discord_username: "Alice", status: "going" }),
      ];
      const summary = createSummary(1, 0, 0);

      render(<AttendeeList attendees={attendees} summary={summary} />);

      const summaryEl = screen.getByTestId("attendee-summary");
      expect(summaryEl).toHaveTextContent("参加 1");
      expect(summaryEl).toHaveTextContent("未定 0");
      expect(summaryEl).toHaveTextContent("不参加 0");
    });
  });

  // Req 3.2: 参加者一覧表示
  describe("参加者一覧", () => {
    it("ステータス別にグループ化して表示する", () => {
      const attendees = [
        createAttendee({ discord_username: "Alice", status: "going" }),
        createAttendee({ discord_username: "Bob", status: "maybe" }),
        createAttendee({ discord_username: "Charlie", status: "not_going" }),
      ];
      const summary = createSummary(1, 1, 1);

      render(<AttendeeList attendees={attendees} summary={summary} />);

      const goingGroup = screen.getByTestId("attendee-group-going");
      expect(within(goingGroup).getByText("Alice")).toBeInTheDocument();

      const maybeGroup = screen.getByTestId("attendee-group-maybe");
      expect(within(maybeGroup).getByText("Bob")).toBeInTheDocument();

      const notGoingGroup = screen.getByTestId("attendee-group-not_going");
      expect(within(notGoingGroup).getByText("Charlie")).toBeInTheDocument();
    });

    it("参加者のDiscordユーザー名を表示する", () => {
      const attendees = [
        createAttendee({ discord_username: "Alice", status: "going" }),
        createAttendee({ discord_username: "Bob", status: "going" }),
      ];
      const summary = createSummary(2, 0, 0);

      render(<AttendeeList attendees={attendees} summary={summary} />);

      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
    });

    it("アバターURLがある場合でもユーザー名が表示される", () => {
      const attendees = [
        createAttendee({
          discord_username: "Alice",
          discord_avatar_url: "https://cdn.discordapp.com/avatars/123/abc.png",
          status: "going",
        }),
      ];
      const summary = createSummary(1, 0, 0);

      render(<AttendeeList attendees={attendees} summary={summary} />);

      // Radix Avatar は JSDOM で画像のonLoadが発火しないためフォールバック表示
      // ユーザー名と Avatar コンテナが正しくレンダリングされることを検証
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(
        document.querySelector('[data-slot="avatar"]')
      ).toBeInTheDocument();
    });

    it("アバターURLがない場合にフォールバックを表示する", () => {
      const attendees = [
        createAttendee({
          discord_username: "Alice",
          discord_avatar_url: null,
          status: "going",
        }),
      ];
      const summary = createSummary(1, 0, 0);

      render(<AttendeeList attendees={attendees} summary={summary} />);

      // フォールバック: ユーザー名の頭文字
      expect(screen.getByText("A")).toBeInTheDocument();
    });

    it("該当者がいないステータスグループは表示しない", () => {
      const attendees = [
        createAttendee({ discord_username: "Alice", status: "going" }),
      ];
      const summary = createSummary(1, 0, 0);

      render(<AttendeeList attendees={attendees} summary={summary} />);

      expect(screen.getByTestId("attendee-group-going")).toBeInTheDocument();
      expect(
        screen.queryByTestId("attendee-group-maybe")
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("attendee-group-not_going")
      ).not.toBeInTheDocument();
    });
  });
});
