import { Router } from "express";
import rateLimit from "express-rate-limit";
import { create, detail, exportData, list, pdf, remove } from "../controllers/report.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false }), requireAuth);
router.get("/", list);
router.post("/", create);
router.get("/:id", detail);
router.get("/:id/pdf", pdf);
router.get("/:id/export", exportData);
router.delete("/:id", remove);
export default router;
