import { Router } from "express";
import rateLimit from "express-rate-limit";
import { correlate, entity, graph, layouts, relationship } from "../controllers/graph.controller";

const router = Router();
router.use(rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false }));
router.get("/", graph);
router.post("/correlate", correlate);
router.post("/entities", entity);
router.post("/relationships", relationship);
router.get("/layouts", layouts);
router.post("/layouts", layouts);
export default router;
