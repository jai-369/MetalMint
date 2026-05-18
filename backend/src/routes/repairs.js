import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireStaffOrAdmin } from "../middleware/auth.js";
import { createRepairJob, getRepairJobById, listRepairJobs, updateRepairStatus } from "../services/repairService.js";
import { badRequest } from "../utils/httpError.js";
import { validateBody } from "../utils/validation.js";

const router = Router();

const uuidParamSchema = z.string().uuid("Invalid id.");
const repairStatusSchema = z.enum(["RECEIVED", "IN_PROGRESS", "READY_FOR_DELIVERY", "DELIVERED", "CANCELLED"]);

const createRepairJobSchema = z.object({
  product_type: z.string().trim().min(2, "Product type is required.").max(120),
  product_category: z.string().trim().max(120).optional().or(z.literal("")),
  brand: z.string().trim().max(120).optional().or(z.literal("")),
  model: z.string().trim().max(120).optional().or(z.literal("")),
  product_condition: z.string().trim().max(1000).optional().or(z.literal("")),
  service_description: z.string().trim().min(2, "Service description is required.").max(1000),
  problem_reported: z.string().trim().max(1000).optional().or(z.literal("")),
  estimated_duration: z.string().trim().max(120).optional().or(z.literal("")),
  customer_name: z.string().trim().min(2, "Customer name is required.").max(160),
  customer_location: z.string().trim().max(1000).optional().or(z.literal("")),
  customer_phone: z.string().trim().max(30).optional().or(z.literal("")),
  service_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must use YYYY-MM-DD format.").optional().or(z.literal("")),
  expected_delivery_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Delivery date must use YYYY-MM-DD format.").optional().or(z.literal("")),
  service_charge: z.coerce.number().min(0, "Service charge cannot be negative.").optional().default(0),
  repair_status: repairStatusSchema.optional().default("RECEIVED"),
  remarks: z.string().trim().max(1000).optional().or(z.literal("")),
});

const updateRepairStatusSchema = z.object({
  repair_status: repairStatusSchema,
});

const repairQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  repair_status: repairStatusSchema.optional(),
});

function parseRepairId(request, _response, next) {
  const result = uuidParamSchema.safeParse(request.params.id);

  if (!result.success) {
    return next(badRequest("Invalid repair id."));
  }

  request.repairId = result.data;
  return next();
}

router.use(requireAuth);

router.get("/", async (request, response, next) => {
  try {
    const query = repairQuerySchema.safeParse(request.query);

    if (!query.success) {
      throw badRequest(query.error.issues[0]?.message ?? "Invalid repair filters.");
    }

    const repairs = await listRepairJobs(query.data);
    response.json({ status: "ok", repairs });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", parseRepairId, async (request, response, next) => {
  try {
    const repair = await getRepairJobById(request.repairId);
    response.json({ status: "ok", repair });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireStaffOrAdmin, validateBody(createRepairJobSchema), async (request, response, next) => {
  try {
    const repair = await createRepairJob(request.body, request.user.id);
    response.status(201).json({ status: "ok", repair });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/status", requireStaffOrAdmin, parseRepairId, validateBody(updateRepairStatusSchema), async (request, response, next) => {
  try {
    const repair = await updateRepairStatus(request.repairId, request.body.repair_status);
    response.json({ status: "ok", repair });
  } catch (error) {
    next(error);
  }
});

export default router;
