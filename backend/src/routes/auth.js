import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { loginWithEmailPassword } from "../services/authService.js";
import { requireAuth } from "../middleware/auth.js";
import { clearAuthCookie, setAuthCookie } from "../utils/authCookie.js";
import { validateBody } from "../utils/validation.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Too many login attempts. Please try again in 15 minutes.",
  },
});

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

router.post("/login", loginLimiter, validateBody(loginSchema), async (request, response, next) => {
  try {
    const { email, password } = request.body;
    const { token, user } = await loginWithEmailPassword(email, password);

    setAuthCookie(response, token);

    response.json({
      status: "ok",
      user,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", (_request, response) => {
  clearAuthCookie(response);
  response.json({
    status: "ok",
  });
});

router.get("/me", requireAuth, (request, response) => {
  response.json({
    status: "ok",
    user: request.user,
  });
});

export default router;
