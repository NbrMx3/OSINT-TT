import type { NextFunction, Request, Response } from "express";
import { RoleName } from "@prisma/client";
import { z } from "zod";
import { acceptInvitation, createInvitation, listInvitations, revokeInvitation } from "../services/invitationService";
import { AppError } from "../utils/appError";

const createSchema = z.object({ email: z.string().trim().email().max(254), role: z.nativeEnum(RoleName) });
const acceptSchema = z.object({ token: z.string().min(32).max(128), name: z.string().trim().min(2).max(100), password: z.string().min(12).max(128).regex(/[A-Z]/, "Password must include an uppercase letter").regex(/[a-z]/, "Password must include a lowercase letter").regex(/[0-9]/, "Password must include a number").regex(/[^A-Za-z0-9]/, "Password must include a special character") });

export async function list(request: Request, response: Response, next: NextFunction): Promise<void> { try { const auth = requireAuth(request); response.json({ invitations: await listInvitations(auth.tenantId) }); } catch (error) { next(error); } }
export async function create(request: Request, response: Response, next: NextFunction): Promise<void> { try { const auth = requireAuth(request); const input = parse(createSchema, request.body); response.status(201).json({ invitation: await createInvitation({ ...input, tenantId: auth.tenantId, invitedById: auth.userId }) }); } catch (error) { next(error); } }
export async function revoke(request: Request, response: Response, next: NextFunction): Promise<void> { try { const auth = requireAuth(request); const id = request.params.id; if (typeof id !== "string") throw new AppError(400, "Invitation id is required", "INVITATION_ID_REQUIRED"); await revokeInvitation(auth.tenantId, id); response.status(204).send(); } catch (error) { next(error); } }
export async function accept(request: Request, response: Response, next: NextFunction): Promise<void> { try { response.status(201).json({ user: await acceptInvitation(parse(acceptSchema, request.body)) }); } catch (error) { next(error); } }
function requireAuth(request: Request) { if (!request.auth) throw new AppError(401, "Authentication required", "AUTH_REQUIRED"); return request.auth; }
function parse<T extends z.ZodTypeAny>(schema: T, value: unknown): z.infer<T> { const result = schema.safeParse(value); if (!result.success) throw new AppError(400, result.error.issues.map((issue) => issue.message).join("; "), "VALIDATION_ERROR"); return result.data; }
