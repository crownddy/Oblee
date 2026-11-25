"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CONFIG_REQUIRED_MESSAGE, isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { dateOfBirthSchema } from "@/lib/validation/auth";
import { safeNextPath } from "@/lib/utils/request";

export interface AgeActionState {
  status: "idle" | "error";
  message?: string;
}

function friendlyError(message: string): string {
  if (/at least 18/i.test(message)) return "You must be at least 18 years old to use Oblee.";
  if (/already recorded/i.test(message)) return "Your date of birth is already on file.";
  if (/valid date/i.test(message)) return "Enter a valid date of birth.";
  if (/required/i.test(message)) return "Enter your date of birth.";
  return "We could not save your date of birth. Try again.";
}

export async function submitDateOfBirthAction(
  _previous: AgeActionState,
  formData: FormData,
): Promise<AgeActionState> {
  const next = safeNextPath(String(formData.get("next") ?? ""));
  await requireUser("/verify-age");
  if (!isSupabaseConfigured) return { status: "error", message: CONFIG_REQUIRED_MESSAGE };

  const parsed = dateOfBirthSchema.safeParse({ dateOfBirth: String(formData.get("dateOfBirth") ?? "") });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Enter your date of birth.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("set_my_date_of_birth", {
    p_date_of_birth: parsed.data.dateOfBirth,
  });

  if (error) {
    console.error("set_my_date_of_birth", error.message);
    return { status: "error", message: friendlyError(error.message) };
  }

  revalidatePath("/", "layout");
  redirect(next);
}
