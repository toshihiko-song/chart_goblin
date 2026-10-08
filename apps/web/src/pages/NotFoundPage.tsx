import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div className="py-20 text-center">
      <p className="text-slate-400">Page not found.</p>
      <Link to="/" className="mt-2 inline-block text-sm text-emerald-400">
        ← Opportunities
      </Link>
    </div>
  );
}
