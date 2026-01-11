---
description: 現在のブランチをリモートにプッシュ。リモートブランチの設定も可能
allowed-tools: Bash, Read
argument-hint: [remote] [branch-name] [--force] [--set-upstream]
---

# Git Push コマンド

<background_information>
- **Mission**: 現在のブランチをリモートリポジトリにプッシュ
- **Success Criteria**:
  - 現在のブランチをリモートにプッシュ
  - リモートブランチの設定（upstream）
  - プッシュ結果を表示
</background_information>

<instructions>
## Core Task
現在のブランチをリモートリポジトリにプッシュ。リモートブランチの設定も可能。

## Parse Arguments
- `remote`: リモート名（デフォルト: origin）
- `branch-name`: プッシュするブランチ名（デフォルト: 現在のブランチ）
- `--force`: 強制プッシュ（慎重に使用）
- `--set-upstream`: リモートブランチをupstreamとして設定

## Validation
実行前に以下を確認:
1. Gitリポジトリが初期化されている
2. リモートリポジトリが設定されている
3. 現在のブランチが存在する
4. プッシュするコミットが存在する

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

リモートが設定されていない場合、エラーを報告。

### Step 3: 現在のブランチの確認
```bash
git branch --show-current
```

### Step 4: プッシュするコミットの確認
リモートと比較して、プッシュするコミットがあるか確認:
```bash
git log origin/<branch-name>..HEAD --oneline
```

または、リモートブランチが存在しない場合:
```bash
git log --oneline -5
```

### Step 5: リモートブランチの状態確認
リモートブランチが既に存在するか確認:
```bash
git ls-remote --heads origin <branch-name>
```

### Step 6: プッシュの実行
**通常のプッシュ**:
```bash
git push -u origin <branch-name>
```

**強制プッシュ** (`--force`):
```bash
git push --force origin <branch-name>
```

または:
```bash
git push --force-with-lease origin <branch-name>
```

**upstream設定のみ** (`--set-upstream`):
```bash
git push --set-upstream origin <branch-name>
```

### Step 7: プッシュ結果の確認
プッシュが成功したか確認:
```bash
git status -sb
```

## Output Description
出力は日本語で以下の構造で提供:

1. **実行モード**: 通常プッシュ/強制プッシュ
2. **プッシュ情報**:
   - リモート名
   - ブランチ名
   - プッシュされたコミット数
3. **実行結果**:
   - 成功/失敗のステータス
   - プッシュされたコミットの概要
4. **リモートブランチ情報**:
   - リモートブランチのURL
5. **次のステップ**: プルリクエスト作成などの推奨アクション

**Format Requirements**:
- Markdown見出しを使用（##, ###）
- コマンドはコードブロックで囲む
- 出力は簡潔で明確に
- ユーザー向けメッセージはすべて日本語

## Error Handling
- **リモートが設定されていない**: エラーを報告し、リモート追加を提案
- **認証エラー**: エラーを報告し、認証設定を確認するよう促す
- **リモートブランチが既に存在し、競合がある**: 警告を表示し、pullまたはforce pushを提案（慎重に）
- **ネットワークエラー**: エラーを報告し、再接続を促す
- **権限エラー**: エラーを報告し、リポジトリへのアクセス権限を確認するよう促す
</instructions>

## Tool Guidance
- **Bash**: Gitコマンドの実行
- **Read**: 設定ファイルの確認（必要に応じて）

## Safety & Fallback
- **強制プッシュの警告**: `--force`オプション使用時は警告を表示
- **リモートブランチが存在しない**: 自動的にupstreamを設定
- **プッシュするコミットがない**: 情報メッセージを表示
- **部分的な成功**: 成功した部分と失敗した部分を明確に分けて報告
