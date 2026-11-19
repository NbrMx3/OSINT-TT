export interface HealthResponse {
  status: "ok";
  service: string;
  database: "connected";
  timestamp: string;
}
