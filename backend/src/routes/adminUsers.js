import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import {
  createUser,
  deleteUser,
  listUsers,
  resetUserPassword,
  setUserActiveState,
  updateUser,
} from "../services/userService.js";
import { badRequest } from "../utils/httpError.js";
import { validateBody } from "../utils/validation.js";

const router = Router();

const roleSchema = z.enum(["admin", "staff", "viewer"]);
const uuidParamSchema = z.string().uuid("Invalid user id.");

const createUserSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(120),
  email: z.string().trim().email("Enter a valid email address.").max(255),
  password: z.string().min(10, "Password must be at least 10 characters."),
  role: roleSchema,
});

const updateUserSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters.").max(120).optional(),
    email: z.string().trim().email("Enter a valid email address.").max(255).optional(),
    role: roleSchema.optional(),
    is_active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");

const resetPasswordSchema = z.object({
  password: z.string().min(10, "Password must be at least 10 characters."),
});

function parseUserId(request, _response, next) {
  const result = uuidParamSchema.safeParse(request.params.id);

  if (!result.success) {
    return next(badRequest("Invalid user id."));
  }

  request.userId = result.data;
  return next();
}

router.use(requireAuth, requireAdmin);

router.get("/users", async (_request, response, next) => {
  try {
    const users = await listUsers();
    response.json({
      status: "ok",
      users,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/users", validateBody(createUserSchema), async (request, response, next) => {
  try {
    const user = await createUser(request.body);
    response.status(201).json({
      status: "ok",
      user,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/users/:id", parseUserId, validateBody(updateUserSchema), async (request, response, next) => {
  try {
    const user = await updateUser(request.userId, request.body);
    response.json({
      status: "ok",
      user,
    });
  } catch (error) {
    next(error);
  }
});

router.patch(
  "/users/:id/reset-password",
  parseUserId,
  validateBody(resetPasswordSchema),
  async (request, response, next) => {
    try {
      const user = await resetUserPassword(request.userId, request.body.password);
      response.json({
        status: "ok",
        user,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.patch("/users/:id/disable", parseUserId, async (request, response, next) => {
  try {
    const user = await setUserActiveState(request.userId, false);
    response.json({
      status: "ok",
      user,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/users/:id/enable", parseUserId, async (request, response, next) => {
  try {
    const user = await setUserActiveState(request.userId, true);
    response.json({
      status: "ok",
      user,
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/users/:id", parseUserId, async (request, response, next) => {
  try {
    if (request.userId === request.user.id) {
      throw badRequest("You cannot delete your own active admin account.");
    }

    const user = await deleteUser(request.userId);
    response.json({
      status: "ok",
      user,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
