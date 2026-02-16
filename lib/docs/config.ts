export type DocEntry = {
	slug: string;
	title: string;
	order: number;
	description: string;
};

export const DOC_ENTRIES: readonly DocEntry[] = [
	{
		slug: "getting-started",
		title: "基本的な使い方",
		order: 0,
		description:
			"Discalendarの導入から基本操作までの手順を解説します。",
	},
	{
		slug: "login",
		title: "ログイン",
		order: 1,
		description: "Discord連携によるログイン方法を説明します。",
	},
	{
		slug: "invite",
		title: "Botの招待",
		order: 2,
		description: "DiscordサーバーへのBot追加手順を説明します。",
	},
	{
		slug: "initialize",
		title: "初期設定",
		order: 3,
		description:
			"Botの初期設定コマンドの使い方を説明します。",
	},
	{
		slug: "calendar",
		title: "予定の追加と表示",
		order: 4,
		description:
			"カレンダーでの予定作成と表示方法を説明します。",
	},
	{
		slug: "edit",
		title: "予定の編集と削除",
		order: 5,
		description: "予定の編集・削除方法を説明します。",
	},
	{
		slug: "commands",
		title: "利用可能なコマンド",
		order: 6,
		description:
			"Discalendarで使用できる全コマンドの一覧です。",
	},
] as const;

export function getDocBySlug(slug: string): DocEntry | undefined {
	return DOC_ENTRIES.find((entry) => entry.slug === slug);
}

export function getAllDocSlugs(): string[] {
	return DOC_ENTRIES.map((entry) => entry.slug);
}

export function getAdjacentDocs(slug: string): {
	prev: DocEntry | undefined;
	next: DocEntry | undefined;
} {
	const index = DOC_ENTRIES.findIndex((entry) => entry.slug === slug);
	if (index === -1) {
		return { prev: undefined, next: undefined };
	}
	return {
		prev: index > 0 ? DOC_ENTRIES[index - 1] : undefined,
		next: index < DOC_ENTRIES.length - 1 ? DOC_ENTRIES[index + 1] : undefined,
	};
}
