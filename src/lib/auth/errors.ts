import { PASSWORD_MIN_LENGTH } from "@/lib/validation/password";

export type AuthErrorContext = "signup" | "reset" | "login";

/** The shape Supabase Auth returns; only these fields are read. */
export interface AuthErrorLike {
  message?: string | null;
  code?: string | null;
  status?: number | null;
}

const FALLBACK: Record<AuthErrorContext, string> = {
  signup: "We could not create your account. Try again.",
  reset: "We could not update your password. Try again in a moment.",
  login: "We could not sign you in. Try again.",
};

function shortestStatedLength(message: string): number {
  const match = message.match(/(\d+)\s*(?:characters?|chars?)/i);
  const stated = match ? Number(match[1]) : 0;
  return stated > 0 ? stated : PASSWORD_MIN_LENGTH;
}

/**
 * Turns a Supabase Auth failure into something a person can act on. Only known
 * patterns are translated, and the original message is never echoed: it can
 * carry internals, and login failures must not reveal whether an email exists.
 */
export function describeAuthError(error: AuthErrorLike, context: AuthErrorContext): string {
  const message = error.message ?? "";
  const code = error.code ?? "";

  if (context === "signup" && (/already|registered|exists/i.test(message) || code === "user_already_exists")) {
    return "That email already has an account. Try logging in.";
  }

  if (/weak|pwned|leaked|breach|compromised|too easy|guess/i.test(message)) {
    return "That password is too easy to guess. Try a longer one with a mix of letters, numbers and symbols.";
  }

  if (/password/i.test(message) && /(least|short|length|characters?)/i.test(message)) {
    return `Passwords need at least ${shortestStatedLength(message)} characters.`;
  }

  if (context === "reset" && /(different|same password|reuse|reus)/i.test(message)) {
    return "Choose a password you have not used on Oblee before.";
  }

  if (/expired|invalid.*(token|link)|token.*(expired|invalid)/i.test(message) || code === "session_not_found") {
    return context === "reset"
      ? "Your reset link has expired. Request a new one."
      : "That link has expired. Start again.";
  }

  if (context === "login" && /confirm/i.test(message)) {
    return "Confirm your email first. Check your inbox for the Oblee verification link.";
  }

  if (context === "login" && (/invalid.*(credential|login)|credential/i.test(message) || code === "invalid_credentials")) {
    return "Wrong email or password.";
  }

  if (/rate limit|too many|429/i.test(message) || error.status === 429) {
    return "Too many attempts. Wait a minute and try again.";
  }

  return FALLBACK[context];
}
