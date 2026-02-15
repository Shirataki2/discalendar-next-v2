# Requirements Document

## Introduction
Discalendar Next のダッシュボードにおいて、Discord BOT がまだ参加していないギルドをユーザーに提示し、BOT 招待フローを提供する機能。V2（Nuxt.js版）では実装済みだったが、Next.js 移植版では未実装のため追加する。ユーザーが新規ギルドで Discalendar を利用開始する際の導線を確保することが目的。

## Requirements

### Requirement 1: BOT 未参加ギルドの表示
**Objective:** ダッシュボードのユーザーとして、BOT が未参加のギルドを確認したい。BOT を招待すべきギルドを把握するため。

#### Acceptance Criteria
1. When ユーザーがダッシュボードを表示した時, the ギルド一覧 shall ユーザーが管理権限を持つ全ギルドを取得して表示する
2. The ギルド一覧 shall BOT 参加済みギルドと BOT 未参加ギルドを視覚的に区別して表示する
3. While BOT が未参加のギルド, the ギルドカード shall BOT 未参加であることを示すラベルまたはバッジを表示する
4. When BOT 未参加ギルドが存在しない場合, the ギルド一覧 shall BOT 参加済みギルドのみを通常通り表示する

### Requirement 2: BOT 招待アクション
**Objective:** ギルド管理者として、BOT 未参加のギルドに BOT を招待したい。そのギルドで Discalendar を使い始めるため。

#### Acceptance Criteria
1. While BOT が未参加のギルドが表示されている時, the ギルドカード shall 「BOT を招待」ボタンを表示する
2. When ユーザーが「BOT を招待」ボタンをクリックした時, the システム shall Discord の OAuth2 BOT 招待 URL を新しいタブで開く
3. The 招待 URL shall 環境変数 `NEXT_PUBLIC_BOT_INVITE_URL` から取得される
4. If 招待 URL の環境変数が未設定の場合, the システム shall 「BOT を招待」ボタンを非表示にする

### Requirement 3: BOT 参加状態の判定
**Objective:** システムとして、各ギルドの BOT 参加状態を正確に判定したい。適切な UI 表示と招待フローを提供するため。

#### Acceptance Criteria
1. When ダッシュボードのデータを読み込む時, the システム shall ユーザーの Discord ギルド一覧と BOT 参加済みギルド一覧を比較して参加状態を判定する
2. The システム shall ユーザーが Discord API 経由で取得したギルド一覧のうち、管理権限（MANAGE_GUILD または ADMINISTRATOR）を持つギルドのみを招待対象として表示する
3. When BOT 参加状態の判定に失敗した場合, the システム shall BOT 参加済みギルドのみを表示するフォールバック動作を行う

### Requirement 4: ギルド一覧の表示順序
**Objective:** ユーザーとして、ギルド一覧が整理された順序で表示されてほしい。目的のギルドを素早く見つけるため。

#### Acceptance Criteria
1. The ギルド一覧 shall BOT 参加済みギルドを先頭に、BOT 未参加ギルドをその後に表示する
2. The 各グループ内 shall ギルド名のアルファベット順で並べる

### Requirement 5: 招待後のギルド状態更新
**Objective:** ユーザーとして、BOT 招待完了後にギルド一覧が最新状態に更新されてほしい。招待が成功したことを確認するため。

#### Acceptance Criteria
1. When ユーザーが BOT 招待タブから戻ってきた時, the システム shall ギルド一覧のデータを再取得して表示を更新する
2. When 再取得後にギルドの BOT 参加状態が変わった場合, the ギルド一覧 shall 該当ギルドを BOT 参加済みセクションに移動して表示する

