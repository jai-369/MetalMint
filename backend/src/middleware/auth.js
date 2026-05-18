import { getUserFromToken } from "../services/authService.js";
import { authCookieName } from "../utils/authCookie.js";
import { forbidden, unauthorized } from "../utils/httpError.js";

export async function requireAuth(request, _response, next) {
  try {
    const cookieToken = request.cookies?.[authCookieName];
    const authHeader = request.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    request.user = await getUserFromToken(cookieToken ?? bearerToken);
    return next();
  } catch (error) {
    return next(error.statusCode ? error : unauthorized());
  }
}

export function requireRole(...roles) {
  return (request, _response, next) => {
    if (!request.user) {
      return next(unauthorized());
    }

    if (!roles.includes(request.user.role)) {
      return next(forbidden());
    }

    return next();
  };
}

export const requireAdmin = requireRole("admin");
export const requireStaffOrAdmin = requireRole("admin", "staff");
export const requireAnyRole = requireRole("admin", "staff", "viewer");
