import PDFDocument from "pdfkit";
import { FindingStatus, Prisma, ReportStatus, Severity } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/appError";

type ReportFilters = { search?: string; status?: ReportStatus; investigationId?: string };

export async function generateReport(input: { tenantId: string; authorId: string; investigationId: string; title?: string; template?: "STANDARD" | "EXECUTIVE" | "TECHNICAL"; branding?: Record<string, unknown> }) {
  const investigation = await prisma.investigation.findFirst({
    where: { id: input.investigationId, tenantId: input.tenantId },
    include: {
      owner: { select: { id: true, name: true, email: true } }, targets: true, notes: { include: { author: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" } },
      findings: { include: { createdBy: { select: { name: true, email: true } }, evidence: true }, orderBy: { createdAt: "asc" } },
      domainResults: { include: { evidence: true }, orderBy: { collectedAt: "asc" } },
      ipResults: { include: { evidence: true }, orderBy: { collectedAt: "asc" } },
      emailResults: { include: { evidence: true }, orderBy: { collectedAt: "asc" } },
      usernameResults: { include: { evidence: true }, orderBy: { collectedAt: "asc" } },
      websiteResults: { include: { evidence: true }, orderBy: { collectedAt: "asc" } },
      socialResults: { include: { evidence: true }, orderBy: { collectedAt: "asc" } },
      threatResults: { include: { evidence: true }, orderBy: { collectedAt: "asc" } },
    },
  });
  if (!investigation) throw new AppError(404, "Investigation not found", "INVESTIGATION_NOT_FOUND");
  const graph = await prisma.entity.findMany({ where: { tenantId: input.tenantId, investigationId: input.investigationId }, include: { relationshipsFrom: { include: { toEntity: true } }, relationshipsTo: { include: { fromEntity: true } } } });
  const template = input.template ?? "STANDARD";
  const content = buildReportContent(investigation, graph, input.title, template, input.branding);
  const pdfData = await renderPdf(content);
  return prisma.report.create({
    data: {
      tenantId: input.tenantId, investigationId: input.investigationId, authorId: input.authorId, title: content.title,
      content: content as unknown as Prisma.InputJsonValue, pdfData: new Uint8Array(pdfData), generatedAt: new Date(), investigationDate: investigation.createdAt,
      scope: { targets: investigation.targets, selectedModules: investigation.selectedModules } as unknown as Prisma.InputJsonValue,
      template, branding: input.branding as Prisma.InputJsonValue | undefined, executiveSummary: content.executiveSummary, evidenceAppendix: content.evidenceAppendix as unknown as Prisma.InputJsonValue,
      searchText: `${content.title} ${investigation.name} ${investigation.description ?? ""}`.slice(0, 4000), status: ReportStatus.FINAL,
    },
    select: { id: true, title: true, status: true, createdAt: true, updatedAt: true, generatedAt: true, investigationId: true },
  });
}

export async function listReports(tenantId: string, filters: ReportFilters) {
  return prisma.report.findMany({ where: { tenantId, ...(filters.status ? { status: filters.status } : {}), ...(filters.investigationId ? { investigationId: filters.investigationId } : {}), ...(filters.search ? { searchText: { contains: filters.search, mode: "insensitive" } } : {}) }, select: { id: true, title: true, status: true, createdAt: true, updatedAt: true, generatedAt: true, investigationId: true, investigation: { select: { id: true, name: true, category: true, status: true } }, author: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
}

export async function getReport(tenantId: string, id: string) {
  const report = await prisma.report.findFirst({ where: { id, tenantId }, select: { id: true, title: true, status: true, content: true, createdAt: true, updatedAt: true, generatedAt: true, investigationId: true } });
  if (!report) throw new AppError(404, "Report not found", "REPORT_NOT_FOUND");
  return report;
}

export async function getReportPdf(tenantId: string, id: string) {
  const report = await prisma.report.findFirst({ where: { id, tenantId }, select: { id: true, title: true, pdfData: true } });
  if (!report?.pdfData) throw new AppError(404, "PDF report not found", "REPORT_PDF_NOT_FOUND");
  return report;
}

export async function listReportSchedules(tenantId: string) { return prisma.reportSchedule.findMany({ where: { tenantId }, include: { investigation: { select: { id: true, name: true } } }, orderBy: { nextRunAt: "asc" } }); }

export async function createReportSchedule(input: { tenantId: string; createdById: string; investigationId: string; name: string; template?: "STANDARD" | "EXECUTIVE" | "TECHNICAL"; frequency?: "DAILY" | "WEEKLY" | "MONTHLY"; titleTemplate?: string; branding?: Record<string, unknown>; enabled?: boolean }) {
  const investigation = await prisma.investigation.findFirst({ where: { id: input.investigationId, tenantId: input.tenantId }, select: { id: true } });
  if (!investigation) throw new AppError(404, "Investigation not found", "INVESTIGATION_NOT_FOUND");
  const nextRunAt = nextScheduleDate(input.frequency ?? "WEEKLY", new Date());
  return prisma.reportSchedule.create({ data: { tenantId: input.tenantId, createdById: input.createdById, investigationId: input.investigationId, name: input.name, template: input.template ?? "STANDARD", frequency: input.frequency ?? "WEEKLY", titleTemplate: input.titleTemplate, branding: input.branding as Prisma.InputJsonValue | undefined, enabled: input.enabled ?? true, nextRunAt }, include: { investigation: { select: { id: true, name: true } } } });
}

export async function updateReportSchedule(tenantId: string, id: string, input: { name?: string; template?: "STANDARD" | "EXECUTIVE" | "TECHNICAL"; frequency?: "DAILY" | "WEEKLY" | "MONTHLY"; titleTemplate?: string; branding?: Record<string, unknown>; enabled?: boolean }) {
  const schedule = await prisma.reportSchedule.findFirst({ where: { id, tenantId } });
  if (!schedule) throw new AppError(404, "Report schedule not found", "REPORT_SCHEDULE_NOT_FOUND");
  return prisma.reportSchedule.update({ where: { id }, data: { ...(input.name !== undefined ? { name: input.name } : {}), ...(input.template !== undefined ? { template: input.template } : {}), ...(input.frequency !== undefined ? { frequency: input.frequency, nextRunAt: nextScheduleDate(input.frequency, new Date()) } : {}), ...(input.titleTemplate !== undefined ? { titleTemplate: input.titleTemplate } : {}), ...(input.branding !== undefined ? { branding: input.branding as Prisma.InputJsonValue } : {}), ...(input.enabled !== undefined ? { enabled: input.enabled } : {}) }, include: { investigation: { select: { id: true, name: true } } } });
}

export async function deleteReportSchedule(tenantId: string, id: string) { const schedule = await prisma.reportSchedule.findFirst({ where: { id, tenantId }, select: { id: true } }); if (!schedule) throw new AppError(404, "Report schedule not found", "REPORT_SCHEDULE_NOT_FOUND"); await prisma.reportSchedule.delete({ where: { id } }); }

export async function runDueReportSchedules(): Promise<number> {
  const due = await prisma.reportSchedule.findMany({ where: { enabled: true, nextRunAt: { lte: new Date() } }, take: 100 });
  for (const schedule of due) {
    try {
      await generateReport({ tenantId: schedule.tenantId, authorId: schedule.createdById, investigationId: schedule.investigationId, title: schedule.titleTemplate?.trim() || undefined, template: schedule.template as "STANDARD" | "EXECUTIVE" | "TECHNICAL", branding: record(schedule.branding) });
      await prisma.reportSchedule.update({ where: { id: schedule.id }, data: { lastRunAt: new Date(), nextRunAt: nextScheduleDate(schedule.frequency, new Date()) } });
    } catch (error) { console.error("Scheduled report generation failed", schedule.id, error); }
  }
  return due.length;
}

export async function deleteReport(tenantId: string, id: string) {
  const report = await prisma.report.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!report) throw new AppError(404, "Report not found", "REPORT_NOT_FOUND");
  await prisma.report.delete({ where: { id: report.id } });
}

export async function exportReport(tenantId: string, id: string, format: "json" | "csv") {
  const report = await prisma.report.findFirst({ where: { id, tenantId }, select: { id: true, title: true, content: true, createdAt: true } });
  if (!report) throw new AppError(404, "Report not found", "REPORT_NOT_FOUND");
  if (format === "json") return { filename: `${safeFilename(report.title)}.json`, contentType: "application/json", body: JSON.stringify(report.content ?? {}, null, 2) };
  const content = (report.content ?? {}) as Record<string, unknown>;
  const findings = Array.isArray(content.findings) ? content.findings : [];
  const evidenceAppendix = Array.isArray(content.evidenceAppendix) ? content.evidenceAppendix : [];
  const rows = [["reportId", "title", "rowType", "finding", "severity", "status", "confidence", "sourceUrl", "contentHash", "evidenceTitle"], ...findings.map((finding) => {
    const item = record(finding);
    return [report.id, report.title, "FINDING", string(item.title ?? item.description), string(item.severity), string(item.status), string(item.confidence ?? ""), "", "", ""];
  }), ...evidenceAppendix.map((evidenceRecord) => { const item = record(evidenceRecord); return [report.id, report.title, "EVIDENCE", "", "", "", "", string(item.sourceUrl), string(item.contentHash), string(item.title ?? "")]; })];
  return { filename: `${safeFilename(report.title)}.csv`, contentType: "text/csv", body: rows.map((row) => row.map(csvEscape).join(",")).join("\r\n") };
}

function buildReportContent(investigation: any, graph: any[], title?: string, template: "STANDARD" | "EXECUTIVE" | "TECHNICAL" = "STANDARD", branding?: Record<string, unknown>) {
  const findings = (investigation.findings ?? []).map((finding: any) => ({ id: finding.id, title: finding.title, description: finding.description, severity: finding.severity, status: finding.status, confidence: typeof finding.metadata?.confidence === "number" ? finding.metadata.confidence : null, createdAt: finding.createdAt, evidence: finding.evidence.map((item: any) => evidence(item)), createdBy: finding.createdBy }));
  const collections = [
    ...investigation.domainResults.map((item: any) => ({ category: "Domain", indicator: item.domain, data: item.data, collectedAt: item.collectedAt, evidence: item.evidence.map(evidence) })),
    ...investigation.ipResults.map((item: any) => ({ category: "IP", indicator: item.ip, data: item.data, collectedAt: item.collectedAt, evidence: item.evidence.map(evidence) })),
    ...investigation.emailResults.map((item: any) => ({ category: "Email", indicator: item.email, data: item.data, collectedAt: item.collectedAt, evidence: item.evidence.map(evidence) })),
    ...investigation.usernameResults.map((item: any) => ({ category: "Username", indicator: item.username, data: item.data, collectedAt: item.collectedAt, evidence: item.evidence.map(evidence) })),
    ...investigation.websiteResults.map((item: any) => ({ category: "Website", indicator: item.url, data: item.data, collectedAt: item.collectedAt, evidence: item.evidence.map(evidence) })),
    ...investigation.socialResults.map((item: any) => ({ category: "Social", indicator: item.username, data: item.data, collectedAt: item.collectedAt, evidence: item.evidence.map(evidence) })),
    ...investigation.threatResults.map((item: any) => ({ category: "Threat", indicator: item.indicator, data: item.data, collectedAt: item.collectedAt, evidence: item.evidence.map(evidence) })),
  ];
  const relationships = graph.flatMap((entity) => entity.relationshipsFrom.map((relationship: any) => ({ from: entity.value, to: relationship.toEntity.value, type: relationship.type, confidence: relationship.confidence, sourceReferences: relationship.sourceReferences })));
  const evidenceAppendix = findings.flatMap((finding: any) => finding.evidence.map((item: any) => ({ findingId: finding.id, findingTitle: finding.title, ...item }))).concat(collections.flatMap((item: any) => item.evidence.map((record: any) => ({ collection: item.category, indicator: item.indicator, ...record }))));
  return {
    title: title?.trim() || `OSINT-X Intelligence Report: ${investigation.name}`, generatedAt: new Date().toISOString(), investigation: { id: investigation.id, title: investigation.name, date: investigation.createdAt, status: investigation.status, category: investigation.category, owner: investigation.owner, scope: { description: investigation.description, targets: investigation.targets, selectedModules: investigation.selectedModules } },
    executiveSummary: `This report summarizes records collected for ${investigation.name}. It presents source-attributed observations and investigative leads; it does not establish unsupported identity, intent, ownership, or attribution conclusions.`,
    template, branding: branding ?? { organization: "OSINT-X", accentColor: "#0891b2" }, evidenceAppendix,
    findings, collections, relationships, notes: investigation.notes.map((note: any) => ({ author: note.author, content: note.content, createdAt: note.createdAt })),
    limitations: ["Provider availability and collection time affect completeness.", "Confidence values describe source-supported observations, not certainty of identity or intent.", "Shared identifiers and infrastructure are investigative leads, not proof of common ownership."],
    conclusions: "No conclusion beyond the source-attributed observations in this report should be treated as established without independent corroboration.",
  };
}

function renderPdf(content: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ margin: 48, size: "A4" });
    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
    const brand = record(content.branding);
    const accent = typeof brand.accentColor === "string" ? brand.accentColor : "#0891b2";
    const organization = typeof brand.organization === "string" ? brand.organization : "OSINT-X";
    document.fillColor(accent).fontSize(22).text(organization, { align: "right" }).moveDown(0.8);
    document.fontSize(18).text(content.title).fontSize(9).fillColor("#475569").text(`Investigation ID: ${content.investigation.id}`).text(`Investigation date: ${new Date(content.investigation.date).toLocaleString()}`).text(`Generated: ${new Date(content.generatedAt).toLocaleString()}`).moveDown();
    section(document, "Executive summary", content.executiveSummary);
    section(document, "Investigation scope", JSON.stringify(content.investigation.scope, null, 2));
    section(document, "Findings", content.findings.length ? content.findings.map((finding: any) => `${finding.title} [${finding.severity}] - ${finding.description ?? "No description"}${finding.confidence === null ? "" : ` (confidence: ${finding.confidence})`}`).join("\n") : "No findings were recorded.");
    section(document, "Intelligence collections", content.collections.length ? content.collections.map((item: any) => `${item.category}: ${item.indicator} | collected ${new Date(item.collectedAt).toLocaleString()} | evidence ${item.evidence.length}`).join("\n") : "No intelligence collection records were recorded.");
    section(document, "Relationship graph", content.relationships.length ? content.relationships.map((item: any) => `${item.from} --${item.type}--> ${item.to} | confidence ${item.confidence ?? "not scored"}`).join("\n") : "No relationship records were recorded.");
    section(document, "Analyst notes", content.notes.length ? content.notes.map((note: any) => `${note.author?.name ?? "Analyst"} (${new Date(note.createdAt).toLocaleString()}): ${note.content}`).join("\n") : "No analyst notes were recorded.");
    section(document, "Evidence appendix", content.evidenceAppendix?.length ? content.evidenceAppendix.map((item: any, index: number) => `Evidence ${index + 1}: ${item.title ?? item.sourceUrl ?? item.id ?? "Recorded evidence"}\nSource: ${item.sourceUrl ?? "Not provided"}\nSHA-256: ${item.contentHash ?? "Not hashed"}\nCaptured: ${item.collectedAt ? new Date(item.collectedAt).toLocaleString() : "Not provided"}${item.findingTitle ? `\nLinked finding: ${item.findingTitle}` : ""}${item.collection ? `\nCollection: ${item.collection} · ${item.indicator}` : ""}`).join("\n\n") : "No evidence records were attached.");
    section(document, "Limitations", content.limitations.join("\n"));
    section(document, "Conclusions", content.conclusions);
    document.fillColor("#64748b").fontSize(8).text(`${organization} | ${content.template ?? "STANDARD"} · Source-attributed intelligence reporting`, 48, 770, { align: "center" });
    document.end();
  });
}
function section(document: PDFKit.PDFDocument, title: string, text: string) { document.moveDown(0.6).fillColor("#0891b2").fontSize(12).text(title).moveDown(0.2).fillColor("#334155").fontSize(9).text(text, { lineGap: 2 }); }
function evidence(item: any) { return { id: item.id, sourceUrl: item.sourceUrl, title: item.title, contentHash: item.contentHash, collectedAt: item.collectedAt }; }
function record(value: unknown): Record<string, any> { return typeof value === "object" && value !== null ? value as Record<string, any> : {}; }
function string(value: unknown) { return typeof value === "string" ? value : ""; }
function csvEscape(value: string) { return `"${value.replace(/"/g, "\"\"")}"`; }
function nextScheduleDate(frequency: string, from: Date): Date { const next = new Date(from); if (frequency === "DAILY") next.setDate(next.getDate() + 1); else if (frequency === "MONTHLY") next.setMonth(next.getMonth() + 1); else next.setDate(next.getDate() + 7); return next; }

function safeFilename(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "osint-x-report"; }
