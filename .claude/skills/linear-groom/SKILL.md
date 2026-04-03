---
name: linear-groom
description: Linearバックログの棚卸し・優先度再定義ワークフロー。コードベースの実装状況とバックログを突合し、完了済みイシューのクローズ・不要イシューのキャンセル・優先度の再設定を一括実行する。「バックログ棚卸し」「バックログ整理」「優先度を見直して」「グルーミング」「backlog grooming」などで使用。
---

# Linear Backlog Grooming

Linearバックログをコードベースの現状と突合し、ステータス更新・優先度再定義を一括実行する。

## ワークフロー

```
情報収集（並列） → 突合分析 → 分類レポート → ユーザー承認 → 一括更新（並列）
```

## Phase 1: 情報収集（並列実行）

以下2つのエージェントを**同時に**起動する。

### Agent A: Linearバックログ取得

`/linear:list` でBacklogステータスの全イシューを取得。以下を記録:
- イシューID, タイトル, ステータス, 優先度, ラベル, プロジェクト

### Agent B: コードベース実装状況の調査

Explore agentで以下を調査:
- `.kiro/specs/` 内の全仕様のステータス
- `app/` の主要ページ・機能の実装状況
- `packages/bot/src/` の実装済みコマンド・タスク
- `supabase/migrations/` の最新マイグレーション
- `git log` 直近30コミットの実装内容

## Phase 2: 突合分析

バックログの各イシューについて、コードベースと突合して分類する。
判定基準は [references/grooming-criteria.md](references/grooming-criteria.md) を参照。

### 突合検証の手順

実装済みの疑いがあるイシューについて、Explore agentで具体的に検証:
- 関連マイグレーションファイルの存在
- 関連コンポーネント・サービスの実装
- RLSポリシーの現在の状態
- 関連テストの存在

## Phase 3: 分類レポート

分析結果を以下のテーブル形式でユーザーに提示する。

### 3-A: 完了済み → Done に移動

| ID | タイトル | 根拠 |
|---|---|---|
| DIS-XX | ... | どのコード/マイグレーションでカバーされているか |

### 3-B: 不要 → Cancel

| ID | タイトル | 理由 |
|---|---|---|
| DIS-XX | ... | なぜ不要と判断したか |

### 3-C: 優先度再定義

4段階で整理:
- **P1 Urgent**: セキュリティ、データ整合性、プロダクションブロッカー
- **P2 High**: 機能ギャップ（CRUD欠落等）、リリース準備
- **P3 Medium**: UX改善、コード品質、部分実装の補完
- **P4 Low**: 将来機能、マネタイズ、Nice-to-have

**必ずユーザーの承認を得てから次のPhaseへ進む。**

## Phase 4: 一括更新（並列実行）

承認後、以下を並列エージェントで実行:

### Agent 1: Done更新
対象イシューを `/linear:update DIS-XX --state completed` で更新。
各イシューに `/linear:comment` で実装根拠のコメントを追加。

### Agent 2: Cancel更新
対象イシューを `/linear:update DIS-XX --state cancelled` で更新。
各イシューに `/linear:comment` でキャンセル理由のコメントを追加。

### Agent 3-4: 優先度更新
P1/P2とP3/P4を2エージェントに分割し、`/linear:update DIS-XX --priority <1-4>` で更新。
- 1=Urgent, 2=High, 3=Medium, 4=Low

## Phase 5: 結果サマリー

更新結果を集計テーブルで報告:

| アクション | 件数 | 対象 |
|---|---|---|
| Done に移動 | N件 | DIS-XX, ... |
| Canceled | N件 | DIS-XX, ... |
| 優先度 Urgent | N件 | ... |
| 優先度 High | N件 | ... |
| 優先度 Medium | N件 | ... |
| 優先度 Low | N件 | ... |

バックログ件数の変化（Before → After）と、次に着手すべきP1イシューを提示する。
