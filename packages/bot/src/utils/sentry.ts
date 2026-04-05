import * as Sentry from "@sentry/node";

export type ErrorContext = {
  /** エラーの発生源（"command", "event", "modal", "task" 等） */
  source: string;
  /** コマンド名またはイベント名 */
  name?: string;
  /** Discord ギルドID */
  guildId?: string;
  /** Discord ユーザーID */
  userId?: string;
  /** 追加のキーバリュー情報 */
  extra?: Record<string, unknown>;
};

/** エラーをコンテキスト情報付きで Sentry に報告する */
export function captureError(error: unknown, context: ErrorContext): void {
  Sentry.withScope((scope) => {
    scope.setTag("source", context.source);

    if (context.name) {
      scope.setTag("name", context.name);
    }
    if (context.guildId) {
      scope.setContext("discord", {
        guildId: context.guildId,
        userId: context.userId,
      });
    }
    if (context.extra) {
      scope.setExtras(context.extra);
    }

    Sentry.captureException(error);
  });
}
