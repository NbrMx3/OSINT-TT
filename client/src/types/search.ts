export type SearchType = "USER" | "INVESTIGATION" | "ENTITY" | "FINDING" | "REPORT" | "EVIDENCE";
export type SearchSort = "UPDATED_DESC" | "UPDATED_ASC" | "CREATED_DESC" | "CREATED_ASC" | "NAME_ASC";
export interface SearchResult { id: string; type: SearchType; title: string; subtitle: string | null; status: string | null; url: string; updatedAt: string; createdAt: string }
export interface SavedSearch { id: string; name: string; query: string | null; filters: Record<string, unknown> | null; sort: SearchSort; isPinned: boolean; createdAt: string; updatedAt: string }
