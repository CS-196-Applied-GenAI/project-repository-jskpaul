import { useParams } from "react-router-dom";
import { mockUsers } from "../mock/data";

export function ProfilePage() {
  const { handle = "me" } = useParams<{ handle: string }>();
  const user = mockUsers.find((u) => u.handle === handle) ?? {
    handle,
    bio: "This is a mock profile. Data will come from the backend later.",
    following: []
  };

  const isYou = handle === "me";

  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <p className="text-sm text-slate-400">
          {isYou ? "Your profile" : "Viewing profile"}
        </p>
        <h1 className="text-2xl font-semibold">@{user.handle}</h1>
        <p className="text-sm text-slate-200 max-w-xl">{user.bio}</p>
      </header>
      <div className="border border-dashed border-slate-700 rounded-xl p-4 text-sm text-slate-300">
        Timeline placeholder — this will show this user&apos;s tweets once the backend is wired up.
      </div>
    </section>
  );
}
