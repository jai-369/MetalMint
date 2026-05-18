import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getStockSummary } from "../services/stockService.js";

const router = Router();

router.use(requireAuth);

router.get("/summary", async (_request, response, next) => {
  try {
    const summary = await getStockSummary();

    response.json({
      status: "ok",
      summary,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
