import { api } from "./api";
import type { SavedSearch, SearchResult, SearchSort, SearchType } from "../types/search";

export interface SearchFilters { q?: string; type?: SearchType; status?: string; investigationId?: string; severity?: string; sort?: SearchSort }
export async function globalSearch(filters: SearchFilters): Promise<{ query: string; total: number; results: SearchResult[] }> { const response = await api.get("/search", { params: filters }); return response.data; }
export async function getSavedSearches(): Promise<{ searches: SavedSearch[] }> { const response = await api.get("/search/saved"); return response.data; }
export async function createSavedSearch(input: { name: string; query?: string; filters?: Record<string, unknown>; sort?: SearchSort; isPinned?: boolean }): Promise<{ search: SavedSearch }> { const response = await api.post("/search/saved", input); return response.data; }
export async function updateSavedSearch(id: string, input: Partial<{ name: string; query: string; filters: Record<string, unknown>; sort: SearchSort; isPinned: boolean }>): Promise<{ search: SavedSearch }> { const response = await api.patch(`/search/saved/${id}`, input); return response.data; }
export async function deleteSavedSearch(id: string): Promise<void> { await api.delete(`/search/saved/${id}`); }
