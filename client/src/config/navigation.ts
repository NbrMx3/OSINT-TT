import type { LucideIcon } from "lucide-react";
import { BarChart3, Crosshair, FileText, Globe2, Hash, Mail, Network, Phone, Search, Settings, ShieldAlert, UserRound, Users, Wifi } from "lucide-react";

export interface NavigationItem { label: string; path: string; icon: LucideIcon; description: string; requiredPermission?: string; }
export interface NavigationGroup { label: string; items: NavigationItem[]; }

export const navigationGroups: NavigationGroup[] = [
  { label: "Workspace", items: [{ label: "Overview", path: "/dashboard", icon: BarChart3, description: "Command center overview" }, { label: "Investigations", path: "/investigations", icon: Crosshair, description: "Manage intelligence cases" }] },
  { label: "Intelligence", items: [
    { label: "People Intelligence", path: "/people", icon: Users, description: "Identity and person research" }, { label: "Email Intelligence", path: "/email", icon: Mail, description: "Email exposure and analysis" }, { label: "Username Intelligence", path: "/username", icon: Hash, description: "Username correlation" }, { label: "Domain Intelligence", path: "/domain", icon: Globe2, description: "Domain and DNS research" }, { label: "IP Intelligence", path: "/ip", icon: Wifi, description: "IP reputation and infrastructure" }, { label: "Phone Intelligence", path: "/phone", icon: Phone, description: "Phone number research" }, { label: "Website Intelligence", path: "/website", icon: Search, description: "Website technology and posture" }, { label: "Social Intelligence", path: "/social", icon: UserRound, description: "Social footprint analysis" }, { label: "Threat Intelligence", path: "/threats", icon: ShieldAlert, description: "Threat indicators and risk" },
  ] },
  { label: "Analysis", items: [{ label: "Graph Analysis", path: "/graph", icon: Network, description: "Explore entity relationships" }, { label: "Reports", path: "/reports", icon: FileText, description: "Produce intelligence reports" }] },
  { label: "System", items: [{ label: "User management", path: "/users", icon: Users, description: "Invite and manage workspace users", requiredPermission: "MANAGE_USERS" }, { label: "Settings", path: "/settings", icon: Settings, description: "Workspace configuration" }] },
];

export const allNavigationItems = navigationGroups.flatMap((group) => group.items);
export function getNavigationItem(pathname: string): NavigationItem | undefined { return allNavigationItems.find((item) => item.path === pathname); }
