import { Router } from "express";
import { RoleName } from "@prisma/client";
import { createConfiguration, listConfigurations } from "../controllers/apiConfigurationController";
import { authorizeRoles, requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth, authorizeRoles(RoleName.ADMINISTRATOR, RoleName.ANALYST, RoleName.INVESTIGATOR));
router.get("/", listConfigurations);
router.post("/", createConfiguration);
export default router;
