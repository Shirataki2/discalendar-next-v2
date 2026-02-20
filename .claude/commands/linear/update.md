---
description: Linear イシューのステータス・優先度・担当者等を更新
allowed-tools: Bash
argument-hint: [issue-id] [--state <state>] [--priority <1-4>] [--title <title>] [--assignee <name>]
---

# Linear Issue Update コマンド

<background_information>
- **Mission**: 既存イシューのプロパティを更新する
- **Success Criteria**:
  - 指定されたプロパティが正しく更新される
  - 更新結果が表示される
</background_information>

<instructions>
## Core Task
Linear CLIを使ってイシューのプロパティを更新する。Issue ID省略時はブランチから自動検出。

## Parse Arguments
- `[issue-id]`: イシューID。省略時はブランチから自動検出
- `--state <state>` (`-s`): ステータス変更（`unstarted`, `started`, `completed`, `canceled`, `backlog`, `triage`）
- `--priority <1-4>`: 優先度変更
- `--title <title>` (`-t`): タイトル変更
- `--assignee <name>` (`-a`): 担当者変更
- `--label <name>` (`-l`): ラベル設定
- `--project <name>`: プロジェクト設定
- `--description <desc>` (`-d`): 説明変更

## Execution Steps

### Step 1: Issue IDの解決
Issue IDが指定されていない場合:
```bash
linear issue id
```

### Step 2: 更新実行
```bash
linear issue update <issue-id> [options]
```

引数に応じてオプションを追加:
- `--state` → `-s <state>`
- `--priority` → `--priority <n>`
- `--title` → `-t "<title>"`
- `--assignee` → `-a "<name>"`
- `--label` → `-l "<name>"`
- `--project` → `--project "<name>"`
- `--description` → `-d "<desc>"`

### Step 3: 更新確認
```bash
linear issue view <issue-id> --no-pager
```

### Step 4: 結果表示
更新されたプロパティを表示。

## Error Handling
- **Issue ID不明**: ブランチ検出失敗時、手動指定を促す
- **無効な状態名**: 有効なステータス一覧を表示
- **更新失敗**: エラー内容を表示
</instructions>
