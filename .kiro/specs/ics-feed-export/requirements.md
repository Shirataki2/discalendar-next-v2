# Requirements Document

## Introduction

Supabase Edge Functionsを使ってICS (.ics) フィードを動的生成し、Google Calendar・Apple Calendar・Outlookなどの外部カレンダーアプリからDiscalendarの予定を購読可能にする機能の要件定義。

### 背景

- 外部カレンダーアプリとの連携は一般的なユーザー要望
- Supabase Edge Functionsは設定済みだが未活用
- ICS (iCalendar) はRFC 5545で標準化されたフォーマットで、主要カレンダーアプリすべてが対応
- 既存DBに `guilds.is_public` / `guilds.public_slug` による公開/非公開カレンダーの仕組みがある

### 関連イシュー

- [DIS-125 ICSフィードエクスポート (Supabase Edge Functions)](https://linear.app/ff2345/issue/DIS-125)
- [DIS-134 アクセストークン管理用のDBスキーマとマイグレーション追加](https://linear.app/ff2345/issue/DIS-134)
- [DIS-135 ICSフィード生成Edge Function実装](https://linear.app/ff2345/issue/DIS-135)
- [DIS-136 アクセストークン認証と公開/非公開カレンダー制御](https://linear.app/ff2345/issue/DIS-136)
- [DIS-137 Web UIにICSフィードURLコピー機能追加](https://linear.app/ff2345/issue/DIS-137)

## Requirements

### Requirement 1: ICSフィードエンドポイント

**Objective:** カレンダーアプリのユーザーとして、DiscalendarのギルドカレンダーをICSフィードURLで購読したい。外部カレンダーアプリで予定を確認できるようにするため。

#### Acceptance Criteria

1. When 外部カレンダーアプリがICSフィードURLにGETリクエストを送信した場合, the Edge Function shall Content-Type `text/calendar; charset=utf-8` でレスポンスを返す
2. The Edge Function shall レスポンスにRFC 5545準拠のVCALENDARオブジェクトを含める（VERSION:2.0, PRODID, X-WR-CALNAME を含む）
3. When 存在しない `guild_id` が指定された場合, the Edge Function shall HTTPステータス 404 を返す
4. The Edge Function shall レスポンスにキャッシュヘッダー（Cache-Control）を設定し、外部カレンダーアプリの適切なポーリング間隔を示す

### Requirement 2: 単発イベントのICS出力

**Objective:** カレンダーアプリのユーザーとして、Discalendarの単発イベントを外部カレンダーで確認したい。予定の二重管理を避けるため。

#### Acceptance Criteria

1. When ギルドに単発イベント（events テーブル、series_id が NULL）が存在する場合, the Edge Function shall 各イベントをVEVENTコンポーネントとして出力する
2. The Edge Function shall 各VEVENTに DTSTART, DTEND, SUMMARY, UID を必須フィールドとして含める
3. Where イベントに description が設定されている場合, the Edge Function shall VEVENTにDESCRIPTIONフィールドを含める
4. Where イベントに location が設定されている場合, the Edge Function shall VEVENTにLOCATIONフィールドを含める
5. Where イベントが終日イベント（is_all_day = true）の場合, the Edge Function shall DTSTART/DTENDをDATE型（VALUE=DATE）で出力する
6. The Edge Function shall UIDとしてイベントのUUID + ドメインサフィックスの形式を使用する（例: `{event.id}@discalendar.app`）

### Requirement 3: 繰り返しイベントのICS出力

**Objective:** カレンダーアプリのユーザーとして、Discalendarの繰り返しイベントも外部カレンダーで確認したい。定期予定を漏れなく同期するため。

#### Acceptance Criteria

1. When ギルドに繰り返しイベント（event_series テーブル）が存在する場合, the Edge Function shall 各シリーズをRRULE付きVEVENTコンポーネントとして出力する
2. The Edge Function shall event_series.rrule の値をそのままRRULEプロパティとして出力する
3. The Edge Function shall DTSTARTとして event_series.dtstart を使用し、DTENDとして dtstart + duration_minutes を計算して出力する
4. Where event_series.exdates に除外日が含まれる場合, the Edge Function shall EXDATEプロパティとして出力する
5. Where 繰り返しイベントに例外オカレンス（events テーブル、series_id が NOT NULL）が存在する場合, the Edge Function shall RECURRENCE-ID付きの個別VEVENTとして出力する

### Requirement 4: アクセストークン認証

**Objective:** ギルド管理者として、非公開カレンダーのICSフィードへのアクセスを制御したい。許可されたユーザーのみが予定を閲覧できるようにするため。

#### Acceptance Criteria

1. When 非公開ギルド（is_public = false）のICSフィードが有効なアクセストークン付きでリクエストされた場合, the Edge Function shall 正常にICSフィードを返す
2. When 非公開ギルドのICSフィードがアクセストークンなし、または無効なトークンでリクエストされた場合, the Edge Function shall HTTPステータス 401 を返す
3. When 公開ギルド（is_public = true）のICSフィードがリクエストされた場合, the Edge Function shall アクセストークンの有無に関わらずICSフィードを返す
4. The Edge Function shall アクセストークンをクエリパラメータ（`?token=xxx`）で受け取る
5. The ICSフィード用アクセストークン shall ギルドごとに一意のランダム文字列として生成・保存される

### Requirement 5: アクセストークン管理（DBスキーマ）

**Objective:** システムとして、ICSフィード用のアクセストークンをセキュアに管理したい。トークンの発行・検証・無効化を確実に行うため。

#### Acceptance Criteria

1. The データベース shall ICSフィードアクセストークンを格納するテーブル（ics_feed_tokens）を持つ
2. The ics_feed_tokens テーブル shall guild_id, token, created_at, revoked_at カラムを含む
3. The token カラム shall 十分なエントロピーを持つランダム文字列（最低32文字）を格納する
4. When トークンが無効化（revoke）された場合, the Edge Function shall そのトークンでのアクセスを拒否する
5. The データベース shall guild_id と token にユニーク制約またはインデックスを持ち、高速な検証を可能にする

### Requirement 6: Web UIフィードURL管理

**Objective:** ギルドメンバーとして、ICSフィードURLを簡単にコピーして外部カレンダーアプリに登録したい。設定の手間を最小化するため。

#### Acceptance Criteria

1. When ユーザーがギルドのカレンダー設定画面を開いた場合, the Web UI shall ICSフィードURLを表示する
2. When ユーザーがコピーボタンをクリックした場合, the Web UI shall ICSフィードURLをクリップボードにコピーし、コピー完了のフィードバックを表示する
3. While ギルドが非公開（is_public = false）の場合, the Web UI shall アクセストークン付きのURLを表示する
4. While ギルドが公開（is_public = true）の場合, the Web UI shall トークンなしのURLを表示する
5. When ユーザーがトークン再生成ボタンをクリックした場合, the Web UI shall 既存トークンを無効化し、新しいトークンでURLを更新する

### Requirement 7: セキュリティとパフォーマンス

**Objective:** システムとして、ICSフィードを安全かつ効率的に提供したい。不正アクセスの防止とサーバー負荷の最適化のため。

#### Acceptance Criteria

1. The Edge Function shall SQLインジェクションを防ぐためにパラメータ化クエリを使用する
2. The Edge Function shall レートリミットまたはキャッシュ戦略により過剰なリクエストに対応する
3. The Edge Function shall ICS出力に channel_id, channel_name, notifications などの内部情報を含めない
4. The アクセストークン shall タイミング攻撃を防ぐために定数時間比較で検証される
