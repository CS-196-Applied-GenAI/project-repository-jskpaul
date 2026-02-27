import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const [handleOrEmail, setHandleOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const from = (location.state as { from?: Location })?.from?.pathname ?? "/home";

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    // TODO: connect to backend /auth/token
    // For now, simulate a successful login with a mock user.
    const handle = handleOrEmail.startsWith("@") ? handleOrEmail.slice(1) : handleOrEmail;
    login({ handle: handle || "me" });
    navigate(from, { replace: true });
  };

  return (
    <section className="max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Log in</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm font-medium">
          Handle or Email
          <input
            className="mt-1 w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
            value={handleOrEmail}
            onChange={(e) => setHandleOrEmail(e.target.value)}
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
            required
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-full bg-sky-500 hover:bg-sky-400 text-sm font-semibold py-2.5 mt-2 transition-colors"
        >
          Log in
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-300">
        Need an account?{" "}
        <Link to="/register" className="text-sky-400 hover:underline">
          Create one
        </Link>
      </p>
    </section>
  );
}
