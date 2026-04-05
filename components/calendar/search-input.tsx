"use client";

/**
 * SearchInput - 検索入力フィールド
 *
 * タスク2.1: SearchInputコンポーネントの作成
 *
 * Requirements: 1.1, 1.5, 2.1, 2.2, 2.3, 4.1, 4.3
 */

import { Search, X } from "lucide-react";
import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type SearchInputProps = {
  /** 現在の検索クエリ */
  value: string;
  /** 検索クエリ変更ハンドラー */
  onChange: (query: string) => void;
  /** モバイル表示かどうか */
  isMobile: boolean;
  /** 一致件数（検索適用中のみ表示、nullで非表示） */
  matchCount: number | null;
};

/**
 * 検索入力フィールドの共通部分（アイコン + Input + クリアボタン）
 */
function SearchInputField({
  value,
  onChange,
  onKeyDown,
  onBlur,
  inputRef,
  isSearchActive,
  onClear,
  className,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
  isSearchActive: boolean;
  onClear: () => void;
  className?: string;
}) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 size-4 text-muted-foreground" />
      <Input
        aria-label="イベントを検索"
        className={`pr-8 pl-8 ${className === "flex-1" ? "" : "w-48"}`}
        data-testid="search-input"
        onBlur={onBlur}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder="検索..."
        ref={inputRef}
        type="text"
        value={value}
      />
      {isSearchActive ? (
        <Button
          aria-label="検索をクリア"
          className="-translate-y-1/2 absolute top-1/2 right-1 size-7"
          data-testid="search-clear-button"
          onClick={onClear}
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          <X className="size-3" />
        </Button>
      ) : null}
    </div>
  );
}

/**
 * SearchInput コンポーネント
 *
 * テキスト入力フィールドとクリアボタンを提供する。
 * モバイル時はアイコンボタンタップで展開/折りたたみ、
 * デスクトップ時はインライン表示する。
 *
 * @example
 * ```tsx
 * <SearchInput
 *   value={searchQuery}
 *   onChange={setSearchQuery}
 *   isMobile={false}
 *   matchCount={3}
 * />
 * ```
 */
export function SearchInput({
  value,
  onChange,
  isMobile,
  matchCount,
}: SearchInputProps) {
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // モバイル展開時にinputにフォーカスする
  useEffect(() => {
    if (isMobile && mobileExpanded) {
      inputRef.current?.focus();
    }
  }, [isMobile, mobileExpanded]);

  const handleClear = () => {
    onChange("");
    if (isMobile) {
      setMobileExpanded(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      onChange("");
      inputRef.current?.blur();
      if (isMobile) {
        setMobileExpanded(false);
      }
    }
  };

  const handleMobileBlur = () => {
    if (isMobile && value === "") {
      setMobileExpanded(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const isSearchActive = value.trim().length > 0;
  const showMatchCount = matchCount !== null && isSearchActive;

  // モバイル: 折りたたみ状態 → アイコンボタン表示
  if (isMobile && !mobileExpanded) {
    return (
      <Button
        aria-label="検索を開く"
        data-testid="search-toggle-button"
        onClick={() => setMobileExpanded(true)}
        size="icon"
        type="button"
        variant="outline"
      >
        <Search className="size-4" />
      </Button>
    );
  }

  // モバイル展開 / デスクトップ: 入力フィールド表示
  const fieldClassName = isMobile ? "flex-1" : undefined;
  const fieldOnBlur = isMobile ? handleMobileBlur : undefined;

  return (
    <div className={`flex items-center gap-2 ${isMobile ? "w-full" : ""}`}>
      <SearchInputField
        className={fieldClassName}
        inputRef={inputRef}
        isSearchActive={isSearchActive}
        onBlur={fieldOnBlur}
        onChange={handleChange}
        onClear={handleClear}
        onKeyDown={handleKeyDown}
        value={value}
      />
      {showMatchCount ? (
        <span className="shrink-0 text-muted-foreground text-sm">
          {matchCount}件
        </span>
      ) : null}
    </div>
  );
}
