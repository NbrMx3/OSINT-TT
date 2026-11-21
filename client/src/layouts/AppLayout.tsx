import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bell, ChevronLeft, ChevronRight, CircleHelp, Menu, Search, ShieldCheck, X } from "lucide-react";
import { getNavigationItem, navigationGroups } from "../config/navigation";
import { cn } from "../utils/cn";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { useAuth } from "../context/useAuth";

const notifications = [
  { title: "Source sync completed", description: "Domain intelligence finished its latest collection cycle.", time: "12 min ago", unread: true },
  { title: "Review required", description: "A source connector needs analyst attention.", time: "1 hr ago", unread: true },
  { title: "Workspace secured", description: "Your analyst session is protected by the current policy.", time: "Yesterday", unread: false },
];

function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const visibleNavigationGroups = useMemo(() => navigationGroups.map((group) => ({ ...group, items: group.items.filter((item) => !item.requiredPermission || user?.permissions.includes(item.requiredPermission)) })).filter((group) => group.items.length), [user]);
  const visibleNavigationItems = useMemo(() => visibleNavigationGroups.flatMap((group) => group.items), [visibleNavigationGroups]);
  const currentItem = getNavigationItem(location.pathname) ?? (location.pathname.startsWith("/investigations") ? getNavigationItem("/investigations") : undefined);
  const searchResults = useMemo(() => visibleNavigationItems.filter((item) => item.label.toLowerCase().includes(searchTerm.toLowerCase())), [searchTerm, visibleNavigationItems]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [mobileOpen]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen(true); }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function goTo(path: string) { navigate(path); setSearchOpen(false); setMobileOpen(false); setSearchTerm(""); }

  return <div className="min-h-screen bg-[#060a10] text-slate-100">
    <Sidebar groups={visibleNavigationGroups} collapsed={collapsed} mobileOpen={mobileOpen} onCollapsedChange={setCollapsed} onClose={() => setMobileOpen(false)} onNavigate={() => setMobileOpen(false)} />
    {mobileOpen && <button aria-label="Close navigation" className="fixed inset-0 z-20 bg-black/70 lg:hidden" onClick={() => setMobileOpen(false)} />}
    <div className={cn("transition-[padding] duration-200", collapsed ? "lg:pl-20" : "lg:pl-72")}>
      <header className="sticky top-0 z-10 flex h-[68px] items-center justify-between border-b border-white/[0.07] bg-[#080e17]/95 px-3 backdrop-blur sm:px-5 lg:px-7">
        <div className="flex min-w-0 items-center gap-3"><Button aria-label="Open navigation" className="lg:hidden" size="icon" variant="ghost" onClick={() => setMobileOpen(true)}><Menu size={18} /></Button><div className="hidden h-5 w-px bg-white/10 sm:block" /><div className="min-w-0"><div className="flex items-center gap-2 text-[10px] text-slate-600"><span>Workspace</span><span>/</span><span className="truncate text-slate-400">{currentItem?.label ?? "Overview"}</span></div><h1 className="mt-1 truncate text-sm font-semibold text-slate-100">{currentItem?.label ?? "Dashboard overview"}</h1></div></div>
        <div className="flex items-center gap-1.5 sm:gap-3"><Button aria-label="Search workspace" className="hidden gap-3 text-slate-500 sm:flex" size="sm" variant="secondary" onClick={() => setSearchOpen(true)}><Search size={14} /> <span className="w-28 text-left">Search workspace</span><kbd className="rounded border border-white/10 px-1.5 py-0.5 text-[9px] text-slate-600">⌘ K</kbd></Button><Button aria-label="Search workspace" className="sm:hidden" size="icon" variant="ghost" onClick={() => setSearchOpen(true)}><Search size={17} /></Button><Button aria-label="Open notifications" className="relative" size="icon" variant="ghost" onClick={() => setNotificationsOpen(true)}><Bell size={17} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-cyan-400" /></Button><Button aria-label="Help" className="hidden sm:flex" size="icon" variant="ghost"><CircleHelp size={17} /></Button><div className="ml-1 hidden h-6 w-px bg-white/10 md:block" /><button className="hidden items-center gap-2 rounded-md p-1.5 text-left transition hover:bg-white/[0.05] md:flex" onClick={() => navigate("/profile")}><span className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-400/15 text-[10px] font-bold text-cyan-300">AN</span><span><span className="block text-[10px] font-semibold text-slate-300">Analyst</span><span className="block text-[9px] text-slate-600">Workspace</span></span></button></div>
      </header>
      <main className="min-h-[calc(100vh-4.25rem)] px-3 py-5 sm:px-5 sm:py-7 lg:px-7 lg:py-8"><Outlet /></main>
    </div>

    <Dialog open={searchOpen} onOpenChange={setSearchOpen}><DialogContent><DialogHeader><DialogTitle>Search workspace</DialogTitle><DialogDescription>Jump to an intelligence module or workspace view.</DialogDescription></DialogHeader><div className="mt-5"><Input autoFocus placeholder="Search modules..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} /></div><div className="mt-3 max-h-72 space-y-1 overflow-y-auto">{searchResults.length ? searchResults.map((item) => <button className="flex w-full items-center gap-3 rounded-md p-2.5 text-left transition hover:bg-white/[0.05]" key={item.path} onClick={() => goTo(item.path)}><item.icon size={15} className="text-cyan-300" /><span className="flex-1"><span className="block text-xs text-slate-200">{item.label}</span><span className="mt-0.5 block text-[10px] text-slate-600">{item.description}</span></span><span className="text-[9px] text-slate-600">↵</span></button>) : <p className="py-8 text-center text-xs text-slate-600">No matching workspace views.</p>}</div></DialogContent></Dialog>
    <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}><DialogContent><DialogHeader><DialogTitle>Notifications</DialogTitle><DialogDescription>Workspace events and collection updates.</DialogDescription></DialogHeader><div className="mt-5 space-y-2">{notifications.map((notification) => <div className="flex gap-3 rounded-md border border-white/[0.06] bg-white/[0.02] p-3" key={notification.title}><span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", notification.unread ? "bg-cyan-400" : "bg-slate-700")} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><p className="text-xs font-medium text-slate-300">{notification.title}</p><Badge>{notification.time}</Badge></div><p className="mt-1 text-[10px] leading-5 text-slate-600">{notification.description}</p></div></div>)}</div></DialogContent></Dialog>
  </div>;
}

function Sidebar({ groups, collapsed, mobileOpen, onCollapsedChange, onClose, onNavigate }: { groups: typeof navigationGroups; collapsed: boolean; mobileOpen: boolean; onCollapsedChange: (value: boolean) => void; onClose: () => void; onNavigate: () => void }) {
  const isCollapsed = collapsed;
  return <aside className={cn("fixed inset-y-0 left-0 z-30 flex flex-col border-r border-white/[0.07] bg-[#080e17] transition-all duration-200 lg:translate-x-0", isCollapsed ? "w-20" : "w-72", mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")}>
    <div className="flex h-[68px] items-center justify-between border-b border-white/[0.07] px-4"><button className="flex min-w-0 items-center gap-3" onClick={() => onCollapsedChange(false)}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/[0.08] text-cyan-300"><ShieldCheck size={19} /></span>{!isCollapsed && <span className="text-left"><span className="block text-sm font-bold tracking-[0.18em] text-white">OSINT<span className="text-cyan-300">-X</span></span><span className="mt-0.5 block text-[9px] uppercase tracking-[0.18em] text-slate-600">Intel platform</span></span>}</button><Button aria-label="Close navigation" className="lg:hidden" size="icon" variant="ghost" onClick={onClose}><X size={17} /></Button></div>
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Primary navigation">{groups.map((group) => <div key={group.label}><p className={cn("mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600", isCollapsed && "text-center text-[8px]")}>{isCollapsed ? group.label.slice(0, 3) : group.label}</p><div className="space-y-1">{group.items.map((item) => <NavLink className={({ isActive }) => cn("group flex items-center gap-3 rounded-md border px-3 py-2.5 text-xs font-medium transition", isActive ? "border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-200 shadow-[inset_3px_0_0_#22d3ee]" : "border-transparent text-slate-500 hover:bg-white/[0.04] hover:text-slate-200", isCollapsed && "justify-center px-2")} key={item.path} title={isCollapsed ? item.label : undefined} to={item.path} onClick={onNavigate}><item.icon size={16} className="shrink-0" />{!isCollapsed && <span className="truncate">{item.label}</span>}</NavLink>)}</div></div>)}</nav>
    <div className="border-t border-white/[0.07] p-3"><div className={cn("flex items-center gap-3 rounded-lg border border-white/[0.07] bg-white/[0.025] p-2.5", isCollapsed && "justify-center")}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-cyan-400/15 text-[10px] font-bold text-cyan-300">AN</span>{!isCollapsed && <div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-300">Analyst workspace</p><p className="truncate text-[10px] text-slate-600">Phase 2 interface</p></div>}</div><Button aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"} className="mt-2 hidden w-full lg:flex" size="sm" variant="ghost" onClick={() => onCollapsedChange(!isCollapsed)}>{isCollapsed ? <ChevronRight size={15} /> : <><ChevronLeft size={15} /> Collapse sidebar</>}</Button></div>
  </aside>;
}

export default AppLayout;
