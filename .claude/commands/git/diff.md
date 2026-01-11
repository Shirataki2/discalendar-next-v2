---
description: 変更内容の差分を表示。ファイル間、コミット間、ブランチ間の差分をサポート
allowed-tools: Bash, Read
argument-hint: [file-path] [commit1] [commit2] [branch1] [branch2] [--staged] [--stat]
---

# Git Diff コマンド

<background_information>
- **Mission**: 変更内容の差分を表示。ファイル間、コミット間、ブランチ間の差分をサポート
- **Success Criteria**:
  - 変更内容の差分を表示
  - ステージング済み/未ステージングの変更を区別
  - 統計情報を表示
  - 分かりやすい形式で表示
</background_information>

<instructions>
## Core Task
変更内容の差分を表示。ファイル間、コミット間、ブランチ間の差分をサポート。

## Parse Arguments
- `file-path`: 特定のファイルの差分を表示
- `commit1`: 比較するコミット1（省略可能）
- `commit2`: 比較するコミット2（省略可能、デフォルト: HEAD）
- `branch1`: 比較するブランチ1（省略可能）
- `branch2`: 比較するブランチ2（省略可能、デフォルト: 現在のブランチ）
- `--staged`: ステージング済みの変更のみ表示
- `--stat`: 統計情報のみ表示

**モード判定**:
- 引数なし: 未ステージングの変更を表示
- `--staged`: ステージング済みの変更を表示
- `file-path`: 特定のファイルの差分を表示
- `commit1 commit2`: 2つのコミット間の差分を表示
- `branch1 branch2`: 2つのブランチ間の差分を表示

## Validation
実行前に以下を確認:
1. Gitリポジトリが初期化されている
2. 比較対象が存在する（コミット/ブランチ/ファイル）

検証に失敗した場合、具体的なエラーを報告し、解決方法を提案。

## Execution Steps

### Step 1: リポジトリの検証
```bash
git rev-parse --git-dir
```

### Step 2: モード別の実行

#### モード1: 未ステージングの変更を表示（引数なし）
```bash
git diff
```

統計情報のみ:
```bash
git diff --stat
```

#### モード2: ステージング済みの変更を表示 (`--staged`)
```bash
git diff --cached
```

統計情報のみ:
```bash
git diff --cached --stat
```

#### モード3: 特定のファイルの差分を表示 (`file-path`)
```bash
git diff <file-path>
```

ステージング済み:
```bash
git diff --cached <file-path>
```

#### モード4: 2つのコミット間の差分を表示 (`commit1 commit2`)
```bash
git diff <commit1> <commit2>
```

統計情報のみ:
```bash
git diff --stat <commit1> <commit2>
```

#### モード5: 2つのブランチ間の差分を表示 (`branch1 branch2`)
```bash
git diff <branch1> <branch2>
```

統計情報のみ:
```bash
git diff --stat <branch1> <branch2>
```

#### モード6: 現在のブランチと別のブランチの差分
```bash
git diff <branch-name>
```

### Step 3: 詳細情報の表示（オプション）
変更されたファイルの一覧:
```bash
git diff --name-only
```

変更されたファイルと変更タイプ:
```bash
git diff --name-status
```

### Step 4: 差分の要約
変更の統計情報:
```bash
git diff --stat
```

## Output Description
出力は日本語で以下の構造で提供:

1. **実行モード**: 表示形式と比較対象
2. **差分情報**:
   - 変更されたファイル一覧
   - 追加/削除された行数
   - 差分の内容
3. **統計情報** (該当する場合):
   - 変更されたファイル数
   - 追加/削除された行数

**Format Requirements**:
- Markdown見出しを使用（##, ###）
- 差分はコードブロックで囲む
- 出力は簡潔で明確に
- ユーザー向けメッセージはすべて日本語

## Error Handling
- **変更がない**: 情報メッセージを表示
- **コミットが存在しない**: エラーを報告し、コミットハッシュを確認するよう促す
- **ブランチが存在しない**: エラーを報告し、ブランチ一覧を表示
- **ファイルが存在しない**: エラーを報告し、ファイルパスを確認するよう促す
</instructions>

## Tool Guidance
- **Bash**: Gitコマンドの実行
- **Read**: 差分ファイルの確認（必要に応じて）

## Safety & Fallback
- **引数が指定されていない**: 未ステージングの変更を表示
- **差分が大きすぎる**: 統計情報のみ表示することを提案
- **複数の比較対象**: 段階的に比較を実行
