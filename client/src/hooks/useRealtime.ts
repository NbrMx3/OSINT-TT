import { useEffect, useState } from "react";

export interface RealtimeSnapshot {
  timestamp: string;
  health: { status: "ok" | "degraded"; database: "connected" | "disconnected" };
  investigations: Array<{ id: string; name: string; status: string; progress: number; failureReason: string | null; updatedAt: string }>;
  jobs: Array<{ id: string; investigationId: string; status: string; progress: number; currentStage: string | null; errorMessage: string | null }>;
  sources: Array<{ id: string; name: string; type: string; status: string; lastSyncAt: string | null }>;
  notifications: Array<{ id: string; title: string; description: string; timestamp: string; severity: string }>;
}

export function useRealtime() {
  const [snapshot, setSnapshot] = useState<RealtimeSnapshot | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL ?? "/api";
    const eventSource = new EventSource(`${apiBase.replace(/\/$/, "")}/realtime/stream`, { withCredentials: true });
    const onSnapshot = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as RealtimeSnapshot;
        setSnapshot(data);
        setConnected(true);
        window.dispatchEvent(new CustomEvent("osint-realtime-snapshot", { detail: data }));
      } catch {
        // Ignore malformed stream payloads.
      }
    };
    eventSource.addEventListener("snapshot", onSnapshot);
    eventSource.onopen = () => setConnected(true);
    eventSource.onerror = () => setConnected(false);
    return () => eventSource.close();
  }, []);

  return { snapshot, connected };
}
