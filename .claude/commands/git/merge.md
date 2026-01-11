---
description: ブランチをマージ。競合の確認と解決手順も提供
allowed-tools: Bash, Read
argument-hint: [branch-name] [--no-ff] [--squash] [--abort]
---

# Git Merge コマンド

<background_information>
- **Mission**: 指定されたブランチを現在のブランチにマージ
- **Success Criteria**:
  - ブランチをマージ
  - 競合があれば検出して報告
  - マージ結果を表示
</background_information>

<instructions>
## Core Task
指定されたブランチを現在のブランチにマージ。

## Parse Arguments
- `branch-name`: マージするブランチ名（必須）
- `--no-ff`: Fast-forwardマージを避け、マージコミットを作成
- `--squash`: マージコミットを作成せず、変更をステージングのみ
- `--abort`: 進行中のマージを中断

## Validation
実行前に以下を確認:
1. Gitリポジトリが初期化されている
2. マージするブランチが存在する
3. 現在のブランチが存在する
4. 未コミットの変更がない（または適切に処理されている）

検証に失敗した場合、具体的なエラーを報告し、解決方法を提案。

## Execution Steps

### Step 1: リポジトリの検証
```bash
git rev-parse --git-dir
```

### Step 2: 現在のブランチの確認
```bash
git branch --show-current
```

### Step 3: マージするブランチの確認
ブランチが存在するか確認:
```bash
git show-ref --verify --quiet refs/heads/<branch-name>
```

リモートブランチの場合:
```bash
git ls-remote --heads origin <branch-name>
```

### Step 4: 未コミットの変更の確認
未コミットの変更があるか確認:
```bash
git status --porcelain
```

未コミットの変更がある場合、警告を表示。

### Step 5: マージ前の状態確認
マージするブランチのコミットを確認:
```bash
git log <branch-name> --oneline -5
```

現在のブランチとの差分を確認:
```bash
git log HEAD..<branch-name> --oneline
```

### Step 6: マージの実行
**通常のマージ**:
```bash
git merge <branch-name>
```

**マージコミットを作成** (`--no-ff`):
```bash
git merge --no-ff <branch-name>
```

**Squashマージ** (`--squash`):
```bash
git merge --squash <branch-name>
```

**マージの中断** (`--abort`):
```bash
git merge --abort
```

### Step 7: 競合の確認
競合があるか確認:
```bash
git status
```

競合がある場合:
- 競合ファイルを一覧表示
- 競合の内容を確認:
  ```bash
  git diff --name-only --diff-filter=U
  ```

### Step 8: マージ結果の確認
マージが成功したか確認:
```bash
git log --oneline --graph -10
```

## Output Description
出力は日本語で以下の構造で提供:

1. **実行モード**: 通常マージ/マージコミット/Squashマージ
2. **マージ情報**:
   - マージするブランチ名
   - 現在のブランチ名
   - マージされるコミット数
3. **実行結果**:
   - 成功/失敗のステータス
   - マージコミットのハッシュ（該当する場合）
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
- **ブランチが存在しない**: エラーを報告し、ブランチ一覧を表示
- **未コミットの変更がある**: 警告を表示し、変更をコミットまたはスタッシュするよう促す
- **競合が発生した**: 競合ファイルを一覧表示し、解決手順を説明
- **マージ失敗**: 具体的なエラーメッセージを表示し、解決策を提案
- **既にマージ済み**: 情報メッセージを表示
</instructions>

## Tool Guidance
- **Bash**: Gitコマンドの実行
- **Read**: 競合ファイルの確認（必要に応じて）

## Safety & Fallback
- **未コミットの変更がある**: 警告を表示し、処理を中断するか確認
- **競合が発生した**: 競合解決の手順を明確に説明
- **マージの中断**: `--abort`オプションの使用方法を説明
- **部分的な成功**: 成功した部分と失敗した部分を明確に分けて報告
