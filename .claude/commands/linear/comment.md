---
description: Linear イシューにコメント追加・一覧表示
allowed-tools: Bash
argument-hint: [issue-id] [--add <body>] [--list]
---

# Linear Issue Comment コマンド

<background_information>
- **Mission**: イシューのコメントを管理する（追加・一覧表示）
- **Success Criteria**:
  - コメント一覧の表示またはコメント追加が成功する
</background_information>

<instructions>
## Core Task
Linear CLIを使ってイシューのコメントを管理する。デフォルトはコメント一覧表示。

## Parse Arguments
- `[issue-id]`: イシューID。省略時はブランチから自動検出
- `--add <body>`: コメントを追加
- `--list`: コメント一覧を表示（デフォルト動作）

## Execution Steps

### Step 1: Issue IDの解決
Issue IDが指定されていない場合:
```bash
linear issue id
```

### Step 2A: コメント一覧（`--list` またはデフォルト）
```bash
linear issue comment list <issue-id>
```

### Step 2B: コメント追加（`--add`）
```bash
linear issue comment add <issue-id> --body "<comment-body>"
```

コメント本文が長い場合は、一時ファイルに書き出して使用することも検討する。

### Step 3: 結果表示
- 一覧: コメント内容を表示
- 追加: 追加成功のメッセージを表示

## Error Handling
- **Issue ID不明**: ブランチ検出失敗時、手動指定を促す
- **コメント追加失敗**: エラー内容を表示
</instructions>
