import { Router } from "express";
import authRoutes from "./auth";
import configurationRoutes from "./configurations";
import investigationRoutes from "./investigations";
import domainRoutes from "./domain.routes";
import ipRoutes from "./ip.routes";
import { getDashboard } from "../controllers/dashboardController";
import { getHealth } from "../controllers/healthController";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.get("/health", getHealth);
router.use("/auth", authRoutes);
router.use("/configurations", configurationRoutes);
router.use("/investigations", investigationRoutes);
router.use("/domain", domainRoutes);
router.use("/ip", ipRoutes);
router.get("/dashboard", requireAuth, getDashboard);
export default router;
