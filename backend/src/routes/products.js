import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireStaffOrAdmin } from "../middleware/auth.js";
import {
  addDispatchRecord,
  listDispatchRecords,
  updateDispatchRecord,
} from "../services/dispatchService.js";
import {
  addPaintingRecord,
  listPaintingRecords,
  updatePaintingRecord,
} from "../services/paintingService.js";
import {
  createManufacturedProduct,
  createManufacturedProductsBatch,
  getDashboardStats,
  getManufacturedProductByCode,
  getManufacturedProductById,
  getProductStatusCounts,
  listProductHistory,
  listManufacturedProducts,
  updateManufacturedProduct,
  updateManufacturedProductStatus,
} from "../services/productService.js";
import { badRequest } from "../utils/httpError.js";
import { validateBody } from "../utils/validation.js";

const router = Router();

const uuidParamSchema = z.string().uuid("Invalid product id.");
const productStatusSchema = z.enum([
  "MANUFACTURED",
  "PAINTING_PENDING",
  "PAINTED",
  "IN_STOCK",
  "RESERVED",
  "DISPATCHED",
  "SOLD",
  "RETURNED",
  "DAMAGED",
  "UNDER_SERVICE",
]);

const positiveNumberSchema = z.coerce
  .number()
  .positive("Value must be greater than zero.")
  .max(99999, "Value is too large.");

const optionalText = (maxLength) => z.string().trim().max(maxLength).optional().or(z.literal(""));

const createProductSchema = z.object({
  product_type_id: z.string().uuid("Select a valid product type."),
  width: positiveNumberSchema,
  height: positiveNumberSchema,
  depth: positiveNumberSchema.optional().nullable(),
  size_label: optionalText(80),
  material_gauge: optionalText(40),
  manufacturing_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Manufacturing date must use YYYY-MM-DD format."),
  manufacturing_batch: optionalText(80),
  manufactured_by: optionalText(120),
  manufactured_by_ids: z.array(z.string().uuid()).optional().default([]),
  painted_by_ids: z.array(z.string().uuid()).optional().default([]),
  doors: z.enum(["2-Door", "4-Door"]).optional().default("2-Door"),
  weight_class: z.enum(["Lightweight", "Heavy"]).optional().default("Heavy"),
  is_custom: z.boolean().optional().default(false),
  paint_color: optionalText(80),
  factory_location: optionalText(120),
  remarks: optionalText(1000),
});

const createProductBatchSchema = z.object({
  products: z.array(createProductSchema).min(1, "Add at least one product row.").max(100, "Too many products in one batch."),
});

const updateProductSchema = z
  .object({
    depth: positiveNumberSchema.optional().nullable(),
    size_label: optionalText(80),
    material_gauge: optionalText(40),
    manufacturing_batch: optionalText(80),
    manufactured_by: optionalText(120),
    factory_location: optionalText(120),
    remarks: optionalText(1000),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");

const updateStatusSchema = z.object({
  current_status: productStatusSchema,
  remarks: z.string().trim().max(1000).optional().or(z.literal("")),
}).refine(
  (value) =>
    !["DAMAGED", "RETURNED", "UNDER_SERVICE"].includes(value.current_status) ||
    Boolean(value.remarks?.trim()),
  "Remarks are required for Damaged, Returned, or Under Service status."
);

const dateQuerySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date filters must use YYYY-MM-DD format.");

const productSearchQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  product_code: z.string().trim().max(80).optional(),
  product_type_id: z.string().uuid("Invalid product type id.").optional(),
  current_status: productStatusSchema.optional(),
  status: productStatusSchema.optional(),
  width: z.coerce.number().positive().max(99999).optional(),
  height: z.coerce.number().positive().max(99999).optional(),
  size_label: z.string().trim().max(80).optional(),
  paint_color: z.string().trim().max(80).optional(),
  manufacturing_batch: z.string().trim().max(80).optional(),
  manufactured_by: z.string().trim().max(120).optional(),
  painted_by: z.string().trim().max(120).optional(),
  manufacturing_date_from: dateQuerySchema.optional(),
  manufacturing_date_to: dateQuerySchema.optional(),
  created_at_from: dateQuerySchema.optional(),
  created_at_to: dateQuerySchema.optional(),
  invoice_number: z.string().trim().max(80).optional(),
  customer_mobile: z.string().trim().max(30).optional(),
  customer_name: z.string().trim().max(160).optional(),
  dispatch_date: dateQuerySchema.optional(),
});

const paintingStatusSchema = z.enum(["PENDING", "PAINTED", "REPAINT_REQUIRED"]);

const paintingRecordSchema = z.object({
  painted_by: optionalText(120),
  painted_by_ids: z.array(z.string().uuid()).optional().default([]),
  paint_color: optionalText(80),
  paint_brand: optionalText(120),
  paint_batch_number: optionalText(80),
  coating_type: optionalText(80),
  painting_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Painting date must use YYYY-MM-DD format.")
    .optional()
    .or(z.literal("")),
  painting_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Painting time must use HH:MM format.")
    .optional()
    .or(z.literal("")),
  painting_status: paintingStatusSchema.optional(),
  repaint_required: z.boolean().optional(),
  remarks: optionalText(1000),
  move_to_stock_after_painting: z.boolean().optional(),
});

const updatePaintingRecordSchema = paintingRecordSchema.refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required."
);

const dispatchRecordSchema = z.object({
  customer_name: z.string().trim().min(2, "Customer name is required.").max(160),
  customer_mobile: optionalText(30),
  invoice_number: optionalText(80),
  sale_price: z.coerce.number().min(0, "Sale price cannot be negative.").optional().nullable(),
  dispatch_date: dateQuerySchema.optional().or(z.literal("")),
  delivery_location: optionalText(1000),
  transport_details: optionalText(1000),
  vehicle_number: optionalText(40),
  remarks: optionalText(1000),
  mark_sold: z.boolean().optional(),
});

const updateDispatchRecordSchema = z
  .object({
    customer_name: z.string().trim().min(2, "Customer name is required.").max(160).optional(),
    customer_mobile: optionalText(30),
    invoice_number: optionalText(80),
    sale_price: z.coerce.number().min(0, "Sale price cannot be negative.").optional().nullable(),
    dispatch_date: dateQuerySchema.optional().or(z.literal("")),
    delivery_location: optionalText(1000),
    transport_details: optionalText(1000),
    vehicle_number: optionalText(40),
    remarks: optionalText(1000),
    mark_sold: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");

function parseProductId(request, _response, next) {
  const result = uuidParamSchema.safeParse(request.params.id);

  if (!result.success) {
    return next(badRequest("Invalid product id."));
  }

  request.productId = result.data;
  return next();
}

router.use(requireAuth);

router.post("/", requireStaffOrAdmin, validateBody(createProductSchema), async (request, response, next) => {
  try {
    const product = await createManufacturedProduct(request.body, request.user.id);

    response.status(201).json({
      status: "ok",
      product,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/batch", requireStaffOrAdmin, validateBody(createProductBatchSchema), async (request, response, next) => {
  try {
    const products = await createManufacturedProductsBatch(request.body.products, request.user.id);

    response.status(201).json({
      status: "ok",
      products,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/", async (request, response, next) => {
  try {
    const queryResult = productSearchQuerySchema.safeParse(request.query);

    if (!queryResult.success) {
      throw badRequest(queryResult.error.issues[0]?.message ?? "Invalid product filters.");
    }

    const products = await listManufacturedProducts(queryResult.data);

    response.json({
      status: "ok",
      products,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/stats/status-counts", async (_request, response, next) => {
  try {
    const counts = await getProductStatusCounts();

    response.json({
      status: "ok",
      counts,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/stats/dashboard", async (_request, response, next) => {
  try {
    const dashboard = await getDashboardStats();

    response.json({
      status: "ok",
      dashboard,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/code/:productCode", async (request, response, next) => {
  try {
    const product = await getManufacturedProductByCode(request.params.productCode);

    response.json({
      status: "ok",
      product,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/painting", parseProductId, async (request, response, next) => {
  try {
    const paintingRecords = await listPaintingRecords(request.productId);

    response.json({
      status: "ok",
      painting_records: paintingRecords,
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/:id/painting",
  requireStaffOrAdmin,
  parseProductId,
  validateBody(paintingRecordSchema),
  async (request, response, next) => {
    try {
      const paintingRecord = await addPaintingRecord(request.productId, request.body, request.user.id);

      response.status(201).json({
        status: "ok",
        painting_record: paintingRecord,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id/painting/:paintingRecordId",
  requireStaffOrAdmin,
  parseProductId,
  validateBody(updatePaintingRecordSchema),
  async (request, response, next) => {
    try {
      const paintingRecordIdResult = uuidParamSchema.safeParse(request.params.paintingRecordId);

      if (!paintingRecordIdResult.success) {
        throw badRequest("Invalid painting record id.");
      }

      const paintingRecord = await updatePaintingRecord(
        request.productId,
        paintingRecordIdResult.data,
        request.body,
        request.user.id
      );

      response.json({
        status: "ok",
        painting_record: paintingRecord,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get("/:id/dispatch", parseProductId, async (request, response, next) => {
  try {
    const dispatchRecords = await listDispatchRecords(request.productId);

    response.json({
      status: "ok",
      dispatch_records: dispatchRecords,
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/:id/dispatch",
  requireStaffOrAdmin,
  parseProductId,
  validateBody(dispatchRecordSchema),
  async (request, response, next) => {
    try {
      const dispatchRecord = await addDispatchRecord(request.productId, request.body, request.user.id);

      response.status(201).json({
        status: "ok",
        dispatch_record: dispatchRecord,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id/dispatch/:dispatchRecordId",
  requireStaffOrAdmin,
  parseProductId,
  validateBody(updateDispatchRecordSchema),
  async (request, response, next) => {
    try {
      const dispatchRecordIdResult = uuidParamSchema.safeParse(request.params.dispatchRecordId);

      if (!dispatchRecordIdResult.success) {
        throw badRequest("Invalid dispatch record id.");
      }

      const dispatchRecord = await updateDispatchRecord(
        request.productId,
        dispatchRecordIdResult.data,
        request.body,
        request.user.id
      );

      response.json({
        status: "ok",
        dispatch_record: dispatchRecord,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get("/:id/history", parseProductId, async (request, response, next) => {
  try {
    const history = await listProductHistory(request.productId);

    response.json({
      status: "ok",
      history,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", parseProductId, async (request, response, next) => {
  try {
    const product = await getManufacturedProductById(request.productId);

    response.json({
      status: "ok",
      product,
    });
  } catch (error) {
    next(error);
  }
});

router.patch(
  "/:id",
  requireStaffOrAdmin,
  parseProductId,
  validateBody(updateProductSchema),
  async (request, response, next) => {
    try {
      const product = await updateManufacturedProduct(request.productId, request.body);

      response.json({
        status: "ok",
        product,
      });
    } catch (error) {
      next(error);
    }
  }
);

async function handleStatusUpdate(request, response, next) {
  try {
    const product = await updateManufacturedProductStatus(
      request.productId,
      request.body.current_status,
      request.user.id,
      request.body.remarks
    );

    response.json({
      status: "ok",
      product,
    });
  } catch (error) {
    next(error);
  }
}

router.post(
  "/:id/status",
  requireStaffOrAdmin,
  parseProductId,
  validateBody(updateStatusSchema),
  handleStatusUpdate
);

router.patch(
  "/:id/status",
  requireStaffOrAdmin,
  parseProductId,
  validateBody(updateStatusSchema),
  handleStatusUpdate
);

export default router;
