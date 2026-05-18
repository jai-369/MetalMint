import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import {
  createProductType,
  disableProductType,
  getProductTypeById,
  listProductTypes,
  updateProductType,
} from "../services/productTypeService.js";
import { badRequest } from "../utils/httpError.js";
import { validateBody } from "../utils/validation.js";

const router = Router();

const uuidParamSchema = z.string().uuid("Invalid product type id.");
const codeSchema = z
  .string()
  .trim()
  .min(2, "Code must be at least 2 characters.")
  .max(24, "Code must be 24 characters or fewer.")
  .regex(/^[A-Za-z0-9]+$/, "Code can contain only letters and numbers.")
  .transform((value) => value.toUpperCase());

const createProductTypeSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(120),
  code: codeSchema,
  category: z.string().trim().max(80).optional().or(z.literal("")),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  is_active: z.boolean().optional(),
});

const updateProductTypeSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters.").max(120).optional(),
    code: codeSchema.optional(),
    category: z.string().trim().max(80).optional().or(z.literal("")),
    description: z.string().trim().max(1000).optional().or(z.literal("")),
    is_active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");

function parseProductTypeId(request, _response, next) {
  const result = uuidParamSchema.safeParse(request.params.id);

  if (!result.success) {
    return next(badRequest("Invalid product type id."));
  }

  request.productTypeId = result.data;
  return next();
}

router.use(requireAuth);

router.get("/", async (request, response, next) => {
  try {
    const includeInactive = request.user.role === "admin" && request.query.includeInactive === "true";
    const productTypes = await listProductTypes({ includeInactive });

    response.json({
      status: "ok",
      product_types: productTypes,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAdmin, validateBody(createProductTypeSchema), async (request, response, next) => {
  try {
    const productType = await createProductType(request.body);

    response.status(201).json({
      status: "ok",
      product_type: productType,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", parseProductTypeId, async (request, response, next) => {
  try {
    const includeInactive = request.user.role === "admin";
    const productType = await getProductTypeById(request.productTypeId, { includeInactive });

    response.json({
      status: "ok",
      product_type: productType,
    });
  } catch (error) {
    next(error);
  }
});

router.patch(
  "/:id",
  requireAdmin,
  parseProductTypeId,
  validateBody(updateProductTypeSchema),
  async (request, response, next) => {
    try {
      const productType = await updateProductType(request.productTypeId, request.body);

      response.json({
        status: "ok",
        product_type: productType,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.delete("/:id", requireAdmin, parseProductTypeId, async (request, response, next) => {
  try {
    const productType = await disableProductType(request.productTypeId);

    response.json({
      status: "ok",
      message: "Product type disabled.",
      product_type: productType,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
