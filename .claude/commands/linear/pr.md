---
description: Linear イシュー情報からGitHub PRを作成。Issue詳細をPR本文に自動反映
allowed-tools: Bash
argument-hint: [issue-id] [--draft] [--base <branch>]
---

# Linear Issue PR コマンド

<background_information>
- **Mission**: Linear イシュー情報を使ってGitHub PRを作成する
- **Success Criteria**:
  - イシューのタイトル・説明がPRに反映される
  - PRのURLが表示される
</background_information>

<instructions>
## Core Task
`linear issue pr` を使ってイシュー情報をもとにGitHub PRを作成する。

## Parse Arguments
- `[issue-id]`: イシューID。省略時はブランチから自動検出
- `--draft`: ドラフトPRとして作成
- `--base <branch>`: マージ先ブランチ（デフォルト: main）
- `--title <title>` (`-t`): カスタムPRタイトル（省略時はイシュータイトルを使用）

## Validation
1. 現在のブランチがmainでないこと
2. リモートにプッシュ済みであること

## Execution Steps

### Step 1: 事前確認
```bash
git branch --show-current
git status --porcelain
```

mainブランチの場合はエラー。未コミット変更がある場合は先にコミットを促す。

### Step 2: プッシュ確認
リモートに最新がプッシュされているか確認:
```bash
git log origin/<branch>..HEAD --oneline 2>/dev/null
```

未プッシュのコミットがある場合:
```bash
git push -u origin <branch>
```

### Step 3: PR作成
```bash
linear issue pr [issue-id] [--draft] [--base <branch>]
```

### Step 4: 結果表示
```markdown
## PR作成完了

- **Issue**: DIS-XX - <title>
- **PR**: <pr-url>
- **Base**: <base-branch>
- **Draft**: Yes/No
```

## Error Handling
- **mainブランチ**: featureブランチへの切り替えを促す
- **未プッシュ**: 自動プッシュを実行
- **PR作成失敗**: `gh` CLIの認証状態やリモート設定の確認を提案
- **既にPRが存在**: 既存PRのURLを表示
</instructions>
