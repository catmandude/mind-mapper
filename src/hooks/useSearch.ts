import { useState, useCallback, useRef, useEffect } from "react";
import { searchItems } from "../lib/tauri-commands";
import type { Item } from "../types";

export function useSearch() {
  const [results, setResults] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Clean up pending debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const search = useCallback((q: string) => {
    setQuery(q);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const items = await searchItems(q);
        setResults(items);
      } catch (e) {
        console.error("Search error:", e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 150);
  }, []);

  const clear = useCallback(() => {
    setQuery("");
    setResults([]);
  }, []);

  return { results, loading, query, search, clear };
}
