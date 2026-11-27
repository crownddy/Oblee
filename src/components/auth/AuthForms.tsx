"use client";

import { useActionState, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  forgotPasswordAction,
  loginAction,
  registerAction,
  resendVerificationAction,
  resetPasswordAction,
  type AuthActionState,
} from "@/lib/actions/auth";
import { Icon } from "@/components/ui/Icon";
import { PasswordField } from "@/components/auth/PasswordField";
import { describePasswordProblem, passwordMeetsPolicy } from "@/lib/validation/password";

const IDLE: AuthActionState = { status: "idle" };

function ErrorLine({ state }: { state: AuthActionState }) {
  if (state.status === "idle") return <p className="err" role="alert" />;
  return (
    <p className="err" role="alert" style={state.status === "notice" ? { color: "var(--pri)" } : undefined}>
      {state.message}
    </p>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(loginAction, IDLE);
  const [password, setPassword] = useState("");

  return (
    <form action={action} noValidate>
      <input type="hidden" name="next" value={next} />
      <label className="fl">
        Email
        <input
          className="in"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          defaultValue={state.values?.email ?? ""}
          required
        />
      </label>
      <PasswordField
        name="password"
        label="Password"
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
      />
      <ErrorLine state={state} />
      <button className="btn full" type="submit" disabled={pending}>
        {pending ? <span className="spin2" /> : null}
        {pending ? "Logging in…" : "Log in"}
      </button>
      <p style={{ marginTop: 12, textAlign: "center", fontSize: 12.5 }}>
        <Link className="link" href="/forgot-password">
          Forgot your password?
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(registerAction, IDLE);
  const [role, setRole] = useState<"attendee" | "organiser">(
    state.values?.role === "organiser" ? "organiser" : "attendee",
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [attempted, setAttempted] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  const policyOk = passwordMeetsPolicy(password);
  const passwordsMatch = confirmPassword === password;
  const passwordError = attempted && !policyOk ? describePasswordProblem(password) : null;
  const confirmError = (attempted || confirmPassword.length > 0) && !passwordsMatch ? "The passwords do not match." : null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (policyOk && passwordsMatch) return;
    event.preventDefault();
    setAttempted(true);
    if (!policyOk) passwordRef.current?.focus();
    else confirmRef.current?.focus();
  };

  return (
    <form action={action} noValidate onSubmit={handleSubmit}>
      <input type="hidden" name="next" value={next} />
      <label className="fl">
        Full name
        <input className="in" name="fullName" autoComplete="name" defaultValue={state.values?.fullName ?? ""} required />
      </label>
      <label className="fl">
        Email
        <input
          className="in"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          defaultValue={state.values?.email ?? ""}
          required
        />
      </label>
      <label className="fl">
        Date of birth
        <input
          className="in"
          name="dateOfBirth"
          type="date"
          autoComplete="bday"
          defaultValue={state.values?.dateOfBirth ?? ""}
          required
        />
      </label>
      <p className="note" style={{ marginTop: -4 }}>
        Oblee is for people aged 18 and over. We store your date of birth only to check your age.
      </p>
      <PasswordField
        name="password"
        label="Password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        guidance
        error={passwordError}
        inputRef={passwordRef}
      />
      <PasswordField
        name="confirmPassword"
        label="Confirm password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        error={confirmError}
        inputRef={confirmRef}
      />
      <div className="fl">I want to</div>
      <div className="two">
        <label className={role === "attendee" ? "rad on" : "rad"}>
          <input
            type="radio"
            name="role"
            value="attendee"
            className="rad-input"
            checked={role === "attendee"}
            onChange={() => setRole("attendee")}
          />
          Attend events
        </label>
        <label className={role === "organiser" ? "rad on" : "rad"}>
          <input
            type="radio"
            name="role"
            value="organiser"
            className="rad-input"
            checked={role === "organiser"}
            onChange={() => setRole("organiser")}
          />
          Host events
        </label>
      </div>
      <ErrorLine state={state} />
      <button className="btn full" type="submit" disabled={pending}>
        {pending ? <span className="spin2" /> : null}
        {pending ? "Creating account…" : "Create account"}
      </button>
      <p className="note">We will email you a verification link. Confirm it before your first sign-in.</p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, IDLE);

  return (
    <form action={action} noValidate>
      <label className="fl">
        Email
        <input
          className="in"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          defaultValue={state.values?.email ?? ""}
          required
        />
      </label>
      <ErrorLine state={state} />
      <button className="btn full" type="submit" disabled={pending}>
        {pending ? <span className="spin2" /> : null}
        {pending ? "Sending…" : "Send reset link"}
      </button>
      <p className="note">If the address has an Oblee account, the link arrives in a minute or two. Check spam too.</p>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPasswordAction, IDLE);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [attempted, setAttempted] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  const policyOk = passwordMeetsPolicy(password);
  const passwordsMatch = confirmPassword === password;
  const passwordError = attempted && !policyOk ? describePasswordProblem(password) : null;
  const confirmError = (attempted || confirmPassword.length > 0) && !passwordsMatch ? "The passwords do not match." : null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (policyOk && passwordsMatch) return;
    event.preventDefault();
    setAttempted(true);
    if (!policyOk) passwordRef.current?.focus();
    else confirmRef.current?.focus();
  };

  return (
    <form action={action} noValidate onSubmit={handleSubmit}>
      <PasswordField
        name="password"
        label="New password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        guidance
        error={passwordError}
        inputRef={passwordRef}
      />
      <PasswordField
        name="confirmPassword"
        label="Confirm new password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        error={confirmError}
        inputRef={confirmRef}
      />
      <ErrorLine state={state} />
      <button className="btn full" type="submit" disabled={pending}>
        {pending ? <span className="spin2" /> : null}
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}

export function ResendVerificationForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(resendVerificationAction, IDLE);

  return (
    <form action={action} noValidate>
      <label className="fl">
        Email
        <input
          className="in"
          name="email"
          type="email"
          inputMode="email"
          defaultValue={email}
          autoComplete="email"
          required
        />
      </label>
      <ErrorLine state={state} />
      <button className="btn full" type="submit" disabled={pending}>
        {pending ? <span className="spin2" /> : <Icon name="mail" size={17} />}
        {pending ? "Sending…" : "Resend verification email"}
      </button>
    </form>
  );
}
