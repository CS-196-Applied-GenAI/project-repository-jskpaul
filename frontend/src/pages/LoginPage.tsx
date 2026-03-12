import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { loginRequest } from "../api/client";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const from = (location.state as { from?: Location })?.from?.pathname ?? "/home";

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const trimmed = username.trim();
      const uname = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
      const tokenResp = await loginRequest(uname, password);
      login({ username: uname, token: tokenResp.access_token });
      navigate(from, { replace: true });
    } catch (err) {
      setError("Login failed. Check your username and password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Log in</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm font-medium text-slate-800 dark:text-slate-100">
          Username
          <input
            className="mt-1 w-full rounded-md bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-50 border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/70"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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
            required
          />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full bg-gradient-to-r from-accent to-[#FF7A5A] py-2.5 mt-2 text-sm font-semibold text-white shadow-sm hover:from-[#FF7A94] hover:to-[#FF9A7A] active:brightness-95 disabled:opacity-50 disabled:shadow-none disabled:hover:from-accent disabled:hover:to-[#FF7A5A] transition-[filter,background-image,opacity]"
        >
          {isSubmitting ? "Logging in..." : "Log in"}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
        Need an account?{" "}
        <Link to="/register" className="text-accent2 hover:underline">
          Create one
        </Link>
      </p>
    </section>
  );
}
