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
import { Alert } from "@/components/ui/Alert";
import { PasswordField } from "@/components/auth/PasswordField";
import { useAuthAlert } from "@/components/auth/useAuthAlert";
import { usePasswordPair } from "@/components/auth/usePasswordPair";

const IDLE: AuthActionState = { status: "idle" };

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(loginAction, IDLE);
  const [password, setPassword] = useState("");
  const alerts = useAuthAlert(state, { routeFields: false });

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
{alerts.alert ? (
        <Alert tone={alerts.alert.tone} onDismiss={alerts.dismiss}>
          {alerts.alert.message}
        </Alert>
      ) : null}
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
  const pair = usePasswordPair();
  const alerts = useAuthAlert(state);

  const passwordError = pair.passwordError ?? alerts.passwordError;
  const confirmError = pair.confirmError ?? alerts.confirmPasswordError;

  return (
    <form action={action} noValidate onSubmit={pair.guardSubmit}>
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
        value={pair.password}
        onChange={pair.setPassword}
        guidance
        error={passwordError}
        inputRef={pair.passwordRef}
      />
      <PasswordField
        name="confirmPassword"
        label="Confirm password"
        autoComplete="new-password"
        value={pair.confirmPassword}
        onChange={pair.setConfirmPassword}
        error={confirmError}
        inputRef={pair.confirmRef}
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
{alerts.alert ? (
        <Alert tone={alerts.alert.tone} onDismiss={alerts.dismiss}>
          {alerts.alert.message}
        </Alert>
      ) : null}
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
  const alerts = useAuthAlert(state, { noticeTone: "info", routeFields: false });

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
{alerts.alert ? (
        <Alert tone={alerts.alert.tone} onDismiss={alerts.dismiss}>
          {alerts.alert.message}
        </Alert>
      ) : null}
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
  const pair = usePasswordPair();
  const alerts = useAuthAlert(state);

  const passwordError = pair.passwordError ?? alerts.passwordError;
  const confirmError = pair.confirmError ?? alerts.confirmPasswordError;

  return (
    <form action={action} noValidate onSubmit={pair.guardSubmit}>
      <PasswordField
        name="password"
        label="New password"
        autoComplete="new-password"
        value={pair.password}
        onChange={pair.setPassword}
        guidance
        error={passwordError}
        inputRef={pair.passwordRef}
      />
      <PasswordField
        name="confirmPassword"
        label="Confirm new password"
        autoComplete="new-password"
        value={pair.confirmPassword}
        onChange={pair.setConfirmPassword}
        error={confirmError}
        inputRef={pair.confirmRef}
      />
{alerts.alert ? (
        <Alert tone={alerts.alert.tone} onDismiss={alerts.dismiss}>
          {alerts.alert.message}
        </Alert>
      ) : null}
      <button className="btn full" type="submit" disabled={pending}>
        {pending ? <span className="spin2" /> : null}
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}

export function ResendVerificationForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(resendVerificationAction, IDLE);
  const alerts = useAuthAlert(state, { routeFields: false });

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
{alerts.alert ? (
        <Alert tone={alerts.alert.tone} onDismiss={alerts.dismiss}>
          {alerts.alert.message}
        </Alert>
      ) : null}
      <button className="btn full" type="submit" disabled={pending}>
        {pending ? <span className="spin2" /> : <Icon name="mail" size={17} />}
        {pending ? "Sending…" : "Resend verification email"}
      </button>
    </form>
  );
}
