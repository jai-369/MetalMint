import { Router } from "express";
import { checkDatabaseConnection } from "../db/pool.js";

const router = Router();

router.get("/", async (_request, response, next) => {
  try {
    const result = await checkDatabaseConnection();

    response.json({
      status: "ok",
      database: "connected",
      checked_at: result.checked_at,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
