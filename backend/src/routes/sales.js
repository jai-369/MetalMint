import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireStaffOrAdmin } from "../middleware/auth.js";
import { createSalesInvoice, getSalesInvoiceById, listSalesInvoices } from "../services/salesService.js";
import { badRequest } from "../utils/httpError.js";
import { validateBody } from "../utils/validation.js";

const router = Router();

const uuidParamSchema = z.string().uuid("Invalid id.");

const salesItemSchema = z.object({
  manufactured_product_id: z.string().uuid("Invalid product id."),
  quantity: z.coerce.number().int().positive().max(999).default(1),
  unit_price: z.coerce.number().min(0, "Unit price cannot be negative."),
  discount_amount: z.coerce.number().min(0, "Discount cannot be negative.").optional().default(0),
});

const createSalesInvoiceSchema = z.object({
  customer_name: z.string().trim().max(160).optional().or(z.literal("")),
  customer_mobile: z.string().trim().max(30).optional().or(z.literal("")),
  customer_location: z.string().trim().max(1000).optional().or(z.literal("")),
  sale_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Sale date must use YYYY-MM-DD format.").optional().or(z.literal("")),
  discount_amount: z.coerce.number().min(0, "Discount cannot be negative.").optional().default(0),
  remarks: z.string().trim().max(1000).optional().or(z.literal("")),
  items: z.array(salesItemSchema).min(1, "Select at least one product."),
});

function parseInvoiceId(request, _response, next) {
  const result = uuidParamSchema.safeParse(request.params.id);

  if (!result.success) {
    return next(badRequest("Invalid sales invoice id."));
  }

  request.invoiceId = result.data;
  return next();
}

router.use(requireAuth);

router.get("/invoices", async (_request, response, next) => {
  try {
    const invoices = await listSalesInvoices();
    response.json({ status: "ok", invoices });
  } catch (error) {
    next(error);
  }
});

router.get("/invoices/:id", parseInvoiceId, async (request, response, next) => {
  try {
    const invoice = await getSalesInvoiceById(request.invoiceId);
    response.json({ status: "ok", invoice });
  } catch (error) {
    next(error);
  }
});

router.post("/invoices", requireStaffOrAdmin, validateBody(createSalesInvoiceSchema), async (request, response, next) => {
  try {
    const invoice = await createSalesInvoice(request.body, request.user.id);
    response.status(201).json({ status: "ok", invoice });
  } catch (error) {
    next(error);
  }
});

export default router;
