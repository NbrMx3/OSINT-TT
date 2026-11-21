import { Router } from "express";
import rateLimit from "express-rate-limit";
import { correlate, entity, graph, layouts, relationship } from "../controllers/graph.controller";
import { authorizePermissions, requireAuth } from "../middleware/auth";
import { PERMISSIONS } from "../config/permissions";

const router = Router();
router.use(rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false }));
router.use(requireAuth);
router.get("/", authorizePermissions(PERMISSIONS.VIEW_WORKSPACE), graph);
router.post("/correlate", authorizePermissions(PERMISSIONS.COLLECT_INTELLIGENCE), correlate);
router.post("/entities", authorizePermissions(PERMISSIONS.COLLECT_INTELLIGENCE), entity);
router.post("/relationships", authorizePermissions(PERMISSIONS.COLLECT_INTELLIGENCE), relationship);
router.get("/layouts", authorizePermissions(PERMISSIONS.VIEW_WORKSPACE), layouts);
router.post("/layouts", authorizePermissions(PERMISSIONS.COLLECT_INTELLIGENCE), layouts);
export default router;
