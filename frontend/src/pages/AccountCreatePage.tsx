import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";

export function AccountCreatePage() {
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    // TODO: connect to backend /auth/register
    // For now we just log the values to the console.
    // eslint-disable-next-line no-console
    console.log({ handle, email, password });
  };

  return (
    <section className="max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Create your account</h1>
      <p className="text-sm text-slate-300 mb-6">
        Choose a unique handle. This will be your public identity (e.g. <span className="font-mono">@handle</span>).
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm font-medium">
          Handle
          <div className="mt-1 flex items-center gap-2">
            <span className="text-slate-400">@</span>
            <input
              className="flex-1 rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="handle"
              required
            />
          </div>
        </label>
        <label className="block text-sm font-medium">
          Email
          <input
            type="email"
            className="mt-1 w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input
            type="password"
            className="mt-1 w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-full bg-sky-500 hover:bg-sky-400 text-sm font-semibold py-2.5 mt-2 transition-colors"
        >
          Create account
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-300">
        Already have an account?{" "}
        <Link to="/login" className="text-sky-400 hover:underline">
          Log in
        </Link>
      </p>
    </section>
  );
}
