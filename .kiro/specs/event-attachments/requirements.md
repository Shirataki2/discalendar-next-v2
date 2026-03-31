# Requirements Document

## Introduction

Discalendarのカレンダーイベントにファイル添付機能を追加する。Supabase Storageをバックエンドとして、イベントにポスター画像・PDF等のファイルを添付し、カレンダーUIから閲覧・ダウンロードできるようにする。これによりイベントの詳細をリッチに表現でき、フライヤー画像や会場地図PDFなどを共有可能になる。

## Project Description (Input)

イベント添付ファイル機能（Supabase Storage）

Supabase Storageを活用し、イベントにポスター画像やPDFなどのファイルを添付できるようにする。

## 背景

* イベントの詳細をリッチに表現したい（フライヤー画像、地図PDF等）
* Supabase Storageは設定済み（50MiB上限）だが未活用

## Requirements

### Requirement 1: データベーススキーマ拡張

**Objective:** As a 開発者, I want eventsテーブルに添付ファイルメタデータを保存できるカラムを追加したい, so that イベントとファイルの関連をDBレベルで管理できる

#### Acceptance Criteria

1. The Discalendar system shall eventsテーブルに `attachments` カラム（JSONB型、デフォルト `'[]'::jsonb`、NULL不可）を持つ
2. The Discalendar system shall attachmentsカラムの各要素に `name`（ファイル名）、`path`（Storageパス）、`type`（MIMEタイプ）、`size`（バイト数）を含む
3. The Discalendar system shall event_seriesテーブルに同様の `attachments` カラム（JSONB型、デフォルト `'[]'::jsonb`、NULL不可）を持つ
4. The Discalendar system shall 既存のイベントデータに影響を与えずマイグレーションを適用できる

### Requirement 2: Supabase Storageバケット構成

**Objective:** As a 開発者, I want イベント添付ファイル用のStorageバケットを用意したい, so that ファイルを安全かつ効率的に保存・配信できる

#### Acceptance Criteria

1. The Discalendar system shall `event-attachments` という名前のStorageバケットを持つ
2. The Discalendar system shall バケット内のファイルを `events/{event_id}/{filename}` のパス構造で保存する
3. The Discalendar system shall バケットのファイルサイズ上限を10MiBに設定する

### Requirement 3: ストレージアクセス制御

**Objective:** As a サーバー管理者, I want ギルドメンバーのみが添付ファイルにアクセスできるようにしたい, so that イベント情報のプライバシーが保護される

#### Acceptance Criteria

1. When 認証済みユーザーがファイルをアップロードするとき, the Storage RLS policy shall そのユーザーが対象ギルドのメンバーである場合のみアップロードを許可する
2. When 認証済みユーザーがファイルを閲覧・ダウンロードするとき, the Storage RLS policy shall そのユーザーが対象ギルドのメンバーである場合のみアクセスを許可する
3. When 認証済みユーザーがファイルを削除するとき, the Storage RLS policy shall そのユーザーが対象ギルドのメンバーである場合のみ削除を許可する
4. If 未認証ユーザーがStorageのファイルにアクセスしようとした場合, the Storage RLS policy shall アクセスを拒否する

### Requirement 4: ファイルアップロードUI

**Objective:** As a ギルドメンバー, I want イベント作成・編集フォームからファイルをアップロードしたい, so that イベントにリッチな情報を添付できる

#### Acceptance Criteria

1. When イベント作成フォームを表示するとき, the Event Form shall ファイルアップロード領域を表示する
2. When イベント編集フォームを表示するとき, the Event Form shall 既存の添付ファイル一覧とファイルアップロード領域を表示する
3. When ユーザーがファイルをドラッグ&ドロップまたはクリックで選択したとき, the Event Form shall 選択されたファイルをアップロード候補としてプレビュー表示する
4. When ファイルをアップロード中のとき, the Event Form shall 各ファイルのアップロード進捗をプログレスバーで表示する
5. When アップロードが完了したとき, the Event Form shall アップロード済みファイルを添付ファイル一覧に追加する

### Requirement 5: ファイルバリデーション

**Objective:** As a システム, I want 不正なファイルのアップロードを防止したい, so that ストレージの安全性と効率性が保たれる

#### Acceptance Criteria

1. If アップロードされたファイルのサイズが10MBを超える場合, the Event Form shall アップロードを拒否しエラーメッセージを表示する
2. If アップロードされたファイルのMIMEタイプが許可リスト（image/jpeg, image/png, image/gif, image/webp, application/pdf）に含まれない場合, the Event Form shall アップロードを拒否しエラーメッセージを表示する
3. The Discalendar system shall 1イベントあたりの添付ファイル数上限を5件とする
4. If 添付ファイル数が上限に達している場合, the Event Form shall アップロード領域を無効化し上限到達メッセージを表示する

### Requirement 6: 添付ファイル表示

**Objective:** As a ギルドメンバー, I want イベントの添付ファイルを適切な形式で閲覧したい, so that イベント情報を直感的に理解できる

#### Acceptance Criteria

1. When イベント詳細を表示するとき, the Event Display shall 添付された画像ファイル（jpeg, png, gif, webp）をサムネイルプレビューとして表示する
2. When イベント詳細を表示するとき, the Event Display shall 添付されたPDFファイルをファイル名・サイズ付きのダウンロードリンクとして表示する
3. When ユーザーがサムネイル画像をクリックしたとき, the Event Display shall 画像を拡大表示する
4. When ユーザーがダウンロードリンクをクリックしたとき, the Event Display shall ファイルのダウンロードを開始する
5. While イベントに添付ファイルがないとき, the Event Display shall 添付ファイルセクションを表示しない

### Requirement 7: 添付ファイルの削除

**Objective:** As a ギルドメンバー, I want 既存のイベントから添付ファイルを削除したい, so that 不要なファイルを整理できる

#### Acceptance Criteria

1. When イベント編集フォームで添付ファイルの削除ボタンをクリックしたとき, the Event Form shall 対象ファイルを添付一覧から除外する
2. When イベントの保存が確定したとき, the Discalendar system shall 削除された添付ファイルをSupabase Storageからも削除する
3. When 添付ファイルを削除する前に, the Event Form shall 削除確認のUIを表示する

## Metadata

* URL: [https://linear.app/ff2345/issue/DIS-128/イベント添付ファイル-supabase-storage](https://linear.app/ff2345/issue/DIS-128/イベント添付ファイル-supabase-storage)
* Identifier: DIS-128
* Status: Backlog
* Priority: Medium
* Assignee: Tomoya Ishii
* Labels: Feature
* Created: 2026-03-27T01:51:54.562Z
* Updated: 2026-03-30T00:57:53.621Z

## Sub-issues

* [DIS-143 DBマイグレーション: eventsテーブルにattachmentsカラム追加](https://linear.app/ff2345/issue/DIS-143/dbマイグレーション-eventsテーブルにattachmentsカラム追加)
* [DIS-144 Supabase Storage: バケット作成とRLSポリシー設定](https://linear.app/ff2345/issue/DIS-144/supabase-storage-バケット作成とrlsポリシー設定)
* [DIS-145 ファイルアップロードUIコンポーネント実装](https://linear.app/ff2345/issue/DIS-145/ファイルアップロードuiコンポーネント実装)
* [DIS-146 添付ファイル表示（画像プレビュー・ダウンロードリンク）](https://linear.app/ff2345/issue/DIS-146/添付ファイル表示画像プレビューダウンロードリンク)
* [DIS-147 イベント作成/編集フォームにアップロード機能を統合](https://linear.app/ff2345/issue/DIS-147/イベント作成編集フォームにアップロード機能を統合)
