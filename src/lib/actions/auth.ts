"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured, CONFIG_REQUIRED_MESSAGE } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";
import { getOrigin, safeNextPath } from "@/lib/utils/request";

export interface AuthActionState {
  status: "idle" | "error" | "notice";
  message?: string;
  values?: { fullName?: string; email?: string; role?: string; dateOfBirth?: string; next?: string };
}


function readForm(formData: FormData) {
  return {
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
    role: String(formData.get("role") ?? "attendee"),
    dateOfBirth: String(formData.get("dateOfBirth") ?? ""),
    next: String(formData.get("next") ?? ""),
  };
}

export async function loginAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const raw = readForm(formData);
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check your details and try again.",
      values: { email: raw.email, next: raw.next },
    };
  }
  if (!isSupabaseConfigured) {
    return { status: "error", message: CONFIG_REQUIRED_MESSAGE, values: { email: raw.email } };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    const message = /confirm/i.test(error.message)
      ? "Confirm your email first. Check your inbox for the Oblee verification link."
      : "Wrong email or password.";
    return { status: "error", message, values: { email: raw.email, next: raw.next } };
  }

  revalidatePath("/", "layout");
  redirect(safeNextPath(raw.next));
}

export async function registerAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const raw = readForm(formData);
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Check your details and try again.",
      values: { fullName: raw.fullName, email: raw.email, role: raw.role, dateOfBirth: raw.dateOfBirth, next: raw.next },
    };
  }
  if (!isSupabaseConfigured) {
    return {
      status: "error",
      message: CONFIG_REQUIRED_MESSAGE,
      values: { fullName: raw.fullName, email: raw.email, role: raw.role, dateOfBirth: raw.dateOfBirth },
    };
  }

  const origin = await getOrigin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        role: parsed.data.role,
        date_of_birth: parsed.data.dateOfBirth,
      },
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(
        safeNextPath(raw.next, "/profile"),
      )}`,
    },
  });

  if (error) {
    const message = /already|registered/i.test(error.message)
      ? "That email already has an account. Try logging in."
      : "We could not create your account. Try again.";
    return { status: "error", message, values: { fullName: raw.fullName, email: raw.email, role: raw.role } };
  }

  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return {
      status: "error",
      message: "That email already has an account. Try logging in.",
      values: { fullName: raw.fullName, email: raw.email, role: raw.role, dateOfBirth: raw.dateOfBirth },
    };
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect(safeNextPath(raw.next));
  }

  redirect(`/verify-email?email=${encodeURIComponent(parsed.data.email)}`);
}

export async function logoutAction(): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/");
}

export async function forgotPasswordAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const raw = readForm(formData);
  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Enter a valid email." };
  }
  if (!isSupabaseConfigured) {
    return { status: "error", message: CONFIG_REQUIRED_MESSAGE };
  }

  const origin = await getOrigin();
  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
  });

  return {
    status: "notice",
    message: "If that email has an Oblee account, a reset link is on its way.",
    values: { email: parsed.data.email },
  };
}

export async function resetPasswordAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const raw = readForm(formData);
  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check your details." };
  }
  if (!isSupabaseConfigured) {
    return { status: "error", message: CONFIG_REQUIRED_MESSAGE };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "Your reset link has expired. Request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { status: "error", message: "We could not update your password. Request a new link." };
  }

  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login?reset=1");
}

export async function resendVerificationAction(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const raw = readForm(formData);
  const parsed = forgotPasswordSchema.safeParse({ email: raw.email });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Enter a valid email." };
  }
  if (!isSupabaseConfigured) {
    return { status: "error", message: CONFIG_REQUIRED_MESSAGE };
  }

  const origin = await getOrigin();
  const supabase = await createSupabaseServerClient();
  await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/profile")}` },
  });

  return { status: "notice", message: "Verification email sent. Check your inbox." };
}
