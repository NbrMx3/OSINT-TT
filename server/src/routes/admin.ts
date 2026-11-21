import { Router } from "express";
import { adminLogin, adminLogout, currentAdmin } from "../controllers/adminAuthController";
import { getAdminDashboard, listAdminActivityLogs } from "../controllers/adminController";
import { optionalAuth } from "../middleware/auth";
import { requireAdminAuth } from "../middleware/auth";

const router = Router();
router.post("/auth/login", adminLogin);
router.post("/auth/logout", optionalAuth, requireAdminAuth, adminLogout);
router.get("/auth/me", requireAdminAuth, currentAdmin);
router.get("/dashboard", requireAdminAuth, getAdminDashboard);
router.get("/activity-logs", requireAdminAuth, listAdminActivityLogs);
export default router;
