import { useCallback, useEffect, useMemo, useState } from "react";
import { Background, Controls, MiniMap, Position, ReactFlow, Handle, useEdgesState, useNodesState } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AlertTriangle, Download, Filter, LoaderCircle, Network, Save, Search, Sparkles, X } from "lucide-react";
import { useCorrelateGraph, useGraph, useSaveGraphLayout } from "../hooks/useGraph";
import type { GraphEdge, GraphEntity, GraphNode, GraphRelationship } from "../types/graph";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { getApiErrorMessage } from "../utils/errors";

const typeColors: Record<string, string> = { DOMAIN: "border-cyan-400/40 bg-cyan-400/10 text-cyan-200", IP: "border-blue-400/40 bg-blue-400/10 text-blue-200", EMAIL: "border-violet-400/40 bg-violet-400/10 text-violet-200", USERNAME: "border-amber-400/40 bg-amber-400/10 text-amber-200", WEBSITE: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200", PUBLIC_PROFILE: "border-fuchsia-400/40 bg-fuchsia-400/10 text-fuchsia-200", THREAT_INDICATOR: "border-rose-400/40 bg-rose-400/10 text-rose-200", ASN: "border-slate-400/40 bg-slate-400/10 text-slate-200" };

function EntityNode({ data }: { data: { entity: GraphEntity } }) {
  const entity = data.entity;
  return <div className={`min-w-[155px] max-w-[210px] rounded-lg border px-3 py-2 shadow-lg shadow-black/20 ${typeColors[entity.type] ?? "border-white/20 bg-white/[0.05] text-slate-200"}`}><Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-0 !bg-cyan-300" /><p className="text-[9px] font-bold uppercase tracking-[0.16em] opacity-70">{entity.type.replace("_", " ")}</p><p className="mt-1 truncate font-mono text-[11px]">{entity.name ?? entity.value}</p><Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-0 !bg-cyan-300" /></div>;
}

const nodeTypes = { entity: EntityNode };

function GraphAnalysisPage() {
  const graph = useGraph();
  const correlate = useCorrelateGraph();
  const saveLayout = useSaveGraphLayout();
  const [nodes, setNodes, onNodesChange] = useNodesState<GraphNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<GraphEdge>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [error, setError] = useState("");
  const selected = graph.data?.entities.find((entity) => entity.id === selectedId);

  useEffect(() => {
    if (!graph.data) return;
    const nextNodes: GraphNode[] = graph.data.entities.map((entity, index) => ({ id: entity.id, type: "entity", position: { x: (index % 5) * 230, y: Math.floor(index / 5) * 130 }, data: { entity } }));
    const nextEdges: GraphEdge[] = graph.data.relationships.map((relationship) => ({ id: relationship.id, source: relationship.fromEntityId, target: relationship.toEntityId, label: `${relationship.type} · ${Math.round((relationship.confidence ?? 0) * 100)}%`, animated: relationship.id === selectedId, data: { relationship }, style: { stroke: relationship.confidence && relationship.confidence >= 0.75 ? "#22d3ee" : "#64748b" }, labelStyle: { fill: "#94a3b8", fontSize: 9 } }));
    setNodes(nextNodes);
    setEdges(nextEdges);
  }, [graph.data, selectedId, setEdges, setNodes]);

  const visibleNodeIds = useMemo(() => new Set((graph.data?.entities ?? []).filter((entity) => (filter === "ALL" || entity.type === filter) && (!query || `${entity.type} ${entity.value} ${entity.name ?? ""}`.toLowerCase().includes(query.toLowerCase()))).map((entity) => entity.id)), [filter, graph.data?.entities, query]);
  const displayNodes = nodes.map((node) => ({ ...node, hidden: !visibleNodeIds.has(node.id) }));
  const displayEdges = edges.map((edge) => ({ ...edge, hidden: !visibleNodeIds.has(edge.source) || !visibleNodeIds.has(edge.target) }));

  const runCorrelation = async () => { setError(""); try { await correlate.mutateAsync(undefined); } catch (reason) { setError(getApiErrorMessage(reason, "Correlation failed.")); } };
  const save = async () => { setError(""); try { await saveLayout.mutateAsync({ name: `Graph layout ${new Date().toLocaleString()}`, nodes, edges }); } catch (reason) { setError(getApiErrorMessage(reason, "Unable to save graph layout.")); } };
  const exportGraph = useCallback(() => { if (!graph.data) return; const blob = new Blob([JSON.stringify(graph.data, null, 2)], { type: "application/json" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "osint-x-graph.json"; link.click(); URL.revokeObjectURL(link.href); }, [graph.data]);

  return <div className="mx-auto max-w-[1550px] space-y-5"><section className="flex flex-col justify-between gap-4 border-b border-white/[0.07] pb-5 lg:flex-row lg:items-end"><div><p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300"><Network size={14} /> Analysis / Graph</p><h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Intelligence graph</h2><p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500">Explore attributed relationships across collected intelligence. Confidence reflects source reliability, evidence quality, corroboration, and freshness; shared identifiers never establish common ownership.</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={runCorrelation} disabled={correlate.isPending}><Sparkles size={14} />{correlate.isPending ? "Correlating..." : "Run correlation"}</Button><Button variant="outline" onClick={save} disabled={saveLayout.isPending}><Save size={14} />Save layout</Button><Button variant="outline" onClick={exportGraph}><Download size={14} />Export JSON</Button></div></section>
    {error && <div className="flex items-center gap-2 rounded-md border border-rose-400/20 bg-rose-400/[0.08] px-4 py-3 text-xs text-rose-200"><AlertTriangle size={15} />{error}<button className="ml-auto" onClick={() => setError("")}><X size={14} /></button></div>}
    <div className="grid gap-4 lg:grid-cols-1 xl:grid-cols-[1fr_290px]"><Card className="min-h-[520px] overflow-hidden sm:min-h-[620px] xl:min-h-[680px]"><CardHeader className="border-b border-white/[0.06] pb-4"><div className="flex flex-col gap-3 md:flex-row md:items-center"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 text-slate-600" size={14} /><Input className="pl-9" placeholder="Search entities..." value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="flex items-center gap-2"><Filter size={14} className="text-slate-500" /><select className="h-9 rounded-md border border-white/10 bg-[#0b121c] px-3 text-xs text-slate-300" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="ALL">All entity types</option>{["DOMAIN", "IP", "EMAIL", "USERNAME", "WEBSITE", "PUBLIC_PROFILE", "ASN", "THREAT_INDICATOR"].map((type) => <option key={type} value={type}>{type.replace("_", " ")}</option>)}</select></div></div></CardHeader><div className="h-[430px] bg-[#070d15] sm:h-[520px] xl:h-[590px]"><ReactFlow nodes={displayNodes} edges={displayEdges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onNodeClick={(_, node) => setSelectedId(node.id)} nodeTypes={nodeTypes} fitView proOptions={{ hideAttribution: true }}><Background color="#1e3a4a" gap={24} size={1} /><Controls /><MiniMap nodeColor={(node) => (node.data as { entity?: GraphEntity } | undefined)?.entity?.type === "THREAT_INDICATOR" ? "#fb7185" : "#22d3ee"} maskColor="rgba(3,8,15,0.75)" /></ReactFlow></div></Card>
      <Card><CardHeader><CardTitle>Graph intelligence</CardTitle><CardDescription className="mt-2">Select a node to inspect attribution and supporting evidence.</CardDescription></CardHeader><CardContent className="space-y-4">{graph.isLoading ? <div className="flex items-center gap-2 text-xs text-slate-500"><LoaderCircle className="animate-spin" size={14} />Loading graph...</div> : <><div className="grid grid-cols-2 gap-2"><Metric label="Entities" value={graph.data?.entities.length ?? 0} /><Metric label="Relationships" value={graph.data?.relationships.length ?? 0} /></div>{selected ? <EntityDetail entity={selected} relationships={(graph.data?.relationships ?? []).filter((relationship) => relationship.fromEntityId === selected.id || relationship.toEntityId === selected.id)} /> : <p className="rounded-md border border-dashed border-white/10 p-4 text-[11px] leading-5 text-slate-500">No entity selected. Drag nodes to arrange the graph, zoom or pan to navigate, and use filters to focus the investigation.</p>}</>}</CardContent></Card></div>
  </div>;
}

function EntityDetail({ entity, relationships }: { entity: GraphEntity; relationships: GraphRelationship[] }) { return <div className="space-y-3 border-t border-white/[0.07] pt-4"><div><Badge className={typeColors[entity.type]}>{entity.type.replace("_", " ")}</Badge><p className="mt-2 break-all font-mono text-xs text-slate-200">{entity.value}</p></div><div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-600">Related entities</p>{relationships.length ? <div className="mt-2 space-y-2">{relationships.map((relationship) => <div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-2" key={relationship.id}><div className="flex justify-between gap-2 text-[10px] text-slate-300"><span>{relationship.type}</span><span className="text-cyan-300">{Math.round((relationship.confidence ?? 0) * 100)}%</span></div><p className="mt-1 text-[9px] text-slate-500">{relationship.fromEntityId === entity.id ? relationship.toEntity.value : relationship.fromEntity.value}</p><p className="mt-1 text-[9px] text-slate-600">{relationship.sourceReferences?.length ?? 0} source reference(s) · {relationship.evidence.length} evidence item(s)</p></div>)}</div> : <p className="mt-2 text-[10px] text-slate-500">No relationships recorded.</p>}</div><p className="text-[10px] leading-4 text-amber-200/70">A relationship is an investigative lead, not proof of shared identity or control.</p></div>; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-md border border-white/[0.06] bg-white/[0.02] p-2"><p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">{label}</p><p className="mt-1 text-lg font-semibold text-slate-200">{value}</p></div>; }

export default GraphAnalysisPage;
