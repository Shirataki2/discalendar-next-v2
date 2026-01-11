---
description: リモートブランチから変更を取得してマージ。リベースオプションも可能
allowed-tools: Bash, Read
argument-hint: [remote] [branch-name] [--rebase] [--ff-only]
---

# Git Pull コマンド

<background_information>
- **Mission**: リモートブランチから変更を取得してマージ
- **Success Criteria**:
  - リモートから最新の変更を取得
  - ローカルブランチにマージ
  - 競合があれば報告
</background_information>

<instructions>
## Core Task
リモートブランチから変更を取得してローカルブランチにマージ。

## Parse Arguments
- `remote`: リモート名（デフォルト: origin）
- `branch-name`: プルするブランチ名（デフォルト: 現在のブランチのupstream）
- `--rebase`: マージではなくリベースを使用
- `--ff-only`: Fast-forwardマージのみ許可

## Validation
実行前に以下を確認:
1. Gitリポジトリが初期化されている
2. リモートリポジトリが設定されている
3. 現在のブランチが存在する
4. 未コミットの変更がない（または適切に処理されている）

検証に失敗した場合、具体的なエラーを報告し、解決方法を提案。

## Execution Steps

### Step 1: リポジトリの検証
```bash
git rev-parse --git-dir
```

### Step 2: リモートの確認
リモートリポジトリが設定されているか確認:
```bash
git remote -v
```

### Step 3: 現在のブランチの確認
```bash
git branch --show-current
```

### Step 4: 未コミットの変更の確認
未コミットの変更があるか確認:
```bash
git status --porcelain
```

未コミットの変更がある場合:
- 警告を表示
- 変更をコミットまたはスタッシュするよう促す
- `--rebase`オプション使用時は特に注意

### Step 5: リモートブランチの確認
プルするリモートブランチを確認:
```bash
git branch -vv
```

または:
```bash
git remote show origin
```

### Step 6: フェッチの実行
リモートの最新情報を取得:
```bash
git fetch origin
```

### Step 7: プルの実行
**通常のプル（マージ）**:
```bash
git pull origin <branch-name>
```

**リベースモード** (`--rebase`):
```bash
git pull --rebase origin <branch-name>
```

**Fast-forwardのみ** (`--ff-only`):
```bash
git pull --ff-only origin <branch-name>
```

### Step 8: 競合の確認
競合があるか確認:
```bash
git status
```

競合がある場合:
- 競合ファイルを一覧表示
- 競合解決の手順を説明

### Step 9: 結果の確認
プルが成功したか確認:
```bash
git log --oneline --graph -10
```

## Output Description
出力は日本語で以下の構造で提供:

1. **実行モード**: マージ/リベース/Fast-forwardのみ
2. **プル情報**:
   - リモート名
   - ブランチ名
   - 取得されたコミット数
3. **実行結果**:
   - 成功/失敗のステータス
   - マージ/リベースの結果
4. **競合情報** (該当する場合):
   - 競合ファイルの一覧
   - 競合解決の手順
5. **次のステップ**: 競合解決やコミットなどの推奨アクション

**Format Requirements**:
- Markdown見出しを使用（##, ###）
- コマンドはコードブロックで囲む
- 出力は簡潔で明確に
- ユーザー向けメッセージはすべて日本語

## Error Handling
- **リモートが設定されていない**: エラーを報告し、リモート追加を提案
- **認証エラー**: エラーを報告し、認証設定を確認するよう促す
- **未コミットの変更がある**: 警告を表示し、変更をコミットまたはスタッシュするよう促す
- **競合が発生した**: 競合ファイルを一覧表示し、解決手順を説明
- **Fast-forwardできない**: エラーを報告し、通常のマージまたはリベースを提案
- **ネットワークエラー**: エラーを報告し、再接続を促す
</instructions>

## Tool Guidance
- **Bash**: Gitコマンドの実行
- **Read**: 設定ファイルの確認（必要に応じて）

## Safety & Fallback
- **未コミットの変更がある**: 警告を表示し、処理を中断するか確認
- **競合が発生した**: 競合解決の手順を明確に説明
- **リベース中のエラー**: リベースの中断方法を説明（`git rebase --abort`）
- **部分的な成功**: 成功した部分と失敗した部分を明確に分けて報告
