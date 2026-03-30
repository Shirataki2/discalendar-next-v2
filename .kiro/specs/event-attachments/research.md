# Research & Design Decisions

## Summary
- **Feature**: `event-attachments`
- **Discovery Scope**: Extension（既存イベントシステムへのファイル添付機能追加）
- **Key Findings**:
  - Supabase Storageは有効だがバケット未作成。`storage.objects`テーブルへのRLSポリシーで`user_guild_ids()`関数を再利用可能
  - 既存のEventForm/EventDialog/EventPopoverコンポーネントに拡張ポイントが明確に存在する
  - プライベートバケット + `createSignedUrl`パターンでセキュアなファイル配信が可能

## Research Log

### Supabase Storage RLS設計
- **Context**: ギルドメンバーのみがファイルにアクセスできるRLSポリシー設計
- **Sources Consulted**: [Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control), [Helper Functions](https://supabase.com/docs/guides/storage/schema/helper-functions)
- **Findings**:
  - `storage.objects`テーブルに直接RLSポリシーを作成する
  - `storage.foldername(name)`でパスのフォルダ部分を配列として取得可能
  - `bucket_id`でバケット単位のフィルタリング可能
  - `storage.extension(name)`でファイル拡張子フィルタリング可能
  - 既存の`user_guild_ids()`関数をRLSポリシー内で再利用してギルドメンバーシップチェックが可能
- **Implications**: Storageパス構造を`{guild_id}/{event_id}/{filename}`にすることで、`foldername(name)[1]`でguild_idを抽出しRLSチェックに使用できる

### Supabase Storage ファイル操作API
- **Context**: クライアント/サーバーサイドからのファイルアップロード・ダウンロードパターン
- **Sources Consulted**: [JavaScript Upload API](https://supabase.com/docs/reference/javascript/storage-from-upload), [Serving Downloads](https://supabase.com/docs/guides/storage/serving/downloads)
- **Findings**:
  - アップロード: `supabase.storage.from(bucket).upload(path, fileBody, options)` — options: contentType, cacheControl, upsert
  - ダウンロード（プライベートバケット）: `createSignedUrl(path, expiresIn)` で時限URLを生成
  - ダウンロード（パブリックバケット）: `getPublicUrl(path)` で永続URL取得
  - プライベートバケットではすべての操作がRLSポリシーに従う
- **Implications**: プライベートバケットを使用し、表示時にServer Action経由で`createSignedUrl`を生成する方式が適切

### 既存イベントフォーム構造
- **Context**: ファイルアップロードUIの統合ポイント分析
- **Sources Consulted**: `components/calendar/event-form.tsx`, `hooks/calendar/use-event-form.ts`
- **Findings**:
  - EventFormDataインターフェースに`attachments`フィールドを追加する
  - NotificationFieldと同様のパターンで`AttachmentField`セクションを追加可能
  - フォーム状態管理は`useState` + `handleChange`パターン
  - CreateEventInput/UpdateEventInputにattachmentsメタデータを追加
- **Implications**: 既存パターンに沿った拡張が可能。ファイルアップロード自体はフォーム送信とは別のタイミング（選択時即座にアップロード）で行う方がUX上好ましい

### Storageパス設計
- **Context**: ファイルの一意性とRLSポリシーの両立
- **Findings**:
  - パス構造案1: `events/{event_id}/{filename}` — シンプルだがRLSでguild_idチェックにDB結合が必要
  - パス構造案2: `{guild_id}/{event_id}/{filename}` — パスからguild_idを抽出でき、RLSが高速
  - パス構造案2を採用: `foldername(name)[1]`でguild_idを取得してRLSチェック可能
- **Implications**: ファイル名の衝突を避けるため、UUIDプレフィックスをファイル名に付与する

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| クライアント直接アップロード | ブラウザからSupabase Storageに直接アップロード | シンプル、サーバー負荷なし | RLSで制御可能、プログレス表示容易 | **採用** |
| Server Action経由アップロード | Next.js Server Actionを経由してアップロード | サーバーサイドバリデーション可能 | ファイルサイズ制限、プログレス不可 | 不採用 |
| 署名付きURL方式 | サーバーで署名URL生成→クライアントが直接PUT | 最も柔軟 | 複雑さが増す | 将来の拡張候補 |

## Design Decisions

### Decision: クライアント直接アップロード方式の採用
- **Context**: ファイルアップロードの実装方式選定
- **Alternatives Considered**:
  1. クライアント直接アップロード — Supabase JS SDKでブラウザから直接Storage APIにアップロード
  2. Server Action経由 — FormDataでServer Actionに送信し、サーバーサイドでStorage APIを呼び出す
- **Selected Approach**: クライアント直接アップロード
- **Rationale**: Supabase Storage RLSで認証・認可を制御できるため、サーバー経由の必要がない。プログレス表示が容易で、サーバーのメモリ/帯域を消費しない
- **Trade-offs**: クライアントサイドでMIMEタイプ/サイズバリデーションが必要（サーバーサイドはバケット設定で制御）
- **Follow-up**: バケットレベルでallowed_mime_typesとfile_size_limitを設定し、二重バリデーションを確保

### Decision: プライベートバケット + Signed URLパターン
- **Context**: ファイルの配信方式選定
- **Alternatives Considered**:
  1. パブリックバケット — 誰でもURLでアクセス可能
  2. プライベートバケット + Signed URL — 時限付きURLを生成して配信
- **Selected Approach**: プライベートバケット + Signed URL
- **Rationale**: ギルドメンバーのみアクセス可能という要件3を満たすため、パブリックバケットは不適切。Signed URLで時限付きアクセスを提供
- **Trade-offs**: URL生成のサーバーラウンドトリップが発生するが、セキュリティ要件を満たす
- **Follow-up**: Signed URLの有効期限を適切に設定（1時間程度）

### Decision: attachmentsカラム（JSONBカラム方式）
- **Context**: 添付ファイルメタデータの保存方式
- **Alternatives Considered**:
  1. JSONBカラム — eventsテーブルにattachments配列を埋め込み
  2. 別テーブル — event_attachmentsテーブルを作成
- **Selected Approach**: JSONBカラム
- **Rationale**: 要件で指定済み。1イベント最大5件と少量のため、JSONBで十分。JOINが不要でクエリがシンプル。既存のEventRecord型への影響が最小
- **Trade-offs**: 個別ファイルへのクエリが非効率だが、ユースケース上不要
- **Follow-up**: check制約でJSONB配列のスキーマを検証

## Risks & Mitigations
- **ファイル名衝突**: UUIDプレフィックスをファイル名に付与して回避
- **孤立ファイル**: イベント削除時にStorageファイルも削除する。DB triggerまたはアプリケーション層で対応
- **RLSパフォーマンス**: `user_guild_ids()`は`SECURITY DEFINER` + `STABLE`で最適化済み。Storageパスからguild_idを抽出するため追加JOINは不要
- **大量同時アップロード**: 1イベント最大5件の制限で緩和。クライアントサイドで順次アップロード

## References
- [Storage Access Control | Supabase Docs](https://supabase.com/docs/guides/storage/security/access-control)
- [Storage Helper Functions | Supabase Docs](https://supabase.com/docs/guides/storage/schema/helper-functions)
- [Storage Buckets | Supabase Docs](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [JavaScript Upload API | Supabase Docs](https://supabase.com/docs/reference/javascript/storage-from-upload)
- [Serving Downloads | Supabase Docs](https://supabase.com/docs/guides/storage/serving/downloads)
