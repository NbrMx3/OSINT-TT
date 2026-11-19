import { Link } from "react-router-dom";

function NotFoundPage() { return <div className="flex min-h-[60vh] flex-col items-center justify-center text-center"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-signal">404</p><h2 className="mt-3 text-3xl font-semibold text-ink">Page not found</h2><p className="mt-2 text-sm text-slate">The requested workspace view does not exist yet.</p><Link className="mt-6 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white" to="/dashboard">Return to overview</Link></div>; }
export default NotFoundPage;
