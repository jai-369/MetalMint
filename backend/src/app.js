import "./config/env.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import adminUsersRouter from "./routes/adminUsers.js";
import authRouter from "./routes/auth.js";
import dbCheckRouter from "./routes/dbCheck.js";
import employeesRouter from "./routes/employees.js";
import healthRouter from "./routes/health.js";
import paintColorsRouter from "./routes/paintColors.js";
import productTypesRouter from "./routes/productTypes.js";
import productsRouter from "./routes/products.js";
import repairsRouter from "./routes/repairs.js";
import salesRouter from "./routes/sales.js";
import stockRouter from "./routes/stock.js";

const app = express();

const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isLocal = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin);
      if (isLocal || origin === corsOrigin) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/admin", adminUsersRouter);
app.use("/api/paint-colors", paintColorsRouter);
app.use("/api/product-types", productTypesRouter);
app.use("/api/products", productsRouter);
app.use("/api/employees", employeesRouter);
app.use("/api/sales", salesRouter);
app.use("/api/repairs", repairsRouter);
app.use("/api/stock", stockRouter);
app.use("/api/health", healthRouter);
app.use("/api/db-check", dbCheckRouter);

function isDatabaseConnectionError(error) {
  if (!error) {
    return false;
  }

  if (["ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "57P01"].includes(error.code)) {
    return true;
  }

  if (Array.isArray(error.errors) && error.errors.some((item) => isDatabaseConnectionError(item))) {
    return true;
  }

  return /connect ECONNREFUSED|database|postgres/i.test(error.message ?? "") && !error.statusCode;
}

app.use((error, _request, response, _next) => {
  console.error(error);
  const statusCode = error.statusCode ?? (isDatabaseConnectionError(error) ? 503 : 500);
  const message = isDatabaseConnectionError(error)
    ? "Database connection unavailable. Please start PostgreSQL and try again."
    : statusCode === 500
      ? "Internal server error"
      : error.message;

  response.status(statusCode).json({
    status: "error",
    message,
  });
});

export default app;
