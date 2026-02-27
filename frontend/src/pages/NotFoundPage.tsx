import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="max-w-md mx-auto text-center space-y-4">
      <h1 className="text-3xl font-semibold">404</h1>
      <p className="text-sm text-slate-300">
        We couldn&apos;t find that page. Double-check the URL or head back to your feed.
      </p>
      <div className="flex justify-center gap-3 text-sm">
        <Link
          to="/home"
          className="rounded-full bg-sky-500 hover:bg-sky-400 px-4 py-1.5 font-semibold transition-colors"
        >
          Go to Home
        </Link>
        <Link
          to="/login"
          className="rounded-full border border-slate-600 hover:bg-slate-900 px-4 py-1.5 font-semibold transition-colors"
        >
          Log in
        </Link>
      </div>
    </section>
  );
}
