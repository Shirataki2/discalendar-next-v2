---
description: コミット履歴を表示。様々な形式とフィルタリングオプションをサポート
allowed-tools: Bash, Read
argument-hint: [--oneline] [--graph] [--all] [--since] [--until] [--author] [--grep] [--file] [limit]
---

# Git Log コマンド

<background_information>
- **Mission**: コミット履歴を表示。様々な形式とフィルタリングオプションをサポート
- **Success Criteria**:
  - コミット履歴を表示
  - 指定された形式で表示
  - フィルタリングオプションを適用
  - 分かりやすい形式で表示
</background_information>

<instructions>
## Core Task
コミット履歴を表示。様々な形式とフィルタリングオプションをサポート。

## Parse Arguments
- `--oneline`: 1行形式で表示
- `--graph`: グラフ形式で表示
- `--all`: すべてのブランチを表示
- `--since`: 指定日時以降のコミットを表示（例: `--since="2024-01-01"`）
- `--until`: 指定日時以前のコミットを表示（例: `--until="2024-12-31"`）
- `--author`: 指定された作者のコミットを表示（例: `--author="John"`）
- `--grep`: コミットメッセージで検索（例: `--grep="fix"`）
- `--file`: 指定されたファイルの変更履歴を表示（例: `--file="src/app.ts"`）
- `limit`: 表示するコミット数（例: `10`）

## Validation
実行前に以下を確認:
1. Gitリポジトリが初期化されている
2. コミットが存在する

検証に失敗した場合、具体的なエラーを報告し、解決方法を提案。

## Execution Steps

### Step 1: リポジトリの検証
```bash
git rev-parse --git-dir
```

### Step 2: 基本のログ表示
引数に応じて適切な形式で表示:

**1行形式** (`--oneline`):
```bash
git log --oneline
```

**グラフ形式** (`--graph`):
```bash
git log --oneline --graph --decorate
```

**すべてのブランチ** (`--all`):
```bash
git log --oneline --graph --all --decorate
```

**制限付き** (`limit`):
```bash
git log --oneline -<limit>
```

### Step 3: フィルタリングオプションの適用

**日時フィルタ** (`--since`, `--until`):
```bash
git log --since="<date>" --until="<date>" --oneline
```

**作者フィルタ** (`--author`):
```bash
git log --author="<author>" --oneline
```

**メッセージ検索** (`--grep`):
```bash
git log --grep="<pattern>" --oneline
```

**ファイル履歴** (`--file`):
```bash
git log --oneline -- <file-path>
```

### Step 4: 詳細情報の表示（オプション）
詳細な情報が必要な場合:
```bash
git log --stat
```

または:
```bash
git log --oneline --stat --graph
```

### Step 5: カスタム形式の表示（オプション）
カスタム形式で表示:
```bash
git log --pretty=format:"%h - %an, %ar : %s"
```

## Output Description
出力は日本語で以下の構造で提供:

1. **実行モード**: 表示形式とフィルタリングオプション
2. **コミット履歴**:
   - コミットハッシュ
   - コミットメッセージ
   - 作者と日時
   - 変更されたファイル（該当する場合）
3. **統計情報** (該当する場合):
   - 表示されたコミット数
   - フィルタリング条件

**Format Requirements**:
- Markdown見出しを使用（##, ###）
- コミット情報はコードブロックで囲む
- 出力は簡潔で明確に
- ユーザー向けメッセージはすべて日本語

## Error Handling
- **コミットが存在しない**: 情報メッセージを表示
- **フィルタ条件に一致するコミットがない**: 情報メッセージを表示
- **ファイルが存在しない**: エラーを報告し、ファイルパスを確認するよう促す
- **日時形式が無効**: エラーを報告し、正しい形式を説明
</instructions>

## Tool Guidance
- **Bash**: Gitコマンドの実行
- **Read**: 設定ファイルの確認（必要に応じて）

## Safety & Fallback
- **引数が指定されていない**: デフォルト形式で表示（`--oneline`）
- **フィルタ条件が複雑**: 段階的にフィルタを適用
- **出力が長すぎる**: 制限を適用して表示
