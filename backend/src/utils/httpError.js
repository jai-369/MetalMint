export class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}

export function badRequest(message) {
  return new HttpError(400, message);
}

export function unauthorized(message = "Authentication required.") {
  return new HttpError(401, message);
}

export function forbidden(message = "You do not have permission to perform this action.") {
  return new HttpError(403, message);
}

export function notFound(message = "Resource not found.") {
  return new HttpError(404, message);
}
