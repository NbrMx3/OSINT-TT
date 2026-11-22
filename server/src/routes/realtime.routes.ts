import { Router } from "express";
import { requireAuth, authorizePermissions } from "../middleware/auth";
import { PERMISSIONS } from "../config/permissions";
import { streamRealtime } from "../services/realtime.service";

const router = Router();
router.get("/stream", requireAuth, authorizePermissions(PERMISSIONS.VIEW_WORKSPACE), (request, response, next) => {
  void streamRealtime(request, response, request.auth!.tenantId).catch(next);
});
export default router;
