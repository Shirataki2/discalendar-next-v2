---
description: Gitの状態を確認し、変更内容を表示。変更ファイル、ステージング状態、ブランチ情報を表示
allowed-tools: Bash, Read
argument-hint: [--short] [--porcelain]
---

# Git Status コマンド

<background_information>
- **Mission**: Gitリポジトリの現在の状態を確認し、変更内容を分かりやすく表示
- **Success Criteria**:
  - 現在のブランチ情報を表示
  - 変更されたファイルを一覧表示
  - ステージング状態を明確に表示
  - リモートとの差分を表示
</background_information>

<instructions>
## Core Task
Gitリポジトリの状態を確認し、変更内容を分かりやすく表示する。

## Parse Arguments
- `--short`: 短縮形式で表示
- `--porcelain`: 機械可読形式で表示

## Validation
実行前に以下を確認:
1. Gitリポジトリが初期化されている
2. リポジトリ内にいる

検証に失敗した場合、具体的なエラーを報告し、解決方法を提案。

## Execution Steps

### Step 1: リポジトリの検証
```bash
git rev-parse --git-dir
```
- エラーが発生した場合、Gitリポジトリが初期化されていないことを報告

### Step 2: 基本情報の取得
1. 現在のブランチ名:
   ```bash
   git branch --show-current
   ```

2. リモートブランチとの関係:
   ```bash
   git status -sb
   ```

3. リモート情報:
   ```bash
   git remote -v
   ```

### Step 3: 変更状態の取得
引数に応じて適切な形式で取得:

**通常モード**:
```bash
git status
```

**短縮モード** (`--short`):
```bash
git status --short
```

**機械可読モード** (`--porcelain`):
```bash
git status --porcelain
```

### Step 4: 詳細情報の取得（オプション）
変更内容の詳細を取得:

1. ステージング済みの変更:
   ```bash
   git diff --cached --stat
   ```

2. 未ステージングの変更:
   ```bash
   git diff --stat
   ```

3. 未追跡ファイル:
   ```bash
   git ls-files --others --exclude-standard
   ```

### Step 5: リモートとの差分（オプション）
現在のブランチがリモートと同期されているか確認:

```bash
git status -sb
```

または:
```bash
git log --oneline --graph --decorate --all -10
```

## Output Description
出力は日本語で以下の構造で提供:

1. **リポジトリ情報**:
   - 現在のブランチ名
   - リモートブランチとの関係（ahead/behind）
   - リモートURL

2. **変更状態**:
   - ステージング済みの変更（緑色で表示）
   - 未ステージングの変更（黄色で表示）
   - 未追跡ファイル（灰色で表示）

3. **変更サマリー**:
   - 変更されたファイル数
   - 追加/削除された行数（可能な場合）

**Format Requirements**:
- Markdown見出しを使用（##, ###）
- ファイルパスはコードブロックで囲む
- 色分けは絵文字や記号で表現（🔴🟡🟢）
- 出力は簡潔で明確に
- ユーザー向けメッセージはすべて日本語

## Error Handling
- **Gitリポジトリが初期化されていない**: エラーを報告し、`git init`を提案
- **リモートが設定されていない**: 警告を表示し、リモート設定を提案
- **ブランチが存在しない**: エラーを報告し、ブランチ作成を提案
</instructions>

## Tool Guidance
- **Bash**: Gitコマンドの実行
- **Read**: 設定ファイルの確認（必要に応じて）

## Safety & Fallback
- **リポジトリ外での実行**: エラーを報告し、リポジトリ内に移動するよう促す
- **権限エラー**: 具体的なエラーメッセージを表示し、解決策を提案
