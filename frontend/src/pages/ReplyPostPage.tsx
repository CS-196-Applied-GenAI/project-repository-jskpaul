import { FormEvent, useState } from "react";
import { useParams } from "react-router-dom";

export function ReplyPostPage() {
  const { tweetId } = useParams<{ tweetId: string }>();
  const [text, setText] = useState("");

  const charsRemaining = 280 - text.length;
  const isTooLong = charsRemaining < 0;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isTooLong || text.trim().length === 0) return;
    // TODO: connect to backend POST /tweets (as reply to tweetId)
    // eslint-disable-next-line no-console
    console.log({ replyTo: tweetId, text });
    setText("");
  };

  return (
    <section className="max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Reply</h1>
      <p className="text-sm text-slate-300 mb-4">Replying to tweet #{tweetId}</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <textarea
          className="w-full min-h-[140px] rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500 resize-vertical"
          maxLength={320}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Share your thoughts in a quick reply..."
        />
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className={isTooLong ? "text-red-400" : undefined}>{charsRemaining} characters left</span>
          <button
            type="submit"
            disabled={isTooLong || text.trim().length === 0}
            className="rounded-full bg-sky-500 disabled:bg-slate-700 disabled:text-slate-400 hover:bg-sky-400 text-sm font-semibold px-4 py-1.5 transition-colors"
          >
            Reply
          </button>
        </div>
      </form>
    </section>
  );
}
