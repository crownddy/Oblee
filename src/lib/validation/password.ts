/**
 * Oblee's password policy. `registerSchema` and `resetPasswordSchema` are built
 * from these constants and the live checklist reads the same requirements, so
 * the form cannot drift from what the server accepts.
 *
 * The policy is length only, matching the copy on the reset screen ("Use at
 * least 8 characters"). Supabase Auth may be configured stricter per project;
 * its errors are translated in `describeAuthError` rather than guessed at here.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 200;

export interface PasswordRequirement {
  id: "min" | "max";
  /** Wording for the checklist. */
  label: string;
  /** Wording for the submit error. */
  fix: string;
  met: (value: string) => boolean;
}

export const PASSWORD_REQUIREMENTS: readonly PasswordRequirement[] = [
  {
    id: "min",
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    fix: `Add at least ${PASSWORD_MIN_LENGTH} characters.`,
    met: (value) => value.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: "max",
    label: `No more than ${PASSWORD_MAX_LENGTH} characters`,
    fix: `Keep it to ${PASSWORD_MAX_LENGTH} characters or fewer.`,
    met: (value) => value.length <= PASSWORD_MAX_LENGTH,
  },
];

export function passwordMeetsPolicy(value: string): boolean {
  return PASSWORD_REQUIREMENTS.every((requirement) => requirement.met(value));
}

/** The requirements this password still fails, in checklist order. */
export function unmetPasswordRequirements(value: string): PasswordRequirement[] {
  return PASSWORD_REQUIREMENTS.filter((requirement) => !requirement.met(value));
}

export type PasswordStrengthLevel = "weak" | "fair" | "strong";

export interface PasswordStrength {
  level: PasswordStrengthLevel;
  label: string;
  /** 1-3, for the segmented meter. */
  score: 1 | 2 | 3;
  hint: string;
}

const CHARACTER_CLASSES = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/] as const;

export function passwordVariety(value: string): number {
  return CHARACTER_CLASSES.filter((pattern) => pattern.test(value)).length;
}

/**
 * Weak is reserved for passwords the policy rejects, so anything the form
 * accepts scores at least Fair. Strong needs length and a mix; those are
 * guidance, never gates.
 */
export function passwordStrength(value: string): PasswordStrength {
  if (!passwordMeetsPolicy(value)) {
    // The checklist and the submit error already say what is missing.
    return { level: "weak", label: "Weak", score: 1, hint: "" };
  }
  if (value.length >= 12 && passwordVariety(value) >= 3) {
    return { level: "strong", label: "Strong", score: 3, hint: "Good length and a varied mix." };
  }
  return {
    level: "fair",
    label: "Fair",
    score: 2,
    hint: "Use 12 or more characters with upper case, numbers and a symbol to make it strong.",
  };
}

/**
 * One sentence explaining exactly what to fix, or null when the pair is fine.
 * Omit `confirmPassword` when the form has no confirmation field.
 */
export function describePasswordProblem(password: string, confirmPassword?: string): string | null {
  const missing = unmetPasswordRequirements(password);
  if (missing.length > 0) {
    return missing.map((requirement) => requirement.fix).join(" ");
  }
  if (confirmPassword !== undefined && confirmPassword !== password) {
    return "The passwords do not match.";
  }
  return null;
}
