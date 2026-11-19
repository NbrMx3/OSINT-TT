import { Router } from "express";
import rateLimit from "express-rate-limit";
import { RoleName } from "@prisma/client";
import { history, investigate, result } from "../controllers/website.controller";
import { authorizeRoles, requireAuth } from "../middleware/auth";

const router = Router();
const websiteLimiter = rateLimit({
  windowMs: 60 * 1000, limit: 5, standardHeaders: "draft-8", legacyHeaders: false,
  message: { status: "error", code: "WEBSITE_RATE_LIMITED", message: "Website collection rate limit reached. Try again shortly." },
});
router.use(websiteLimiter, requireAuth, authorizeRoles(RoleName.ADMINISTRATOR, RoleName.ANALYST, RoleName.INVESTIGATOR));
router.post("/intelligence", investigate);
router.get("/history", history);
router.get("/results/:id", result);
export default router;
