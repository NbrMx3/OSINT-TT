import { Router } from "express";
import { getDashboard } from "../controllers/dashboardController";
import { getHealth } from "../controllers/healthController";

const router = Router();
router.get("/health", getHealth);
router.get("/dashboard", getDashboard);
export default router;
