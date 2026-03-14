import { Link, useLocation, useNavigate } from "react-router-dom";

type LocationState = {
  username?: string;
};

export function AccountCreatedPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as LocationState) || {};
  const username = state.username;

  return (
    <section className="max-w-md mx-auto text-center space-y-5">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Account created</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Your new account{username ? ` @${username}` : ""} was created successfully.
        </p>
      </header>
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-5 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
        <p className="font-medium mb-1">You&apos;re all set.</p>
        <p className="text-[13px] text-emerald-900/80 dark:text-emerald-100/80">
          Use your handle and password on the next screen to log in and start posting.
        </p>
      </div>
      <div className="flex flex-col items-center gap-3 text-sm">
        <button
          type="button"
          onClick={() => navigate("/login", { replace: true, state: { username } })}
          className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-accent to-[#FF7A5A] px-6 py-2 text-sm font-semibold text-white shadow-sm hover:from-[#FF7A94] hover:to-[#FF9A7A] active:brightness-95 transition-[filter,background-image,opacity]"
        >
          Go to login
        </button>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Already logged in?{" "}
          <Link to="/home" className="text-accent2 hover:underline">
            Go to your feed
          </Link>
        </p>
      </div>
    </section>
  );
}

