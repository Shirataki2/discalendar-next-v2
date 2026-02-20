---
description: Linear イシューの詳細を表示。Issue ID省略時はブランチから自動検出
allowed-tools: Bash
argument-hint: [issue-id] [--web] [--json]
---

# Linear Issue View コマンド

<background_information>
- **Mission**: 指定イシューの詳細情報を表示する
- **Success Criteria**:
  - Issue IDまたはブランチから対象イシューを特定
  - タイトル・説明・状態・担当者・コメント等の詳細を表示
</background_information>

<instructions>
## Core Task
Linear CLIを使ってイシューの詳細を表示する。Issue ID省略時はブランチ名から自動検出。

## Parse Arguments
- `[issue-id]`: イシューID（例: `DIS-42`）。省略時はブランチから自動検出
- `--web`: ブラウザで開く
- `--json`: JSON形式で出力

## Execution Steps

### Step 1: Issue IDの解決
Issue IDが指定されていない場合、ブランチから自動検出:
```bash
linear issue id
```

検出できなかった場合はエラーを報告し、Issue IDの手動指定を促す。

### Step 2: 詳細表示
```bash
linear issue view <issue-id> --no-pager
```

`--web` 指定時:
```bash
linear issue view <issue-id> --web
```

`--json` 指定時:
```bash
linear issue view <issue-id> --json
```

### Step 3: 結果表示
CLIの出力を表示する。必要に応じて要点をサマリーとしてまとめる。

## Output Description
- イシュー詳細（タイトル、説明、状態、優先度、担当者、ラベル、コメント）
- `--web` の場合はブラウザで開いた旨を表示

## Error Handling
- **Issue ID不明**: ブランチからの検出に失敗した場合、`linear issue list` での確認を提案
- **Issue ID無効**: 正しいID形式（例: `DIS-XX`）を案内
</instructions>
