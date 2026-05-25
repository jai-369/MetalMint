import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import {
  createPaintColor,
  disablePaintColor,
  getPaintColorById,
  listPaintColors,
  updatePaintColor,
} from "../services/paintColorService.js";
import { badRequest } from "../utils/httpError.js";
import { validateBody } from "../utils/validation.js";

const router = Router();

const uuidParamSchema = z.string().uuid("Invalid paint color id.");

const createPaintColorSchema = z.object({
  name: z.string().trim().min(2, "Color name must be at least 2 characters.").max(80),
  display_order: z.coerce.number().int().min(0).max(9999).optional(),
  is_active: z.boolean().optional(),
});

const updatePaintColorSchema = z
  .object({
    name: z.string().trim().min(2, "Color name must be at least 2 characters.").max(80).optional(),
    display_order: z.coerce.number().int().min(0).max(9999).optional(),
    is_active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");

function parsePaintColorId(request, _response, next) {
  const result = uuidParamSchema.safeParse(request.params.id);

  if (!result.success) {
    return next(badRequest("Invalid paint color id."));
  }

  request.paintColorId = result.data;
  return next();
}

router.use(requireAuth);

router.get("/", async (request, response, next) => {
  try {
    const includeInactive = request.user.role === "admin" && request.query.includeInactive === "true";
    const paintColors = await listPaintColors({ includeInactive });

    response.json({
      status: "ok",
      paint_colors: paintColors,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", parsePaintColorId, async (request, response, next) => {
  try {
    const includeInactive = request.user.role === "admin";
    const paintColor = await getPaintColorById(request.paintColorId, { includeInactive });

    response.json({
      status: "ok",
      paint_color: paintColor,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAdmin, validateBody(createPaintColorSchema), async (request, response, next) => {
  try {
    const paintColor = await createPaintColor(request.body);

    response.status(201).json({
      status: "ok",
      paint_color: paintColor,
    });
  } catch (error) {
    next(error);
  }
});

router.patch(
  "/:id",
  requireAdmin,
  parsePaintColorId,
  validateBody(updatePaintColorSchema),
  async (request, response, next) => {
    try {
      const paintColor = await updatePaintColor(request.paintColorId, request.body);

      response.json({
        status: "ok",
        paint_color: paintColor,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.delete("/:id", requireAdmin, parsePaintColorId, async (request, response, next) => {
  try {
    const paintColor = await disablePaintColor(request.paintColorId);

    response.json({
      status: "ok",
      message: "Paint color disabled.",
      paint_color: paintColor,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
