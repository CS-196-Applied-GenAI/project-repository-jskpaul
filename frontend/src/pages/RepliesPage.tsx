import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { fetchTweet, listComments, type Comment, type Tweet } from "../api/client";

export function RepliesPage() {
  const { tweetId } = useParams<{ tweetId: string }>();
  const { user } = useAuth();
  const [tweet, setTweet] = useState<Tweet | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!tweetId || !user) return;
      setIsLoading(true);
      setError(null);
      try {
        const [tweetData, commentsData] = await Promise.all([
          fetchTweet(Number(tweetId), user.token),
          listComments(Number(tweetId), user.token)
        ]);
        if (!cancelled) {
          setTweet(tweetData);
          setComments(commentsData);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load replies.");
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
  }, [tweetId, user]);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold mb-2">Replies</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
        Viewing replies to {tweet ? `@${tweet.username}'s tweet` : "this tweet"}
      </p>
      {tweet && (
        <article className="border border-slate-200 bg-white p-5 text-base text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 rounded-2xl">
          <header className="mb-2 flex items-center justify-between">
            <Link
              to={`/profile/${tweet.username}`}
              className="text-sm font-semibold hover:underline"
            >
              @{tweet.username}
            </Link>
            <span className="text-xs text-slate-400">
              {new Date(tweet.created_at).toLocaleString()}
            </span>
          </header>
          {tweet.retweeted_from && tweet.retweeted_from_username && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">
              Retweeted from{" "}
              <Link to={`/profile/${tweet.retweeted_from_username}`} className="font-semibold hover:underline">
                @{tweet.retweeted_from_username}
              </Link>
            </p>
          )}
          <p className="text-base leading-relaxed mb-1.5">{tweet.text ?? tweet.retweeted_from_text ?? ""}</p>
          {typeof tweet.sentiment_label === "string" && tweet.sentiment_label && (
            <span
              className={
                tweet.sentiment_label === "positive"
                  ? "inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                  : tweet.sentiment_label === "negative"
                  ? "inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:bg-rose-900/40 dark:text-rose-200"
                  : "inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              }
            >
              {tweet.sentiment_label.charAt(0).toUpperCase() + tweet.sentiment_label.slice(1)}
              {typeof tweet.sentiment_score === "number" && !Number.isNaN(tweet.sentiment_score) && (
                <span className="ml-1 opacity-80">
                  ({tweet.sentiment_score.toFixed(2)})
                </span>
              )}
            </span>
          )}
        </article>
      )}
      {isLoading && <p className="text-sm text-slate-600 dark:text-slate-400">Loading replies…</p>}
      {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
      {!isLoading && !error && comments.length === 0 && (
        <p className="text-sm text-slate-600 dark:text-slate-400">No replies yet.</p>
      )}
      {comments.length > 0 && (
        <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white/70 dark:bg-slate-950/60">
          {comments.map((reply) => (
            <article key={reply.id} className="p-4 hover:bg-slate-900/60 transition-colors">
              <header className="flex items-center justify-between mb-1">
                <span className="font-semibold">@{reply.username}</span>
                <span className="text-xs text-slate-400">
                  {new Date(reply.created_at).toLocaleString()}
                </span>
              </header>
              <p className="text-sm leading-relaxed">{reply.contents}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
