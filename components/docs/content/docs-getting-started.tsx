import Link from "next/link";

export function DocsGettingStarted() {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none">
      <h1>基本的な使い方</h1>
      <p>
        Discalendarの導入から基本操作までの手順を解説します。以下の3つのステップで簡単に始められます。
      </p>

      <h2>STEP 1: ログインしBotをサーバーに導入</h2>
      <p>
        まずはこのサイトにDiscordのアカウントを使用してログインします。次に、Discordに通知を届けるためにBotをサーバーに導入します。
      </p>
      <ul>
        <li>
          <Link href="/docs/login">ログイン</Link>の手順を確認する
        </li>
        <li>
          <Link href="/docs/invite">Botの招待</Link>の手順を確認する
        </li>
      </ul>

      <h2>STEP 2: 初期化のためのコマンドを実行</h2>
      <p>
        BotからのメッセージをDiscordで受信したいチャンネルで初期設定コマンドを実行してください。このコマンドは「メッセージの管理」「サーバーの管理」「ロールの管理」「管理者」のいずれかの権限を持っている方が実行できます。
      </p>
      <ul>
        <li>
          <Link href="/docs/initialize">初期設定</Link>の手順を確認する
        </li>
      </ul>

      <h2>STEP 3: ブラウザで予定を入力</h2>
      <p>
        ダッシュボードページから、Botを導入したサーバーへ移動します。予定の新規作成から新しい予定を作成してみましょう。
      </p>
      <p>
        指定した通知時刻と開始時刻になった際に、自動的にDiscordへメッセージが送信されます。予定を右クリック（モバイルではタップ）することで予定を編集することもできます。
      </p>
    </article>
  );
}
