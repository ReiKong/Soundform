"use client";

import { useState } from "react";

type SearchFormProps = {
  loading: boolean;
  onSearch: (query: string) => Promise<boolean>;
};

export function SearchForm({ loading, onSearch }: SearchFormProps) {
  const [query, setQuery] = useState("");

  return (
    <form
      className="search"
      onSubmit={async (event) => {
        event.preventDefault();
        const value = query.trim();
        if (!value) return;
        if (await onSearch(value)) setQuery("");
      }}
    >
      <label htmlFor="music-search">Find a sound</label>
      <input
        id="music-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="enter a track to find its sonic neighbours…"
      />
      <button type="submit" disabled={loading}>{loading ? "mapping…" : "find"}</button>
    </form>
  );
}
