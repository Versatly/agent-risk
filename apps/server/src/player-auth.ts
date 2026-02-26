import type { ActionError } from "@risk/shared-types";

export function unauthorized(message = "Unauthorized"): ActionError {
  return {
    code: "UNAUTHORIZED",
    message,
  };
}
