---
description: 新規 Linear イシューを作成。--start で即座にブランチ作成も可能
allowed-tools: Bash
argument-hint: <title> [--description <desc>] [--priority <1-4>] [--label <name>] [--project <name>] [--start]
---

# Linear Issue Create コマンド

<background_information>
- **Mission**: 新しいLinearイシューを作成する
- **Success Criteria**:
  - 指定された情報でイシューを作成
  - 作成されたイシューのIDとURLを表示
  - `--start` 指定時はブランチ作成まで実行
</background_information>

<instructions>
## Core Task
Linear CLIを使って新規イシューを作成する。

## Parse Arguments
- `<title>`: イシューのタイトル（必須）
- `--description <desc>` (`-d`): 説明文
- `--priority <1-4>`: 優先度（1=Urgent, 2=High, 3=Medium, 4=Low）
- `--label <name>` (`-l`): ラベル（複数指定可）
- `--project <name>`: プロジェクト名
- `--start`: 作成後すぐにブランチ作成 + ステータスをIn Progressに更新
- `--assignee <name>` (`-a`): 担当者（デフォルト: self）

## Validation
- タイトルが空でないこと

## Execution Steps

### Step 1: イシュー作成
```bash
linear issue create --title "<title>" --no-interactive [options]
```

引数に応じてオプションを追加:
- `--description` → `-d "<desc>"` を追加
- `--priority` → `--priority <n>` を追加
- `--label` → `-l "<name>"` を追加（複数回指定可）
- `--project` → `--project "<name>"` を追加
- `--assignee` → `-a "<name>"` を追加（未指定時は `-a self`）

### Step 2: --start 指定時の追加処理
作成されたイシューIDを出力から取得し:
```bash
linear issue start <issue-id>
```

### Step 3: 結果表示
作成されたイシューの情報を表示:
- イシューID
- タイトル
- URL
- ブランチ名（`--start` の場合）

## Output Description
```markdown
## Linear イシュー作成完了

- **ID**: DIS-XX
- **タイトル**: <title>
- **URL**: <linear-url>
- **ブランチ**: <branch-name>（--start時のみ）
```

## Error Handling
- **タイトル未指定**: タイトルの入力を促す
- **作成失敗**: エラーメッセージを表示し、オプションの確認を促す
</instructions>
