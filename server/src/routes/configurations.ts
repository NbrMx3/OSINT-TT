import { Router } from "express";
import { createConfiguration, listConfigurations } from "../controllers/apiConfigurationController";
import { requireAuth } from "../middleware/auth";
import { authorizePermissions } from "../middleware/auth";
import { PERMISSIONS } from "../config/permissions";

const router = Router();
router.use(requireAuth);
router.get("/", authorizePermissions(PERMISSIONS.MANAGE_SYSTEM), listConfigurations);
router.post("/", authorizePermissions(PERMISSIONS.MANAGE_SYSTEM), createConfiguration);
export default router;
