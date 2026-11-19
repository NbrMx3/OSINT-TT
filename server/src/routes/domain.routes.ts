import { Router } from "express";
import rateLimit from "express-rate-limit";
import { RoleName } from "@prisma/client";
import { history, investigate, result } from "../controllers/domain.controller";
import { authorizeRoles, requireAuth } from "../middleware/auth";

const router = Router();
const domainLimiter = rateLimit({ windowMs: 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false, message: { status: "error", code: "DOMAIN_RATE_LIMITED", message: "Domain collection rate limit reached. Try again shortly." } });
router.use(domainLimiter, requireAuth, authorizeRoles(RoleName.ADMINISTRATOR, RoleName.ANALYST, RoleName.INVESTIGATOR));
router.post("/intelligence", investigate);
router.get("/history", history);
router.get("/results/:id", result);
export default router;
