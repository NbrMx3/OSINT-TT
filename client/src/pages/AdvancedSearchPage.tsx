import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Filter, Search, Trash2 } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { createSavedSearch, deleteSavedSearch, getSavedSearches, globalSearch } from "../services/searchService";
import type { SavedSearch, SearchResult, SearchSort, SearchType } from "../types/search";
import { formatDate } from "../utils/format";

const types: Array<SearchType | ""> = ["", "USER", "INVESTIGATION", "ENTITY", "FINDING", "REPORT", "EVIDENCE"];

export default function AdvancedSearchPage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<SearchType | "">("");
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [sort, setSort] = useState<SearchSort>("UPDATED_DESC");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [saved, setSaved] = useState<SavedSearch[]>([]);
  const [saveName, setSaveName] = useState("");
  const [loading, setLoading] = useState(false);

  async function runSearch() {
    setLoading(true);
    try { const response = await globalSearch({ q: query || undefined, type: type || undefined, status: status || undefined, severity: severity || undefined, sort }); setResults(response.results); } finally { setLoading(false); }
  }
  async function refreshSaved() { const response = await getSavedSearches(); setSaved(response.searches); }

  useEffect(() => { void runSearch(); void refreshSaved(); }, []);
  useEffect(() => { const timeout = window.setTimeout(() => void runSearch(), 300); return () => window.clearTimeout(timeout); }, [query, type, status, severity, sort]);

  async function saveSearch() {
    if (!saveName.trim()) return;
    await createSavedSearch({ name: saveName.trim(), query: query || undefined, filters: { type: type || undefined, status: status || undefined, severity: severity || undefined }, sort, isPinned: true });
    setSaveName(""); await refreshSaved();
  }
  function applySaved(item: SavedSearch) {
    setQuery(item.query ?? ""); setSort(item.sort);
    const filters = item.filters ?? {};
    setType(typeof filters.type === "string" ? filters.type as SearchType : "");
    setStatus(typeof filters.status === "string" ? filters.status : "");
    setSeverity(typeof filters.severity === "string" ? filters.severity : "");
  }
  async function removeSaved(id: string) { await deleteSavedSearch(id); await refreshSaved(); }

  return <div className="mx-auto max-w-6xl space-y-7">
    <section className="border-b border-white/[0.07] pb-6"><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300">Workspace discovery</p><h2 className="text-2xl font-semibold tracking-tight text-white">Advanced search</h2><p className="mt-2 text-xs text-slate-500">Search users, investigations, entities, findings, reports, and evidence.</p></section>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Search size={16} className="text-cyan-300" /> Global search</CardTitle><CardDescription className="mt-2">Apply filters and sorting, then save a recurring view.</CardDescription></CardHeader><CardContent>
      <div className="grid gap-3 md:grid-cols-[1fr_150px_140px_140px_170px]">
        <Input autoFocus placeholder="Search workspace records..." value={query} onChange={(event) => setQuery(event.target.value)} />
        <select aria-label="Record type" className="h-9 rounded-md border border-white/10 bg-white/[0.03] px-2 text-xs text-slate-300" value={type} onChange={(event) => setType(event.target.value as SearchType | "")}>{types.map((item) => <option className="bg-[#0b121c]" key={item || "ALL"} value={item}>{item || "All types"}</option>)}</select>
        <Input placeholder="Status" value={status} onChange={(event) => setStatus(event.target.value)} />
        <select aria-label="Severity" className="h-9 rounded-md border border-white/10 bg-white/[0.03] px-2 text-xs text-slate-300" value={severity} onChange={(event) => setSeverity(event.target.value)}><option value="">All severity</option>{["LOW","MEDIUM","HIGH","CRITICAL"].map((item) => <option className="bg-[#0b121c]" key={item} value={item}>{item}</option>)}</select>
        <select aria-label="Sort" className="h-9 rounded-md border border-white/10 bg-white/[0.03] px-2 text-xs text-slate-300" value={sort} onChange={(event) => setSort(event.target.value as SearchSort)}><option value="UPDATED_DESC">Updated: newest</option><option value="UPDATED_ASC">Updated: oldest</option><option value="CREATED_DESC">Created: newest</option><option value="CREATED_ASC">Created: oldest</option><option value="NAME_ASC">Name: A-Z</option></select>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row"><div className="flex flex-1 gap-2"><Input placeholder="Saved view name" value={saveName} onChange={(event) => setSaveName(event.target.value)} /><Button disabled={!saveName.trim()} variant="outline" onClick={() => void saveSearch()}><Bookmark size={14} /> Save view</Button></div></div>
    </CardContent></Card>

    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Filter size={15} className="text-cyan-300" /> Saved views</CardTitle></CardHeader><CardContent className="space-y-2">{saved.length ? saved.map((item) => <div className="flex items-center gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] p-2" key={item.id}><button className="min-w-0 flex-1 text-left" type="button" onClick={() => applySaved(item)}><p className="truncate text-xs text-slate-300">{item.name}</p><p className="mt-1 truncate text-[9px] text-slate-600">{item.query || "All records"}</p></button><Button aria-label={`Delete saved search ${item.name}`} size="icon" variant="ghost" onClick={() => void removeSaved(item.id)}><Trash2 size={13} /></Button></div>) : <p className="py-6 text-center text-[10px] text-slate-600">No saved views.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Results</CardTitle><CardDescription className="mt-2">{loading ? "Searching..." : `${results.length} matching record(s)`}</CardDescription></CardHeader><CardContent className="space-y-2">{results.length ? results.map((item) => <Link className="block rounded-md border border-white/[0.06] bg-white/[0.02] p-3 transition hover:border-cyan-400/20 hover:bg-cyan-400/[0.03]" key={`${item.type}-${item.id}`} to={item.url}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-medium text-slate-200">{item.title}</p>{item.subtitle && <p className="mt-1 truncate text-[10px] text-slate-600">{item.subtitle}</p>}</div><Badge>{item.type}</Badge></div><p className="mt-2 text-[9px] text-slate-600">{item.status ?? "NO STATUS"} · {formatDate(item.updatedAt)}</p></Link>) : <p className="py-10 text-center text-xs text-slate-600">No matching records.</p>}</CardContent></Card>
    </div>
  </div>;
}
