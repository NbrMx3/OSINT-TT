export interface Admin { id: string; email: string; name: string; mfaEnabled: boolean; }

export interface AdminActivityLog {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { name: string; email: string } | null;
  tenant: { name: string; slug: string } | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  chainIndex: number | null;
  integrityHash: string | null;
  investigation: { id: string; name: string } | null;
}

export interface AdminDashboardData {
  metrics: { users: number; activeUsers: number; tenants: number; investigations: number; activityLogs: number };
  investigationStatuses: { status: string; count: number }[];
  recentActivity: AdminActivityLog[];
  recentUsers: { id: string; name: string; email: string; isActive: boolean; createdAt: string; tenant: { name: string }; role: { name: string } }[];
  recentTenants: { id: string; name: string; slug: string; createdAt: string; _count: { users: number; investigations: number } }[];
}

export interface AdminActivityResponse { items: AdminActivityLog[]; page: number; pageSize: number; total: number; pages: number; }
