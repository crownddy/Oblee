"use client";

import { useActionState, useState } from "react";
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
      <label className="fl">
        Password
        <input className="in" name="password" type="password" autoComplete="current-password" required />
      </label>
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

  return (
    <form action={action} noValidate>
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
      <label className="fl">
        Password
        <input className="in" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </label>
      <label className="fl">
        Confirm password
        <input className="in" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
      </label>
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

  return (
    <form action={action} noValidate>
      <label className="fl">
        New password
        <input className="in" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </label>
      <label className="fl">
        Confirm new password
        <input className="in" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
      </label>
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
