import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileSearch, Link as LinkIcon, ShieldAlert } from "lucide-react";
import { useAddEvidenceCustody, useCreateInvestigationEvidence, useInvestigation, useInvestigationEvidence, useInvestigationResults } from "../hooks/useInvestigations";
import { EmptyState } from "../components/EmptyState";
import { InvestigationStatusBadge } from "../components/investigations/InvestigationStatusBadge";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { formatDate } from "../utils/format";

function InvestigationResultsPage() {
  const { id } = useParams();
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [findingId, setFindingId] = useState("");
  const [custodyAction, setCustodyAction] = useState("HANDOFF");
  const investigation = useInvestigation(id);
  const results = useInvestigationResults(id);
  const evidenceQuery = useInvestigationEvidence(id);
  const createEvidence = useCreateInvestigationEvidence(id ?? "");
  const addCustody = useAddEvidenceCustody(id ?? "");

  if (investigation.isLoading || results.isLoading || evidenceQuery.isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-64 w-full" /></div>;
  }

  const item = investigation.data?.investigation;
  const evidence = evidenceQuery.data?.evidence ?? [];

  return <div className="mx-auto max-w-5xl space-y-7">
    <section className="border-b border-white/[0.07] pb-6">
      <Link className="mb-4 inline-flex items-center gap-2 text-[10px] font-medium text-slate-500 hover:text-cyan-300" to={`/investigations/${id}`}><ArrowLeft size={13} /> Back to investigation</Link>
      <div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl font-semibold tracking-tight text-white">Investigation results</h2>{item && <InvestigationStatusBadge status={item.status} />}</div>
      <p className="mt-2 text-xs text-slate-500">{item?.name ?? "Investigation"}</p>
    </section>

    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><FileSearch size={16} className="text-cyan-300" /> Saved execution result</CardTitle><CardDescription className="mt-2">Only persisted output from configured intelligence modules is shown here.</CardDescription></CardHeader>
      <CardContent>{results.data?.results ? <pre className="overflow-auto rounded-md border border-white/[0.06] bg-black/20 p-4 font-mono text-[10px] leading-5 text-slate-400">{JSON.stringify(results.data.results, null, 2)}</pre> : <EmptyState title="No saved result summary" description="Start the investigation to create an execution record." />}</CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert size={16} className="text-orange-300" /> Findings</CardTitle><CardDescription className="mt-2">Each finding can be linked to one or more evidence records.</CardDescription></CardHeader>
      <CardContent>{results.data?.findings.length ? <div className="space-y-2">{results.data.findings.map((finding) => <div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3" key={finding.id}><div className="flex items-start justify-between gap-3"><p className="text-xs font-medium text-slate-200">{finding.title}</p><Badge>{finding.severity}</Badge></div><p className="mt-2 text-[10px] leading-5 text-slate-500">{finding.description ?? "No description"}</p><p className="mt-2 text-[9px] text-slate-600">{formatDate(finding.createdAt)} · {finding.status} · {finding.evidence.length} evidence item(s)</p></div>)}</div> : <EmptyState icon={ShieldAlert} title="No intelligence findings" description="Connect real collection modules before findings can be created." />}</CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><LinkIcon size={16} className="text-cyan-300" /> Evidence vault</CardTitle><CardDescription className="mt-2">Record source URLs, capture time, hashes, provenance, and chain of custody.</CardDescription></CardHeader>
      <CardContent>
        <form className="mb-5 grid gap-3 rounded-md border border-white/[0.06] bg-white/[0.02] p-3 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); if (!title.trim()) return; createEvidence.mutate({ title: title.trim(), sourceUrl: sourceUrl.trim() || undefined, findingId: findingId || undefined }, { onSuccess: () => { setTitle(""); setSourceUrl(""); setFindingId(""); } }); }}>
          <input className="rounded-md border border-white/[0.08] bg-black/20 px-3 py-2 text-xs text-slate-200" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Evidence title" required />
          <input className="rounded-md border border-white/[0.08] bg-black/20 px-3 py-2 text-xs text-slate-200" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="Source URL" type="url" />
          <select className="rounded-md border border-white/[0.08] bg-black/20 px-3 py-2 text-xs text-slate-200" value={findingId} onChange={(event) => setFindingId(event.target.value)}>
            <option value="">Unlinked evidence</option>{results.data?.findings.map((finding) => <option key={finding.id} value={finding.id}>{finding.title}</option>)}</select>
          <button className="rounded-md border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-medium text-cyan-200" type="submit" disabled={createEvidence.isPending}>Add evidence</button>
        </form>

        {evidence.length ? <div className="space-y-3">{evidence.map((record) => <div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-3" key={record.id}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-medium text-slate-200">{record.title ?? "Untitled evidence"}</p>{record.finding && <p className="mt-1 text-[9px] text-cyan-400">Finding: {record.finding.title}</p>}</div><Badge>{record.contentHash ? "HASHED" : "SOURCE"}</Badge></div>
          {record.sourceUrl && <a className="mt-2 block break-all text-[10px] text-cyan-300 hover:underline" href={record.sourceUrl} target="_blank" rel="noreferrer">{record.sourceUrl}</a>}
          <p className="mt-2 text-[9px] text-slate-600">Captured {formatDate(record.collectedAt)}{record.contentHash ? ` · SHA-256 ${record.contentHash}` : ""}</p>
          {record.provenance && <pre className="mt-2 overflow-auto text-[9px] text-slate-500">{JSON.stringify(record.provenance, null, 2)}</pre>}
          {record.chainOfCustody?.length ? <div className="mt-3 border-t border-white/[0.06] pt-2"><p className="mb-2 text-[9px] font-medium uppercase tracking-wider text-slate-500">Chain of custody</p>{record.chainOfCustody.map((entry, index) => <p className="text-[9px] text-slate-500" key={`${entry.timestamp}-${index}`}>{formatDate(entry.timestamp)} · {entry.action}{entry.note ? ` · ${entry.note}` : ""}</p>)}</div> : null}
          <div className="mt-3 flex gap-2"><select className="rounded-md border border-white/[0.08] bg-black/20 px-2 py-1 text-[10px] text-slate-300" value={custodyAction} onChange={(event) => setCustodyAction(event.target.value)}><option value="HANDOFF">Handoff</option><option value="TRANSFERRED">Transferred</option><option value="VERIFIED">Verified</option><option value="ACCESSED">Accessed</option></select><button className="rounded-md border border-white/[0.08] px-2 py-1 text-[10px] text-slate-300" type="button" onClick={() => addCustody.mutate({ evidenceId: record.id, action: custodyAction })}>Add custody event</button></div>
        </div>)}</div> : <EmptyState title="No evidence recorded" description="Add a source record to begin a traceable evidence chain." />}
      </CardContent>
    </Card>
  </div>;
}

export default InvestigationResultsPage;
