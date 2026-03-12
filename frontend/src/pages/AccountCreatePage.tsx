import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerRequest } from "../api/client";

export function AccountCreatePage() {
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await registerRequest({
        username: handle.trim(),
        name: name.trim(),
        email: email.trim(),
        password
      });
      navigate("/login", { replace: true, state: { justRegistered: true, username: handle.trim() } });
    } catch (err) {
      setError("Registration failed. Try a different handle or email.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Create your account</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
        Choose a unique handle. This will be your public identity (e.g. <span className="font-mono">@handle</span>).
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm font-medium text-slate-800 dark:text-slate-100">
          Name
          <input
            className="mt-1 w-full rounded-md bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-50 border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/70"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={100}
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-800 dark:text-slate-100">
          Handle
          <div className="mt-1 flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400">@</span>
            <input
              className="flex-1 rounded-md bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-50 border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/70"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="handle"
              required
            />
          </div>
        </label>
        <label className="block text-sm font-medium text-slate-800 dark:text-slate-100">
          Email
          <input
            type="email"
            className="mt-1 w-full rounded-md bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-50 border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/70"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-800 dark:text-slate-100">
          Password
          <input
            type="password"
            className="mt-1 w-full rounded-md bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-50 border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/70"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full bg-gradient-to-r from-accent to-[#FF7A5A] py-2.5 mt-2 text-sm font-semibold text-white shadow-sm hover:from-[#FF7A94] hover:to-[#FF9A7A] active:brightness-95 disabled:opacity-50 disabled:shadow-none disabled:hover:from-accent disabled:hover:to-[#FF7A5A] transition-[filter,background-image,opacity]"
        >
          {isSubmitting ? "Creating..." : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
        Already have an account?{" "}
        <Link to="/login" className="text-accent2 hover:underline">
          Log in
        </Link>
      </p>
    </section>
  );
}
