export type AuthMessageField = "password" | "confirmPassword" | null;

/**
 * Server messages about a password belong next to the field, not in a form
 * alert, so the same problem is not reported twice. Anything else stays a
 * form-level alert.
 */
export function routeAuthMessage(
  message: string | null | undefined,
): { field: AuthMessageField; message: string } | null {
  const text = message?.trim();
  if (!text) return null;

  if (/passwords? do not match/i.test(text)) {
    return { field: "confirmPassword", message: text };
  }

  if (
    /at least \d+ characters?/i.test(text) ||
    /too easy to guess/i.test(text) ||
    /password.*(weak|breach|compromised|too short)/i.test(text) ||
    /have not used on oblee before/i.test(text)
  ) {
    return { field: "password", message: text };
  }

  return { field: null, message: text };
}
