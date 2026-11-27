"use client";

import { useId, useState, type Ref } from "react";
import { Icon } from "@/components/ui/Icon";
import { PASSWORD_REQUIREMENTS, passwordStrength } from "@/lib/validation/password";

interface PasswordFieldProps {
  name: string;
  label: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
  /** Requirement checklist and strength meter. */
  guidance?: boolean;
  error?: string | null;
  onBlur?: () => void;
  inputRef?: Ref<HTMLInputElement>;
}

export function PasswordField({
  name,
  label,
  autoComplete,
  value,
  onChange,
  guidance = false,
  error = null,
  onBlur,
  inputRef,
}: PasswordFieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  const requirements = PASSWORD_REQUIREMENTS.map((requirement) => ({
    ...requirement,
    met: requirement.met(value),
  }));
  const strength = passwordStrength(value);
  const guidanceId = `${id}-guidance`;
  const errorId = `${id}-error`;
  const describedBy = [guidance ? guidanceId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  const lowerLabel = label.toLowerCase();

  return (
    <div className="pfield">
      <label className="fl" htmlFor={id}>
        {label}
      </label>
      <div className="pwrap">
        <input
          id={id}
          ref={inputRef}
          className="in"
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          required
        />
        <button
          type="button"
          className="peye"
          onClick={() => setVisible((current) => !current)}
          aria-pressed={visible}
          aria-controls={id}
          aria-label={visible ? `Hide ${lowerLabel}` : `Show ${lowerLabel}`}
        >
          <Icon name={visible ? "eyeoff" : "eye"} size={18} />
        </button>
      </div>

      {guidance ? (
        <div id={guidanceId}>
          <ul className="preq" aria-label="Password requirements">
            {requirements.map((requirement) => (
              <li key={requirement.id} data-met={requirement.met}>
                <i aria-hidden="true">{requirement.met ? "✓" : ""}</i>
                <span className="sr-only">{requirement.met ? "Met: " : "Not met: "}</span>
                {requirement.label}
              </li>
            ))}
          </ul>
          {value.length > 0 ? (
            <div className="pstr">
              <p className="pstrh">
                <span>Password strength</span>
                <b data-level={strength.level} role="status" aria-live="polite">
                  {strength.label}
                </b>
              </p>
              <div
                className="pbars"
                role="meter"
                aria-label="Password strength"
                aria-valuemin={1}
                aria-valuemax={3}
                aria-valuenow={strength.score}
                aria-valuetext={`Password strength: ${strength.label}`}
              >
                {[1, 2, 3].map((step) => (
                  <span key={step} data-level={strength.level} data-on={step <= strength.score} />
                ))}
              </div>
              {strength.hint ? <p className="phint">{strength.hint}</p> : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="err" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
