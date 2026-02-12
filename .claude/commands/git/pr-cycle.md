---
description: PR作成からレビュー修正サイクルまでを完全自動化する統合ワークフロー。状態を自動検出して適切なアクションを実行
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
argument-hint: [PR番号] [--create] [--fix-all]
---

# 統合PRサイクルコマンド

<background_information>
- **Mission**: PR作成からレビュー修正サイクルまでをシームレスに自動化する統合ワークフロー
- **Success Criteria**:
  - 現在の状態を自動検出し、適切なアクション（PR作成 or レビュー修正）を実行
  - PR作成: 変更分析 → ブランチ作成 → コミット → プッシュ → PR作成
  - レビュー修正: コメント取得 → 分類 → 修正 → lint/型チェック → コミット → プッシュ → PRコメント投稿
  - 手動操作を最小限に抑え、完全自動化を実現
</background_information>

<instructions>
## Core Task
状態を自動検出し、PR作成フローまたはレビュー修正フローを実行する。

## Parse Arguments
- `[PR番号]`: 数値が指定された場合、そのPR番号を対象とする
- `--create`: 強制的にPR作成モードで実行
- `--fix-all`: 必須 + 推奨 + 改善すべてを修正（デフォルトは必須 + 推奨のみ）

**引数の排他性ルール**:
- `--create` と `[PR番号]` は同時に指定不可。同時指定された場合はエラーを報告する
- `--fix-all` は `[PR番号]` または レビュー修正フロー時のみ有効。`--create` と組み合わせた場合は無視する
- 引数なしの場合は自動検出モード（Phase 0）で動作する

## Phase 0: 状態検出

以下の順序で現在の状態を判定し、実行するフローを決定する:

1. **引数チェック**:
   - `--create` が指定されている → **PR作成フロー**へ
   - PR番号が指定されている → **レビュー修正フロー**へ

2. **ブランチとPRの状態を確認**:
   ```bash
   git branch --show-current
   git status --porcelain
   gh pr list --head <current-branch> --json number,title,url,state --limit 1
   ```

3. **状態に基づく判定**（上から順に評価し、最初にマッチした条件で決定）:

   **優先度1: mainブランチの場合**
   - 1a. 未コミットの変更がある → **PR作成フロー**
   - 1b. 変更がない → **ステータス報告**（何もすることがない）

   **優先度2: featureブランチ + PRが存在する場合**
   - 2a. レビューコメントがある → **レビュー修正フロー**
   - 2b. レビューコメントがない + 未コミット変更がある → **PR作成フロー**（追加コミット）
   - 2c. レビューコメントがない + 変更がない → **ステータス報告**

   **優先度3: featureブランチ + PRが存在しない場合**
   - 3a. 未コミット変更がある → **PR作成フロー**
   - 3b. 変更がない → **ステータス報告**（PRの作成を促すメッセージを表示）

   **疑似コード**:
   ```
   if --create → PR作成フロー
   if PR番号指定 → レビュー修正フロー
   branch = git branch --show-current
   changes = git status --porcelain
   pr = gh pr list --head branch
   if branch == main:
     return changes ? PR作成 : ステータス報告
   if pr exists:
     comments = fetch_review_comments(pr)
     if comments.length > 0: return レビュー修正
     if changes: return PR作成(追加コミット)
     return ステータス報告
   else:
     return changes ? PR作成 : ステータス報告
   ```

状態検出結果を表示:
```
🔍 状態検出結果:
- ブランチ: <branch-name>
- 未コミット変更: あり/なし
- 関連PR: #<number> (<title>) / なし
- レビューコメント: <count>件 / なし
→ 実行フロー: PR作成 / レビュー修正 / ステータス報告
```

---

## フロー A: PR作成フロー

### A-1: 変更の分析
- `git status --porcelain` で変更ファイルを取得
- `git diff --stat` で変更の概要を取得
- `git diff` で詳細な差分を取得（ステージング済み + 未ステージング）

### A-2: コミットメッセージの自動生成（+ mainブランチ時のみブランチ名生成）
変更内容を分析して以下を生成:

**ブランチ名の生成**（**mainブランチにいる場合のみ**。featureブランチでは**スキップ**）:
- ファイルパスから機能名を抽出
- kebab-case: `feature/add-calendar`, `fix/login-bug`, `refactor/auth-module`
- プレフィックス: `feature/`, `fix/`, `refactor/`, `docs/`, `style/`, `test/`, `chore/`

**コミットメッセージの生成ルール**（常に実行）:
- conventional commit形式: `<type>(<scope>): <subject>`
- Types: feat, fix, refactor, docs, style, test, chore
- Subject: 50文字以内の変更概要

### A-3: ブランチ作成（mainブランチの場合のみ）
- mainブランチにいる場合: `git checkout -b <branch-name>`（A-2で生成したブランチ名を使用）
- featureブランチにいる場合: **現在のブランチをそのまま使用**（A-2のブランチ名生成はスキップし、現在のブランチ名を以降のステップで使用する）

### A-4: ステージング & コミット
```bash
git add .
git commit -m "$(cat <<'EOF'
<generated-commit-message>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

**注意**: コミットメッセージは必ずHEREDOC形式を使用し、コマンドインジェクションを防止する。

### A-5: プッシュ
```bash
git push -u origin <current-branch-name>
```

**注意**: `<current-branch-name>` は `git branch --show-current` で取得した**現在のブランチ名**を使用する。A-3でブランチを新規作成した場合はそのブランチ名、既存featureブランチを使用している場合はそのブランチ名となる。A-2で生成したブランチ名と混同しないこと。

### A-6: PR作成
- 既存PRがある場合はスキップ（プッシュのみで完了）
- PRがない場合:
```bash
gh pr create --title "<title>" --body "$(cat <<'EOF'
## Summary
<変更内容の箇条書き>

## Test plan
<テスト計画>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)" --base main
```

### A-7: 結果表示
```markdown
## ✅ PR作成完了

- **ブランチ**: <branch-name>
- **コミット**: <commit-message>
- **PR**: <pr-url>
```

---

## フロー B: レビュー修正フロー

### B-1: PR情報の取得
PR番号が指定されている場合:
```bash
gh pr view <PR番号> --json number,title,url,state,headRefName
```

PR番号が未指定の場合は、状態検出で取得済みのPR情報を使用。

PRのブランチが現在のブランチと異なる場合:
```bash
git fetch origin <headRefName>
git checkout <headRefName>
git pull origin <headRefName>
```

### B-2: レビューコメントの取得

**3種類のコメントを取得**:

1. PRの一般コメント:
```bash
gh pr view <pr-number> --json comments --jq '.comments[] | {body: .body, author: .author.login}'
```

2. レビューコメント（全体レビュー）:
```bash
gh pr view <pr-number> --json reviews --jq '.reviews[] | {state: .state, body: .body, author: .author.login}'
```

3. インラインレビューコメント（ファイル・行番号付き）:
```bash
gh api repos/{owner}/{repo}/pulls/<pr-number>/comments --jq '.[] | {path: .path, line: .line, body: .body, author: .user.login, diff_hunk: .diff_hunk}'
```

**注意**: `{owner}/{repo}` は `git remote get-url origin` の出力から抽出する。値は英数字・ハイフン・アンダースコア・ドットのみで構成されることを検証し、不正な文字が含まれる場合はエラーとして中断する。

### B-3: コメントの分類

取得したコメントを3段階に分類:

#### 🔴 必須修正 (Critical)
- バグ、セキュリティ問題の指摘
- テスト失敗、ビルドエラーの報告
- `CHANGES_REQUESTED` ステータスでの深刻な問題
- キーワード: 「必須」「バグ」「エラー」「修正が必要」「security」「vulnerability」

#### 🟡 推奨修正 (Recommended)
- コード品質・パフォーマンスの改善提案
- ベストプラクティスに沿った改善
- リファクタリング・アーキテクチャの提案
- キーワード: 「推奨」「改善」「検討」「提案」「最適化」

#### 🟢 改善提案 (Enhancement)
- コメント・ドキュメントの追加提案
- 変数名・型定義の改善
- 可読性向上の提案
- キーワード: 「可読性」「ドキュメント」「命名」「型」

### B-4: 要約の表示

```markdown
# PRレビューコメント要約

## 📊 概要
- **PR**: #<number> - <title>
- **URL**: <url>
- **総コメント数**: <total>
- 🔴 必須修正: <count>件
- 🟡 推奨修正: <count>件
- 🟢 改善提案: <count>件

## 🔴 必須修正
### 1. [要約タイトル]
- **ファイル**: `path/to/file.ts:123`
- **コメント**: <内容>
- **修正方針**: <アクション>

## 🟡 推奨修正
...

## 🟢 改善提案
...
```

### B-5: 修正対象の決定
- デフォルト: 🔴必須 + 🟡推奨 を修正
- `--fix-all` 指定時: 🔴必須 + 🟡推奨 + 🟢改善 すべてを修正

修正対象を表示した上で、修正を開始する。

### B-6: 全コメントを自動修正
- 優先順位: 🔴必須 → 🟡推奨 → 🟢改善
- 各コメントに対応するファイルを読み込み、修正を実施
- Read, Edit ツールを使用してコード修正

### B-7: lint自動修正 & 型チェック
修正完了後、コード品質を自動検証:

```bash
npx ultracite fix
npm run type-check
```

型チェックでエラーが出た場合は、エラー内容を分析して追加修正を実施。
lint/型チェックが通るまで修正を繰り返す（最大3回）。

**3回修正後も失敗した場合**:
1. 修正ループを即座に停止する
2. 残りのエラー内容を一覧表示する
3. 「自動修正の上限（3回）に達しました。以下のエラーは手動での修正が必要です。」と報告する
4. **型チェックが失敗している状態ではコミット・プッシュを実行しない**（B-8以降を中断）
5. ユーザーに手動修正を促し、修正完了後に再度 `/git:pr-cycle` を実行するよう案内する

### B-8: 自動コミット
```bash
git add .
git commit -m "$(cat <<'EOF'
fix: address PR review comments - <critical-count> critical, <recommended-count> recommended

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

**注意**: コミットメッセージは修正内容のカウント情報を含め、複数回のレビュー修正コミットを区別できるようにする。

### B-9: 自動プッシュ
```bash
git push
```

### B-10: PRにサマリーコメント投稿
修正内容をPRにコメントとして投稿:

```bash
gh pr comment <pr-number> --body "$(cat <<'EOF'
## 🔧 レビューコメント修正完了

### 修正内容
- 🔴 必須修正: <count>件 完了
- 🟡 推奨修正: <count>件 完了
- 🟢 改善提案: <count>件 完了/スキップ

### 変更詳細
<各修正の簡潔な説明>

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**コメント投稿失敗時のハンドリング**:
1. 最大2回リトライする（ネットワークエラーやAPI一時障害に対応）
2. 2回リトライしても失敗した場合:
   - コード修正・コミット・プッシュは**既に完了済み**のため、これらを失敗扱いにしない
   - 「PRコメントの投稿に失敗しました。コード修正は正常にプッシュ済みです。」と報告する
   - コメント本文をローカルに表示し、ユーザーが手動でコピー&ペーストできるようにする

### B-11: 修正完了サマリー表示

```markdown
## ✅ レビュー修正サイクル完了

### 修正結果
- 🔴 必須修正: <count>件 完了
- 🟡 推奨修正: <count>件 完了
- 🟢 改善提案: <count>件 完了/スキップ

### 実行ステップ
1. ✅ コード修正
2. ✅ lint自動修正 (`npx ultracite fix`)
3. ✅ 型チェック (`npm run type-check`)
4. ✅ コミット: `fix: PRレビューコメントに基づく修正`
5. ✅ プッシュ完了
6. ✅ PRコメント投稿済み

### PR URL
<pr-url>
```

---

## フロー C: ステータス報告

PRもレビューコメントも変更もない場合のステータス表示:

```markdown
## 📊 現在の状態

- **ブランチ**: <branch-name>
- **関連PR**: #<number> (<title>) / なし
- **未コミット変更**: なし
- **レビューコメント**: なし

→ 現在対応が必要な項目はありません。
```

---

## Error Handling

- **GitHub CLIが未インストール/未認証**: エラーを報告し、`gh auth login` を提案
- **PRが見つからない**: 手動での確認を提案
- **コメント取得失敗**: アクセス権限を確認
- **修正失敗**: 具体的なエラーを表示し、手動修正を提案
- **lint/型チェック失敗（3回修正後も失敗）**: 残りのエラーを表示し、手動修正を提案
- **プッシュ失敗**: リモート設定とネットワークを確認
- **コミット失敗**: git statusを確認し、原因を報告

## Safety & Fallback

- **変更がない場合**: 情報メッセージを表示、不要なコミットは作成しない
- **分類が困難なコメント**: デフォルトで「推奨修正」に分類
- **修正が複雑すぎる場合**: 修正方針を明確に示し、可能な範囲で修正
- **部分的な成功**: 成功した修正と失敗した修正を明確に分けて報告
- **PRコメント投稿失敗**: 修正自体は完了しているため、コメント投稿のみリトライまたはスキップ
</instructions>

## Tool Guidance
- **Bash**: git/gh コマンドの実行、lint/型チェック
- **Read**: ファイルの読み込み、コメント分析
- **Edit**: コード修正
- **Write**: 新規ファイル作成が必要な場合のみ
- **Grep/Glob**: 関連コードの検索
