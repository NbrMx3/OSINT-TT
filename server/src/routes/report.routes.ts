import { Router } from "express";
import rateLimit from "express-rate-limit";
import { create, detail, exportData, list, pdf, remove } from "../controllers/report.controller";
import { requireAuth } from "../middleware/auth";
import { authorizePermissions } from "../middleware/auth";
import { PERMISSIONS } from "../config/permissions";

const router = Router();
router.use(rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false }), requireAuth);
router.get("/", authorizePermissions(PERMISSIONS.VIEW_WORKSPACE), list);
router.post("/", authorizePermissions(PERMISSIONS.EXPORT_REPORTS), create);
router.get("/:id", authorizePermissions(PERMISSIONS.VIEW_WORKSPACE), detail);
router.get("/:id/pdf", authorizePermissions(PERMISSIONS.EXPORT_REPORTS), pdf);
router.get("/:id/export", authorizePermissions(PERMISSIONS.EXPORT_REPORTS), exportData);
router.delete("/:id", authorizePermissions(PERMISSIONS.DELETE_DATA), remove);
export default router;
