import { useParams } from "react-router-dom";

type MockReply = {
  id: string;
  authorHandle: string;
  createdAt: string;
  text: string;
};

const MOCK_REPLIES: MockReply[] = [
  {
    id: "r1",
    authorHandle: "latency_hunter",
    createdAt: "1m ago",
    text: "Love the follower-only feed concept. Super clean mental model."
  },
  {
    id: "r2",
    authorHandle: "pydantic_fan",
    createdAt: "8m ago",
    text: "Don’t forget strict validation on tweet length at the edge."
  }
];

export function RepliesPage() {
  const { tweetId } = useParams<{ tweetId: string }>();

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold mb-2">Replies</h1>
      <p className="text-sm text-slate-300 mb-4">Viewing replies to tweet #{tweetId}</p>
      <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
        {MOCK_REPLIES.map((reply) => (
          <article key={reply.id} className="p-4 hover:bg-slate-900/60 transition-colors">
            <header className="flex items-center justify-between mb-1">
              <span className="font-semibold">@{reply.authorHandle}</span>
              <span className="text-xs text-slate-400">{reply.createdAt}</span>
            </header>
            <p className="text-sm leading-relaxed">{reply.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
