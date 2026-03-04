import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { fetchFeed, type Tweet } from "../api/client";

export function HomeFeedPage() {
  const { user } = useAuth();
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user) return;
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchFeed(user.token);
        if (!cancelled) {
          setTweets(data.items ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Could not load your feed. Try refreshing.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold mb-2">Home</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
        This is your follower-only, reverse-chronological feed. You&apos;ll see tweets from accounts you
        follow.
      </p>
      {isLoading && <p className="text-sm text-slate-600 dark:text-slate-400">Loading feed...</p>}
      {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
      {!isLoading && tweets.length === 0 && !error && (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No tweets yet. Follow someone or post from another account to see activity here.
        </p>
      )}
      {tweets.length > 0 && (
        <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-white/70 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950/60">
          {tweets.map((tweet) => (
            <article key={tweet.id} className="p-4 hover:bg-slate-900/60 transition-colors">
              <header className="flex items-center justify-between mb-1">
                <Link to={`/profile/${tweet.username}`} className="font-semibold hover:underline">
                  @{tweet.username}
                </Link>
                <span className="text-xs text-slate-400">
                  {new Date(tweet.created_at).toLocaleString()}
                </span>
              </header>
              <p className="text-sm leading-relaxed">{tweet.text}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
