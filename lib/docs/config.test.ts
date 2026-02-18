/**
 * Task 1.2: ドキュメントメタデータ管理モジュールの単体テスト
 *
 * Requirements:
 * - 3.1: `/docs` ルート配下でドキュメントページ群を提供する
 * - 3.2: 全7ドキュメントページを提供する
 *
 * Contracts: DocsConfig Service Interface (design.md)
 */

import { describe, expect, it } from "vitest";
import {
	DOC_ENTRIES,
	type DocEntry,
	getAdjacentDocs,
	getAllDocSlugs,
	getDocBySlug,
} from "./config";

describe("Task 1.2: DocsConfig - DOC_ENTRIES", () => {
	it("7件のドキュメントエントリが定義されている", () => {
		expect(DOC_ENTRIES).toHaveLength(7);
	});

	it("各エントリが必須フィールドを持つ", () => {
		for (const entry of DOC_ENTRIES) {
			expect(entry).toHaveProperty("slug");
			expect(entry).toHaveProperty("title");
			expect(entry).toHaveProperty("order");
			expect(entry).toHaveProperty("description");
			expect(typeof entry.slug).toBe("string");
			expect(typeof entry.title).toBe("string");
			expect(typeof entry.order).toBe("number");
			expect(typeof entry.description).toBe("string");
		}
	});

	it("order順にソートされている", () => {
		for (let i = 1; i < DOC_ENTRIES.length; i++) {
			expect(DOC_ENTRIES[i].order).toBeGreaterThan(DOC_ENTRIES[i - 1].order);
		}
	});

	it("期待される全slugが含まれている", () => {
		const slugs = DOC_ENTRIES.map((e) => e.slug);
		expect(slugs).toEqual([
			"getting-started",
			"login",
			"invite",
			"initialize",
			"calendar",
			"edit",
			"commands",
		]);
	});
});

describe("Task 1.2: DocsConfig - getDocBySlug", () => {
	it("存在するslugのエントリを返す", () => {
		const entry = getDocBySlug("getting-started");
		expect(entry).toBeDefined();
		expect(entry?.slug).toBe("getting-started");
		expect(entry?.title).toBe("基本的な使い方");
		expect(entry?.order).toBe(0);
	});

	it("存在しないslugでundefinedを返す", () => {
		expect(getDocBySlug("non-existent")).toBeUndefined();
	});

	it("空文字列でundefinedを返す", () => {
		expect(getDocBySlug("")).toBeUndefined();
	});
});

describe("Task 1.2: DocsConfig - getAllDocSlugs", () => {
	it("全slugの配列を返す", () => {
		const slugs = getAllDocSlugs();
		expect(slugs).toEqual([
			"getting-started",
			"login",
			"invite",
			"initialize",
			"calendar",
			"edit",
			"commands",
		]);
	});

	it("文字列の配列を返す", () => {
		const slugs = getAllDocSlugs();
		for (const slug of slugs) {
			expect(typeof slug).toBe("string");
		}
	});
});

describe("Task 1.2: DocsConfig - getAdjacentDocs", () => {
	it("中間ページで前後のエントリを返す", () => {
		const { prev, next } = getAdjacentDocs("invite");
		expect(prev?.slug).toBe("login");
		expect(next?.slug).toBe("initialize");
	});

	it("最初のページでprevがundefined", () => {
		const { prev, next } = getAdjacentDocs("getting-started");
		expect(prev).toBeUndefined();
		expect(next?.slug).toBe("login");
	});

	it("最後のページでnextがundefined", () => {
		const { prev, next } = getAdjacentDocs("commands");
		expect(prev?.slug).toBe("edit");
		expect(next).toBeUndefined();
	});

	it("存在しないslugで両方undefined", () => {
		const { prev, next } = getAdjacentDocs("non-existent");
		expect(prev).toBeUndefined();
		expect(next).toBeUndefined();
	});
});
