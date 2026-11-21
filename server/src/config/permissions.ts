export const PERMISSIONS = {
  VIEW_WORKSPACE: "VIEW_WORKSPACE",
  COLLECT_INTELLIGENCE: "COLLECT_INTELLIGENCE",
  EXPORT_REPORTS: "EXPORT_REPORTS",
  DELETE_DATA: "DELETE_DATA",
  MANAGE_USERS: "MANAGE_USERS",
  MANAGE_SYSTEM: "MANAGE_SYSTEM",
} as const;

export type PermissionCode = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export const permissionDefinitions: { code: PermissionCode; description: string }[] = [
  { code: PERMISSIONS.VIEW_WORKSPACE, description: "View workspace data, investigations, findings, and reports" },
  { code: PERMISSIONS.COLLECT_INTELLIGENCE, description: "Create and run intelligence collections" },
  { code: PERMISSIONS.EXPORT_REPORTS, description: "Export and download reports" },
  { code: PERMISSIONS.DELETE_DATA, description: "Delete or archive workspace data" },
  { code: PERMISSIONS.MANAGE_USERS, description: "Invite, disable, and manage tenant users" },
  { code: PERMISSIONS.MANAGE_SYSTEM, description: "Manage system-level configuration" },
];
