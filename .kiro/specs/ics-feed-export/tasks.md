# Implementation Plan

- [x] 1. DBマイグレーション: ICSフィードアクセストークンテーブル
- [x] 1.1 ics_feed_tokensテーブルの作成マイグレーションを追加する
  - ギルドごとのICSフィード用アクセストークンを格納するテーブルを作成する
  - guild_id（guildsテーブルへの外部キー、CASCADE削除）、token（VARCHAR(64)）、created_at、revoked_at カラムを含める
  - アクティブトークンのユニーク部分インデックス（guild_id WHERE revoked_at IS NULL）で1ギルド1アクティブトークンを保証する
  - トークン検証用の部分インデックス（token WHERE revoked_at IS NULL）で高速検索を可能にする
  - RLSを有効化し、認証済みユーザーが自分のギルドのトークンを読み取り・作成・更新できるポリシーを設定する（user_guildsテーブルでメンバーシップ検証）
  - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [x] 2. ICSビルダー: RFC 5545準拠のICSテキスト生成
- [x] 2.1 (P) VCALENDARの基本構造とヘルパー関数を実装する
  - VCALENDAR開始/終了タグ、VERSION:2.0、PRODID、X-WR-CALNAME（ギルド名）を出力する関数を作成する
  - ICS日時フォーマット変換ヘルパー: ISO 8601からICS形式（YYYYMMDDTHHMMSSZ / YYYYMMDD）への変換を実装する
  - テキストエスカープヘルパー: カンマ・セミコロンのバックスラッシュエスケープ、改行の`\n`変換を実装する
  - 行折り返しヘルパー: 75オクテット制限でCRLF+空白による継続行処理を実装する
  - UID生成: `{id}@discalendar.app` 形式のUID文字列を返す関数を作成する
  - Edge Functionの共有コードとして配置し、将来の再利用を可能にする
  - _Requirements: 1.2, 2.2, 2.6_

- [x] 2.2 (P) 単発イベントのVEVENT生成を実装する
  - 単発イベント（series_idがNULL）をVEVENTコンポーネントに変換する関数を作成する
  - 必須フィールド: DTSTART、DTEND、SUMMARY（イベント名）、UID、DTSTAMP を出力する
  - 終日イベント（is_all_day = true）の場合はDTSTART/DTENDをVALUE=DATE形式で出力する
  - オプショナルフィールド: descriptionがあればDESCRIPTION、locationがあればLOCATIONを出力する
  - channel_id、channel_name、notificationsなどの内部情報はVEVENTに含めない
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 7.3_

- [x] 2.3 (P) 繰り返しイベントと例外オカレンスのVEVENT生成を実装する
  - 繰り返しイベント（event_series）をRRULE付きVEVENTに変換する関数を作成する
  - event_series.rruleの値をそのままRRULEプロパティとして出力する
  - DTSTARTとしてdtstart、DTENDとしてdtstart + duration_minutesを計算して出力する
  - exdatesに除外日がある場合はEXDATEプロパティとして出力する
  - 例外オカレンス（events テーブル、series_idがNOT NULL）をRECURRENCE-ID付きの個別VEVENTとして出力する関数を作成する
  - RECURRENCE-IDの値にはoriginal_dateを使用し、親シリーズと同じUIDを設定する
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.3_

- [x] 2.4 ICSビルダーのユニットテストを作成する
  - VCALENDAR全体構造の検証（VERSION、PRODID、X-WR-CALNAME）
  - 単発イベントの必須フィールド出力、終日イベントのVALUE=DATE出力、オプショナルフィールドの条件付き出力をテストする
  - 繰り返しイベントのRRULE出力、EXDATE出力、duration_minutesからのDTEND計算をテストする
  - 例外オカレンスのRECURRENCE-ID出力、親シリーズとのUID一致をテストする
  - テキストエスカープ（カンマ・セミコロン・改行を含む文字列）と行折り返し（75オクテット超のプロパティ）をテストする
  - 内部情報（channel_id等）がVEVENTに含まれないことを検証する
  - _Requirements: 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 7.3_

- [ ] 3. Edge Function: ICSフィードエンドポイント
- [ ] 3.1 Edge Functionの基本セットアップとギルド検索を実装する
  - Supabase Edge Function（Deno.serve）のエントリーポイントを作成する
  - クエリパラメータからguild_idとtokenを抽出する
  - guild_idが未指定の場合は400 Bad Requestを返す
  - service role keyでSupabaseクライアントを作成し、guild_idでギルドを検索する
  - ギルドが存在しない、または削除済み（deleted_at IS NOT NULL）の場合は404を返す
  - Content-Type `text/calendar; charset=utf-8` でレスポンスを返すための基本構造を構築する
  - Cache-Controlヘッダー（public, max-age=3600, stale-while-revalidate=600）を設定する
  - _Requirements: 1.1, 1.3, 1.4_

- [ ] 3.2 アクセストークン認証ロジックを実装する
  - ギルドが非公開（is_public = false）の場合、tokenパラメータの有無を確認する
  - ics_feed_tokensテーブルからguild_idとtokenの組み合わせでアクティブなトークン（revoked_at IS NULL）を検索する
  - トークン検証にcrypto.subtle.timingSafeEqual()を使用し、タイミング攻撃を防止する
  - トークンが無効・未指定・無効化済みの場合は401 Unauthorizedを返す
  - 公開ギルド（is_public = true）の場合はトークン検証をスキップしてフィード生成に進む
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.4, 7.4_

- [ ] 3.3 イベントデータ取得とICSレスポンス生成を実装する
  - 単発イベント（events テーブル、series_id IS NULL）をguild_idで取得する（内部カラムを除外するSELECT句）
  - 繰り返しイベント（event_series テーブル）をguild_idで取得する（内部カラム除外）
  - 例外オカレンス（events テーブル、series_id IS NOT NULL）をguild_idで取得する
  - DB行のsnake_caseをIcsBuilder入力のcamelCaseに変換する
  - IcsBuilderを呼び出してICSテキストを生成し、レスポンスボディとして返す
  - パラメータ化クエリ（Supabase clientの自動処理）でSQLインジェクションを防止する
  - _Requirements: 1.1, 1.2, 2.1, 3.1, 7.1, 7.2_

- [ ] 3.4 Edge Functionの統合テストを作成する
  - 公開ギルドのICSフィード取得（トークンなしで200レスポンス、Content-Type検証）
  - 非公開ギルドの認証テスト（有効トークンで200、無効トークンで401、トークンなしで401）
  - 存在しないギルドで404レスポンスを返すこと
  - guild_id未指定で400レスポンスを返すこと
  - レスポンスにVCALENDARが含まれ、単発イベント・繰り返しイベントのVEVENTが正しく出力されること
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.3_

- [ ] 4. Server Action: トークン管理サービス
- [ ] 4.1 トークン取得・生成のServer Actionを実装する
  - 認証済みユーザーの検証とギルドメンバーシップの確認を行う
  - ギルドのアクティブなトークン（revoked_at IS NULL）を取得する関数を作成する
  - トークンが存在しない場合は新規生成する（crypto.getRandomValues()で暗号学的に安全な32バイト→hex 64文字）
  - Result型パターン（success/error判別共用体）で結果を返す
  - フィードURL文字列を組み立てて返す（公開/非公開に応じてトークン付き/なし）
  - _Requirements: 4.5, 5.3, 6.3, 6.4_

- [ ] 4.2 トークン再生成のServer Actionを実装する
  - 既存のアクティブトークンのrevoked_atを現在時刻で更新して無効化する
  - 新しいトークンを生成してics_feed_tokensに挿入する
  - 旧トークンの無効化と新トークンの生成を一連の操作として実行する
  - 新しいトークンを含むフィードURLをResult型で返す
  - _Requirements: 5.4, 6.5_

- [ ] 4.3 トークン管理の統合テストを作成する
  - トークン取得: 初回呼び出しで新規生成、2回目で既存トークンを返すことを検証する
  - トークン再生成: 旧トークンが無効化され、新トークンが生成されることを検証する
  - 無効化済みトークンでのEdge Functionアクセスが401になることを検証する
  - 未認証・非メンバーのアクセスがエラーを返すことを検証する
  - _Requirements: 4.5, 5.4_

- [ ] 5. Web UI: ICSフィードURL管理セクション
- [ ] 5.1 ICSフィードURL表示・コピーコンポーネントを実装する
  - ギルドのカレンダー設定エリアにICSフィードURLセクションを追加する
  - 読み取り専用のURL入力フィールドとコピーボタンを配置する
  - コピーボタンクリック時にnavigator.clipboard.writeText()でURLをコピーし、コピー完了のフィードバック（toast通知）を表示する
  - 公開ギルドはトークンなしのURL、非公開ギルドはトークン付きのURLを表示する
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 5.2 トークン再生成UIを実装する
  - 非公開ギルドの場合にトークン再生成ボタンを表示する
  - ボタンクリック時にServer Actionを呼び出し、再生成中はローディング状態にする
  - 再生成完了後、表示されているURLを新しいトークン付きURLに更新する
  - エラー時はtoast通知でエラーメッセージを表示する
  - _Requirements: 6.5_

- [ ]*5.3 ICSフィードURLセクションのStorybookストーリーとテストを作成する
  - 公開ギルド（トークンなしURL）と非公開ギルド（トークン付きURL）の両バリアントのストーリーを作成する
  - コピーボタンクリック時のフィードバック表示をテストする
  - トークン再生成ボタンのローディング状態と完了後のURL更新をテストする
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 6. 統合: ダッシュボードへのICSフィード機能の組み込み
- [ ] 6.1 ダッシュボードページにICSフィードURLセクションを統合する
  - ダッシュボードのServer Componentでギルドの公開/非公開状態とアクティブトークンを取得する
  - IcsFeedUrlSectionコンポーネントにpropsとして渡す
  - Edge FunctionのURL（Supabaseプロジェクト参照値）を環境変数から取得して渡す
  - _Requirements: 6.1, 6.3, 6.4_

- [ ] 6.2 Edge Functionのデプロイ設定を構成する
  - `--no-verify-jwt` フラグ付きでEdge Functionをデプロイ可能にする
  - CORSヘッダー（Access-Control-Allow-Origin: *）を設定する
  - ローカル開発環境でsupabase functions serveによる動作確認手順を整備する
  - _Requirements: 1.1, 1.4_
