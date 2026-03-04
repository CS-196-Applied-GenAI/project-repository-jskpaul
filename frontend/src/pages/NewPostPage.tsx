import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { createTweet } from "../api/client";

export function NewPostPage() {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const charsRemaining = 280 - text.length;
  const isTooLong = charsRemaining < 0;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isTooLong || text.trim().length === 0 || !user) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await createTweet(text.trim(), user.token);
      setText("");
      navigate("/home");
    } catch (err) {
      setError("Failed to post. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Compose new post</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <textarea
          className="w-full min-h-[160px] rounded-xl bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-50 border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500 resize-vertical"
          maxLength={320}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's happening?"
        />
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <span className={isTooLong ? "text-red-400" : undefined}>{charsRemaining} characters left</span>
          <button
            type="submit"
            disabled={isTooLong || text.trim().length === 0 || isSubmitting}
            className="rounded-full bg-sky-500 disabled:bg-slate-700 disabled:text-slate-400 hover:bg-sky-400 text-sm font-semibold px-4 py-1.5 transition-colors"
          >
            {isSubmitting ? "Posting..." : "Post"}
          </button>
        </div>
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      </form>
    </section>
  );
}
