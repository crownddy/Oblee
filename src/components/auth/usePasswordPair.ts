"use client";

import { useRef, useState, type FormEvent } from "react";
import { describePasswordProblem, passwordMeetsPolicy } from "@/lib/validation/password";

/**
 * The password + confirmation pair shared by signup and password reset, so both
 * forms enforce the same policy, show the same messages and guard submission
 * the same way.
 */
export function usePasswordPair() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [attempted, setAttempted] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  const policyOk = passwordMeetsPolicy(password);
  const passwordsMatch = confirmPassword === password;
  const passwordError = attempted && !policyOk ? describePasswordProblem(password) : null;
  const confirmError =
    (attempted || confirmPassword.length > 0) && !passwordsMatch ? "The passwords do not match." : null;

  const guardSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (policyOk && passwordsMatch) return;
    event.preventDefault();
    setAttempted(true);
    (policyOk ? confirmRef : passwordRef).current?.focus();
  };

  return {
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    passwordRef,
    confirmRef,
    passwordError,
    confirmError,
    guardSubmit,
  };
}
