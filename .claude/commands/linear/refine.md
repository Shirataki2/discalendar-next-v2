---
description: イシューを対話的に深掘り。詳細補強・サブタスク分解・プロジェクト昇格を対話形式で実施
allowed-tools: Bash
argument-hint: [issue-id] [--auto] [--skip-refine] [--skip-split]
---

# Linear Issue Refine コマンド

<background_information>
- **Mission**: 既存のLinearイシューを対話的に深掘りし、品質を向上させる
- **Success Criteria**:
  - イシューの品質スコアが分析・表示される
  - 不足項目が対話的に補強される
  - 必要に応じてサブタスク分解またはプロジェクト昇格が行われる
  - 全変更のサマリーと次ステップが提示される
</background_information>

<instructions>
## Core Task
Linear CLIを使って既存イシューを分析・補強し、サブタスク分解やプロジェクト昇格を対話的に行う。

## Parse Arguments
- `[issue-id]`: イシューID（例: `DIS-42`）。省略時はブランチ検出 or 一覧から選択
- `--auto`: 全フェーズを対話なしで自動適用
- `--skip-refine`: Phase 1（詳細補強）をスキップ
- `--skip-split`: Phase 3A（サブタスク分解）をスキップ

## Execution Steps

### Phase 0: イシュー取得と現状分析

#### Step 0-1: Issue IDの解決
Issue IDが引数で指定されている場合はそのまま使用。

省略時は、まずブランチから検出を試行:
```bash
linear issue id
```

検出できなかった場合は一覧を表示して選択:
```bash
linear issue list --no-pager
```

#### Step 0-2: イシュー詳細の取得
```bash
linear issue view <issue-id> --json
```

JSON出力から以下を解析:
- `title`, `description`, `priority`, `estimate`, `labels`, `state`, `project`, `parent`, `children`

#### Step 0-3: バリデーション
- `state` が `completed` または `canceled` の場合はエラー終了:
  「このイシューは既に完了/キャンセル済みです。アクティブなイシューを指定してください。」

#### Step 0-4: 品質スコア分析レポート
以下の項目を ○/△/× で評価し、テーブル形式で表示:

| 項目 | 評価基準 |
|------|---------|
| タイトル | ○: 動詞始まりで具体的 / △: 名詞句だが意図が分かる / ×: 曖昧・短すぎ |
| 説明文 | ○: 背景+目的+受け入れ条件あり / △: 部分的に記述あり / ×: 空 or 1行のみ |
| 優先度 | ○: 設定済み / ×: 未設定（No priority） |
| 見積もり | ○: 設定済み / ×: 未設定 |
| ラベル | ○: 1つ以上設定 / △: 未設定だが影響小 |
| 受け入れ条件 | ○: 明確なAC記載 / △: 暗黙的に推測可 / ×: なし |

出力例:
```markdown
## 品質分析レポート: DIS-XX

| 項目 | 状態 | 詳細 |
|------|------|------|
| タイトル | ○ | 動詞始まりで具体的 |
| 説明文 | △ | 目的はあるが受け入れ条件が不足 |
| 優先度 | × | 未設定 |
| 見積もり | × | 未設定 |
| ラベル | △ | 未設定 |
| 受け入れ条件 | × | 記載なし |
```

#### Step 0-5: スコープ推定と推奨アクション
説明文・タイトルの複雑度からスコープを推定（S/M/L/XL）し、推奨アクションを表示:

```markdown
**スコープ推定**: M（1-2日）
**推奨アクション**:
- 説明文に受け入れ条件を追加
- 優先度・見積もりを設定
- SDD仕様策定を推奨
```

---

### Phase 1: 詳細補強

**`--skip-refine` が指定されている場合はこのフェーズをスキップし、Phase 2へ進む。**

品質スコアで △ または × の項目を順に改善する。各ステップでユーザー承認を求める（`--auto` 時は自動適用）。

#### Step 1-1: タイトル改善（△/× の場合）
現在のタイトルを分析し、動詞で始まる明確な形に改善案を提示:
```
現在: "カレンダー週表示"
提案: "カレンダーに週表示モードを追加する"

この改善を適用しますか？ (y/n/edit)
```

適用時:
```bash
linear issue update <issue-id> -t "<新タイトル>"
```

#### Step 1-2: 説明文補強（△/× の場合）
既存の説明文を基に、以下の構造で補強案を生成:

```markdown
## 背景
（なぜこの変更が必要か）

## 目的
（何を達成するか）

## 受け入れ条件
- [ ] AC1
- [ ] AC2
- [ ] AC3

## 技術メモ
（実装上の考慮事項があれば）
```

ユーザーに提示して承認を得た後、`--description-file` で更新:
```bash
linear issue update <issue-id> --description-file /dev/stdin <<'DESCRIPTION_EOF'
（マークダウン本文）
DESCRIPTION_EOF
```

#### Step 1-3: 優先度設定（× の場合）
未設定の場合、選択肢を提示:
```
優先度を設定してください:
1. Urgent（緊急）
2. High（高）
3. Medium（中）
4. Low（低）
```

適用時:
```bash
linear issue update <issue-id> --priority <n>
```

#### Step 1-4: 見積もり設定（× の場合）
スコープ推定に基づいてポイントを推奨:
- S → 1pt
- M → 2pt
- L → 3pt
- XL → 5pt

```
推奨見積もり: 2pt（スコープ M）
この見積もりを適用しますか？ (y/n/custom)
```

適用時:
```bash
linear issue update <issue-id> --estimate <n>
```

#### Step 1-5: ラベル設定（△ の場合）
利用可能なラベルを取得し、関連するものを提案:
```bash
linear label list --no-pager
```

提案後:
```bash
linear issue update <issue-id> -l "<label-name>"
```

---

### Phase 2: スコープ評価と分岐判定

Phase 1後の情報（見積もり・受け入れ条件数）で再評価を行う。

```bash
linear issue view <issue-id> --json
```

#### 判定ロジック:
- `estimate >= 5` OR 受け入れ条件 >= 8個 → **XL**: プロジェクト昇格を推奨 → Phase 3Bへ
- `estimate >= 3` OR 受け入れ条件 >= 4個 → **L**: サブタスク分解を推奨 → Phase 3Aへ
- `estimate >= 2` OR 受け入れ条件 >= 3個 → **M**: サブタスク分解を任意提案 → Phase 3A（ユーザー判断）
- それ以外 → **S**: 分解不要 → Phase 4へ

#### 既存状態の確認:
- 既にサブイシューがある場合（`children` が空でない）: サブタスク分解は追加の形で提案
- 既にプロジェクトに所属している場合（`project` が設定済み）: プロジェクト昇格はスキップ

判定結果を表示:
```markdown
**スコープ再評価**: L（見積もり: 3pt, AC: 5個）
**推奨**: サブタスク分解
```

---

### Phase 3A: サブタスク分解

**`--skip-split` が指定されている場合はこのフェーズをスキップし、Phase 4へ進む。**
**Phase 2で S 判定の場合もスキップ。**
**Phase 2で M 判定かつユーザーが分解不要と回答した場合もスキップ。**

#### Step 3A-1: タスク提案
受け入れ条件と説明文から、実装可能粒度のサブタスクを生成。テーブル形式で提案:

```markdown
## サブタスク提案

| # | タイトル | 優先度 | 見積もり |
|---|---------|--------|---------|
| 1 | DBスキーマにweek_view列を追加 | 3 | 1pt |
| 2 | 週表示コンポーネントを実装 | 3 | 2pt |
| 3 | 表示切替UIを追加 | 3 | 1pt |

合計: 4pt

個別に編集しますか？ (y/n)
```

`--auto` 時は自動でそのまま作成。

#### Step 3A-2: サブイシュー作成
承認後、各サブタスクを作成:
```bash
linear issue create --title "<タイトル>" --parent <issue-id> --priority <n> --estimate <n> -a self --no-interactive
```

#### Step 3A-3: 親イシューの見積もり更新
サブタスクの合計で親イシューの見積もりを更新:
```bash
linear issue update <issue-id> --estimate <合計pt>
```

---

### Phase 3B: プロジェクト昇格

**Phase 2でXL判定かつユーザーが昇格に同意した場合のみ実行。**

#### Step 3B-1: プロジェクト作成
```bash
linear project create -n "<プロジェクト名>" -d "<説明>" -t DIS -l @me -s planned
```

プロジェクト名はイシュータイトルから生成（ユーザー編集可）。

#### Step 3B-2: イシューをプロジェクトに紐付け
```bash
linear issue update <issue-id> --project "<プロジェクト名>"
```

#### Step 3B-3: サブイシュー作成
Phase 3Aと同様にサブイシューを作成し、親イシュー + プロジェクトに紐付け:
```bash
linear issue create --title "<タイトル>" --parent <issue-id> --project "<プロジェクト名>" --priority <n> --estimate <n> -a self --no-interactive
```

---

### Phase 4: サマリーと次のステップ

全フェーズの変更をまとめて表示:

```markdown
## Refine 完了: DIS-XX

### 変更サマリー
- タイトル: "旧タイトル" → "新タイトル"
- 説明文: 補強済み（背景・目的・AC追加）
- 優先度: 未設定 → Medium (3)
- 見積もり: 未設定 → 3pt
- ラベル: +feature

### 作成されたサブイシュー
| ID | タイトル | 見積もり |
|----|---------|---------|
| DIS-YY | サブタスク1 | 1pt |
| DIS-ZZ | サブタスク2 | 2pt |

### 次のステップ
- **SDD仕様策定**: `/kiro:spec-init "DIS-XXの説明"`
- **作業開始**: `/linear:start DIS-XX`
- **サブタスクから開始**: `/linear:start DIS-YY`
```

SDD推奨判断:
- M以上のスコープ → SDD推奨（`/kiro:spec-init` を案内）
- S → 直接実装（`/linear:start` を案内）

## Error Handling
- **Issue ID不明**: ブランチ検出失敗時、`linear issue list` で一覧表示
- **完了/キャンセル済み**: エラーメッセージを表示し、アクティブなイシューの指定を促す
- **Linear CLI未インストール**: インストール手順を案内
- **API エラー**: エラー内容を表示し、再試行を提案
- **サブイシュー作成失敗**: 作成済み分を表示し、残りの手動作成を案内
</instructions>
