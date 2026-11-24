import { z } from "zod";
import { MINIMUM_AGE, isAdult, isIsoDate } from "@/lib/utils/age";

const emailField = z.string().trim().toLowerCase().min(1, "Enter your email address.").max(254, "That email is too long.").pipe(z.email("Enter a valid email address."));

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password.").max(200),
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name.").max(80, "That name is too long."),
    email: emailField,
    password: z.string().min(8, "Use a password of at least 8 characters.").max(200),
    confirmPassword: z.string(),
    dateOfBirth: z
      .string()
      .trim()
      .min(1, "Enter your date of birth.")
      .refine(isIsoDate, "Enter a valid date of birth.")
      .refine((value) => isAdult(value), `You must be at least ${MINIMUM_AGE} years old to use Oblee.`),
    role: z.enum(["attendee", "organiser"]),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "The passwords do not match.",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({ email: emailField });

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Use a password of at least 8 characters.").max(200),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "The passwords do not match.",
    path: ["confirmPassword"],
  });

export const reportEventSchema = z.object({
  reason: z.string().trim().min(3, "Choose a reason.").max(120),
  details: z.string().trim().max(600, "Keep the details under 600 characters.").default(""),
});

export const roleUpdateSchema = z.enum(["attendee", "organiser", "admin"]);

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
