---
name: issue-driven-development
description: Linear Issue駆動開発ワークフロー。イシュー選択 → ブランチ作成 → 実装 → PR → 完了のライフサイクルを統合管理する。「イシューを選んで作業開始」「DIS-XXの実装を始める」「このイシューをPRにする」などで使用。
---

# Issue-Driven Development Skill

Linear Issueを起点とした開発ワークフローを統合管理する。

## ワークフロー概要

```
Issue選択 → 作業開始(ブランチ作成) → 実装 → PR作成 → Issue完了
```

## Phase 1: Issue選択・作業開始

### Issue IDが指定されている場合
```bash
linear issue view <issue-id> --no-pager
```
イシューの内容を確認し、要件をコンテキストとして保持する。

### Issue IDが未指定の場合
```bash
linear issue list --no-pager
```
一覧を表示し、ユーザーに対象イシューを選択してもらう。

### 作業開始
```bash
linear issue start <issue-id>
```
- イシューのステータスが「In Progress」に更新
- Gitブランチが自動作成・チェックアウト

## Phase 2: 実装

イシューの説明・要件をコンテキストとして保持しながら実装を進める。

**コミットメッセージのルール:**
- Conventional Commits形式: `<type>(<scope>): <subject>`
- コミットメッセージの末尾に `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>` を含める

**品質チェック:**
- `npx ultracite check` でlint/formatチェック
- `npm run type-check` で型チェック
- `npx vitest run` で関連テスト実行

## Phase 3: PR作成

実装完了後、PR作成方法を選択:

### Option A: Linear CLI経由（推奨）
```bash
linear issue pr <issue-id>
```
イシュー情報がPRタイトル・本文に自動反映される。

### Option B: Git PR Cycle経由
`/git:pr-cycle` を使用。手動でIssue URLをPR本文に含める。

## Phase 4: Issue完了

PRマージ後にイシューを完了:
```bash
linear issue update <issue-id> --state completed
```

## ユースケース別フロー

### 「イシューを選んで作業開始」
1. `linear issue list --no-pager` → 一覧表示
2. ユーザーがIssue ID選択
3. `linear issue view <id> --no-pager` → 要件確認
4. `linear issue start <id>` → ブランチ作成

### 「DIS-XXの実装を始める」
1. `linear issue view DIS-XX --no-pager` → 要件確認
2. `linear issue start DIS-XX` → ブランチ作成
3. 実装開始

### 「このイシューをPRにする」
1. `linear issue id` → 現在のブランチからIssue ID検出
2. 未コミット変更があればコミット
3. `git push -u origin <branch>`
4. `linear issue pr` → PR作成

### 「イシューを完了にする」
1. `linear issue id` → Issue ID検出
2. `linear issue update <id> --state completed`

## 注意事項

- ブランチ名はLinear CLIが自動生成する（`username/dis-xx-title` 形式）
- 1つのイシューに対して1つのブランチ・1つのPRを原則とする
- 実装中に追加タスクが見つかった場合は、別イシューとして `linear issue create` で作成する
