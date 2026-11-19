import type { Edge, Node } from "@xyflow/react";

export type GraphEntityType = "PERSON" | "EMAIL" | "USERNAME" | "DOMAIN" | "IP" | "PHONE" | "WEBSITE" | "ORGANIZATION" | "ASN" | "PUBLIC_PROFILE" | "THREAT_INDICATOR" | "LOCATION";
export interface GraphEntity { id: string; type: GraphEntityType; value: string; name: string | null; metadata: Record<string, unknown> | null; findings: Array<{ id: string; title: string; severity: string }>; }
export interface GraphRelationship { id: string; fromEntityId: string; toEntityId: string; type: string; confidence: number | null; sourceReferences: unknown[] | null; evidenceQuality: number | null; corroborationScore: number | null; freshnessScore: number | null; metadata: Record<string, unknown> | null; fromEntity: GraphEntity; toEntity: GraphEntity; evidence: Array<{ id: string; sourceUrl: string | null; title: string | null; contentHash: string | null; collectedAt: string }>; }
export interface GraphResponse { entities: GraphEntity[]; relationships: GraphRelationship[]; }
export type GraphNode = Node<{ entity: GraphEntity }>;
export type GraphEdge = Edge<{ relationship: GraphRelationship }>;
