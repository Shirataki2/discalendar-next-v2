---
description: チーム・プロジェクトの進捗サマリーを表示。状態別イシュー集計
allowed-tools: Bash
argument-hint: [--project <name>] [--team]
---

# Linear Status コマンド

<background_information>
- **Mission**: チームやプロジェクトのイシュー進捗サマリーを表示する
- **Success Criteria**:
  - 状態別のイシュー数を集計して表示
  - プロジェクトの全体進捗を把握できる
</background_information>

<instructions>
## Core Task
Linear CLIを使ってイシューの状態別集計を表示する。

## Parse Arguments
- `--project <name>`: プロジェクト指定でフィルタ
- `--team`: チーム全体のイシューを対象

## Execution Steps

### Step 1: 各状態のイシュー数を取得
以下の状態それぞれでイシュー数を取得:
```bash
linear issue list --state started -A --no-pager --limit 0
linear issue list --state unstarted -A --no-pager --limit 0
linear issue list --state backlog -A --no-pager --limit 0
linear issue list --state completed -A --no-pager --limit 0
linear issue list --state triage -A --no-pager --limit 0
```

`--project` 指定時は各コマンドに `--project "<name>"` を追加。

### Step 2: プロジェクト情報（指定時）
```bash
linear project list --no-pager
```

### Step 3: サマリー表示
```markdown
## Linear ステータスサマリー

| 状態 | 件数 |
|------|------|
| In Progress | X |
| Todo | X |
| Backlog | X |
| Triage | X |
| Completed | X |
| **合計** | **X** |
```

プロジェクト指定時はプロジェクト名をヘッダーに含める。

## Error Handling
- **プロジェクト名不明**: 利用可能なプロジェクト一覧を表示
- **取得失敗**: エラー内容を表示
</instructions>
