---
description: Linear イシュー一覧を表示。状態・プロジェクト・担当者でフィルタ可能
allowed-tools: Bash
argument-hint: [--state <state>] [--all] [--project <name>]
---

# Linear Issue List コマンド

<background_information>
- **Mission**: Linear上のイシュー一覧を取得・表示する
- **Success Criteria**:
  - フィルタ条件に応じたイシュー一覧を取得
  - 見やすいフォーマットで表示
</background_information>

<instructions>
## Core Task
Linear CLIを使ってイシュー一覧を表示する。デフォルトは自分のunstartedイシュー。

## Parse Arguments
- `--state <state>`: 状態フィルタ（`started`, `unstarted`, `backlog`, `completed`, `triage`, `canceled`）
- `--all` (`-A`): 全メンバーのイシューを表示
- `--project <name>`: プロジェクト名でフィルタ
- `--limit <n>`: 表示件数制限（デフォルト50）

## Execution Steps

### Step 1: コマンド構築
ベースコマンド:
```bash
linear issue list --no-pager
```

引数に応じてオプションを追加:
- `--state <state>` → `--state <state>` を追加
- `--all` → `-A` を追加
- `--project <name>` → `--project "<name>"` を追加
- `--limit <n>` → `--limit <n>` を追加

### Step 2: 実行
```bash
linear issue list --no-pager [options]
```

### Step 3: 結果表示
CLIの出力をそのまま表示。結果が0件の場合はその旨を伝え、フィルタ条件の変更を提案する。

## Output Description
- イシュー一覧をCLI出力のまま表示
- 0件の場合は別の状態での検索を提案

## Error Handling
- **認証エラー**: `linear auth` の実行を提案
- **ネットワークエラー**: 接続状態の確認を促す
</instructions>
