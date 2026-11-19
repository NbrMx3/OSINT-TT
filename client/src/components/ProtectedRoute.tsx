import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Skeleton } from "./ui/skeleton";

export function ProtectedRoute() { const { isLoading, isAuthenticated } = useAuth(); const location = useLocation(); if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-[#060a10]"><Skeleton className="h-10 w-48" /></div>; if (!isAuthenticated) return <Navigate replace state={{ from: location.pathname }} to="/login" />; return <Outlet />; }
export function PublicOnlyRoute() { const { isLoading, isAuthenticated } = useAuth(); if (isLoading) return <div className="flex min-h-screen items-center justify-center bg-[#060a10]"><Skeleton className="h-10 w-48" /></div>; if (isAuthenticated) return <Navigate replace to="/dashboard" />; return <Outlet />; }
