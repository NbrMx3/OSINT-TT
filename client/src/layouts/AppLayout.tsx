import { NavLink, Outlet } from "react-router-dom";
import { Bell, CircleHelp, Database, LayoutDashboard, Search, Settings, ShieldCheck } from "lucide-react";

const navigation = [{ label: "Overview", to: "/dashboard", icon: LayoutDashboard }];

function AppLayout() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy text-signal"><ShieldCheck size={20} strokeWidth={2.2} /></div>
          <div><p className="text-sm font-semibold tracking-wide text-ink">OSINT-X</p><p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate">Intelligence workspace</p></div>
        </div>
        <nav className="flex-1 space-y-7 px-4 py-7" aria-label="Primary navigation">
          <div>
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate">Workspace</p>
            {navigation.map(({ label, to, icon: Icon }) => (
              <NavLink className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-slate-100 text-navy" : "text-slate hover:bg-slate-50 hover:text-ink"}`} key={to} to={to}>
                <Icon size={17} />{label}
              </NavLink>
            ))}
          </div>
          <div>
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate">System</p>
            <div className="space-y-1 text-sm text-slate"><span className="flex items-center gap-3 rounded-lg px-3 py-2.5"><Database size={17} /> Data sources</span><span className="flex items-center gap-3 rounded-lg px-3 py-2.5"><Settings size={17} /> Settings</span></div>
          </div>
        </nav>
        <div className="border-t border-slate-100 p-4"><div className="flex items-center gap-3 rounded-xl bg-canvas p-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-signal text-xs font-bold text-white">AN</div><div className="min-w-0"><p className="truncate text-xs font-semibold text-ink">Analyst workspace</p><p className="truncate text-[11px] text-slate">Phase 1 foundation</p></div></div></div>
      </aside>
      <div className="lg:pl-64">
        <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
          <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy text-signal lg:hidden"><ShieldCheck size={20} /></div><div><p className="text-xs font-medium text-slate">Workspace / Overview</p><h1 className="mt-0.5 text-base font-semibold text-ink">Intelligence command center</h1></div></div>
          <div className="flex items-center gap-2 sm:gap-4"><button aria-label="Search" className="rounded-lg p-2 text-slate transition hover:bg-slate-100 hover:text-ink"><Search size={18} /></button><button aria-label="Notifications" className="rounded-lg p-2 text-slate transition hover:bg-slate-100 hover:text-ink"><Bell size={18} /></button><div className="hidden h-6 w-px bg-slate-200 sm:block" /><button aria-label="Help" className="hidden items-center gap-2 rounded-lg p-2 text-xs font-medium text-slate transition hover:bg-slate-100 hover:text-ink sm:flex"><CircleHelp size={17} /> Help</button></div>
        </header>
        <main className="min-h-[calc(100vh-5rem)] px-5 py-7 sm:px-8 sm:py-10"><Outlet /></main>
      </div>
    </div>
  );
}

export default AppLayout;
