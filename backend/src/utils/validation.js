import { badRequest } from "./httpError.js";

export function validateBody(schema) {
  return (request, _response, next) => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      const issue = result.error.issues[0];
      return next(badRequest(issue?.message ?? "Invalid request body."));
    }

    request.body = result.data;
    return next();
  };
}
