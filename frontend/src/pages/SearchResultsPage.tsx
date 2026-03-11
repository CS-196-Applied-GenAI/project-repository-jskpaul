import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { searchUsers, type UserMinimal } from "../api/client";

export function SearchResultsPage() {
  const [params] = useSearchParams();
  const query = params.get("q") ?? "";
  const [results, setResults] = useState<UserMinimal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const q = query.trim();
      if (!q) {
        setResults([]);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const users = await searchUsers(q);
        if (!cancelled) {
          setResults(users);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to search users.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold mb-2">Search</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
        Results for <span className="font-mono">@{query}</span>
      </p>
      {isLoading && <p className="text-sm text-slate-600 dark:text-slate-400">Searching…</p>}
      {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
      {!isLoading && !error && query.trim() === "" && (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Type a handle in the search box to find users.
        </p>
      )}
      {!isLoading && !error && query.trim() !== "" && results.length === 0 && (
        <p className="text-sm text-slate-600 dark:text-slate-400">No matching users found.</p>
      )}
      {results.length > 0 && (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white/70 dark:bg-slate-950/60">
          {results.map((u) => (
            <li key={u.id} className="p-3 hover:bg-slate-900/60 transition-colors">
              <Link to={`/profile/${u.username}`} className="font-semibold hover:underline">
                @{u.username}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

