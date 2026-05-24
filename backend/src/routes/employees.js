import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireStaffOrAdmin } from "../middleware/auth.js";
import { listEmployees, createEmployee, updateEmployee } from "../services/employeeService.js";
import { validateBody } from "../utils/validation.js";
import { pool } from "../db/pool.js";

const router = Router();

const employeeSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  role: z.enum(["fabricator", "painter", "helper", "supervisor"]),
});

const updateEmployeeSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").optional(),
  role: z.enum(["fabricator", "painter", "helper", "supervisor"]).optional(),
  is_active: z.boolean().optional(),
});

router.use(requireAuth);

router.get("/", async (_request, response, next) => {
  try {
    const employees = await listEmployees();
    response.json({
      status: "ok",
      employees,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireStaffOrAdmin, validateBody(employeeSchema), async (request, response, next) => {
  try {
    const { name, role } = request.body;
    const employee = await createEmployee(name, role);
    response.status(201).json({
      status: "ok",
      employee,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", requireStaffOrAdmin, validateBody(updateEmployeeSchema), async (request, response, next) => {
  try {
    const { id } = request.params;
    const { name, role, is_active } = request.body;

    const existingResult = await pool.query("SELECT name, role, is_active FROM employees WHERE id = $1", [id]);
    if (!existingResult.rows[0]) {
      return response.status(404).json({ status: "error", message: "Worker not found." });
    }
    const current = existingResult.rows[0];

    const employee = await updateEmployee(
      id,
      name !== undefined ? name : current.name,
      role !== undefined ? role : current.role,
      is_active !== undefined ? is_active : current.is_active
    );

    response.json({
      status: "ok",
      employee,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
