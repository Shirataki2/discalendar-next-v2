/**
 * AttendeeList - ステータス別参加者一覧コンポーネント
 *
 * Task 5: AttendeeList コンポーネントを実装する
 *
 * Requirements: 3.1, 3.2, 3.3
 */

import { Check, HelpCircle, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type {
  AttendeeRecord,
  AttendeeSummary,
  RsvpStatus,
} from "@/lib/calendar/rsvp-types";

export type AttendeeListProps = {
  attendees: AttendeeRecord[];
  summary: AttendeeSummary;
};

const STATUS_CONFIG: {
  status: RsvpStatus;
  label: string;
  summaryKey: keyof AttendeeSummary;
  icon: typeof Check;
}[] = [
  { status: "going", label: "参加", summaryKey: "going", icon: Check },
  { status: "maybe", label: "未定", summaryKey: "maybe", icon: HelpCircle },
  {
    status: "not_going",
    label: "不参加",
    summaryKey: "notGoing",
    icon: X,
  },
];

function groupByStatus(
  attendees: AttendeeRecord[]
): Record<RsvpStatus, AttendeeRecord[]> {
  const groups: Record<RsvpStatus, AttendeeRecord[]> = {
    going: [],
    maybe: [],
    not_going: [],
  };
  for (const a of attendees) {
    groups[a.status].push(a);
  }
  return groups;
}

export function AttendeeList({ attendees, summary }: AttendeeListProps) {
  if (attendees.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">まだ回答がありません</p>
    );
  }

  const groups = groupByStatus(attendees);

  return (
    <div className="space-y-3">
      {/* サマリー */}
      <div
        className="flex gap-3 text-muted-foreground text-sm"
        data-testid="attendee-summary"
      >
        {STATUS_CONFIG.map(({ status, label, summaryKey, icon: Icon }) => (
          <span className="flex items-center gap-1" key={status}>
            <Icon className="h-3.5 w-3.5" />
            {label} {String(summary[summaryKey])}
          </span>
        ))}
      </div>

      {/* ステータス別参加者一覧 */}
      {STATUS_CONFIG.map(({ status, label, icon: Icon }) => {
        const members = groups[status];
        if (members.length === 0) {
          return null;
        }

        return (
          <div data-testid={`attendee-group-${status}`} key={status}>
            <div className="mb-1 flex items-center gap-1 text-muted-foreground text-xs">
              <Icon className="h-3 w-3" />
              <span>
                {label}（{members.length}）
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {members.map((member) => (
                <div className="flex items-center gap-1.5" key={member.id}>
                  <Avatar size="sm">
                    {member.discord_avatar_url ? (
                      <AvatarImage
                        alt={member.discord_username}
                        src={member.discord_avatar_url}
                      />
                    ) : null}
                    <AvatarFallback>
                      {member.discord_username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{member.discord_username}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
