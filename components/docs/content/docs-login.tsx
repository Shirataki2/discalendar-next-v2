import Link from "next/link";

export function DocsLogin() {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none">
      <h1>ログイン</h1>
      <p>
        まずはこのサイトへログインし、あなたのDiscordアカウントと連携を行います。
      </p>

      <h2>Discord連携でログインする</h2>
      <p>
        ヘッダーの「ログイン」ボタンをクリックすると、Discordの認証画面に遷移します。DiscordアカウントでログインしてDiscalendarへのアクセスを許可してください。
      </p>
      <p>
        連携時に要求される権限は、あなたに関する情報（ユーザー名・アバター）と、あなたが所属しているサーバーに関する情報の取得にのみ使用します。
      </p>

      <h2>ログイン成功後</h2>
      <p>ログインが成功するとヘッダーにご自身のアバターが表示されます。</p>
      <p>
        ログイン後は
        <Link href="/dashboard">ダッシュボード</Link>
        ページにアクセスするか、Botを使いたいサーバーにまだ導入していない場合は
        <Link href="/docs/invite">Botの招待</Link>
        を行ってください。
      </p>

      <h2>ログインに失敗した場合</h2>
      <p>
        もしログインに失敗するようでしたら、サポートサーバーにてその旨をお知らせください。
      </p>
      <p>
        <a
          href="https://discord.gg/MyaZRuze23"
          rel="noopener noreferrer"
          target="_blank"
        >
          サポートサーバーに参加する
        </a>
      </p>
    </article>
  );
}
