const isProduction = process.env.NODE_ENV === "production";
const secureCookie =
  process.env.AUTH_COOKIE_SECURE === undefined
    ? isProduction
    : process.env.AUTH_COOKIE_SECURE === "true";

export const authCookieName = "factorytrack_token";

export function setAuthCookie(response, token) {
  response.cookie(authCookieName, token, {
    httpOnly: true,
    secure: secureCookie,
    sameSite: secureCookie ? "strict" : "lax",
    maxAge: 1000 * 60 * 60 * 8,
    path: "/",
  });
}

export function clearAuthCookie(response) {
  response.clearCookie(authCookieName, {
    httpOnly: true,
    secure: secureCookie,
    sameSite: secureCookie ? "strict" : "lax",
    path: "/",
  });
}
