"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PHONE_REGEX = /^[6-9]\d{9}$/; // Indian 10-digit mobile, no +91
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(values) {
  const errors = {};

  if (!values.name.trim()) {
    errors.name = "Enter your name";
  }

  if (!values.phone.trim()) {
    errors.phone = "Enter your phone number";
  } else if (!PHONE_REGEX.test(values.phone.trim())) {
    errors.phone = "Enter a valid 10-digit mobile number";
  }

  if (!values.email.trim()) {
    errors.email = "Enter your email";
  } else if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = "Enter a valid email address";
  }

  return errors;
}

export default function BillUnlockForm() {
  const router = useRouter();
  const [values, setValues] = useState({ name: "", phone: "", email: "" });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [consent, setConsent] = useState(true);
  const [consentError, setConsentError] = useState(undefined);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field) => (e) => {
    const next = { ...values, [field]: e.target.value };
    setValues(next);
    if (touched[field]) {
      setErrors(validate(next));
    }
  };

  const handleBlur = (field) => () => {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors(validate(values));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    setTouched({ name: true, phone: true, email: true });

    const hasConsentError = !consent;
    setConsentError(hasConsentError ? "Required to continue" : undefined);

    if (Object.keys(nextErrors).length > 0 || hasConsentError) return;

    setSubmitting(true);

    // Hold the lead details for Screen 2 (bill upload) and Screen 3 (confirm),
    // where they'll be sent alongside the parsed bill JSON in /api/submit.
    sessionStorage.setItem(
      "billUnlockLead",
      JSON.stringify({
        name: values.name.trim(),
        phone: values.phone.trim(),
        email: values.email.trim().toLowerCase(),
        consentedAt: new Date().toISOString(),
      }),
    );

    router.push("/upload-bill");
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full max-w-md">
      <div className="space-y-5">
        <Field
          label="Name"
          id="name"
          type="text"
          autoComplete="name"
          value={values.name}
          onChange={handleChange("name")}
          onBlur={handleBlur("name")}
          error={touched.name ? errors.name : undefined}
          placeholder="Full name"
        />

        <Field
          label="Phone"
          id="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={values.phone}
          onChange={handleChange("phone")}
          onBlur={handleBlur("phone")}
          error={touched.phone ? errors.phone : undefined}
          placeholder="10-digit mobile number"
          maxLength={10}
          prefix="+91"
        />

        <Field
          label="Email"
          id="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={handleChange("email")}
          onBlur={handleBlur("email")}
          error={touched.email ? errors.email : undefined}
          placeholder="you@example.com"
        />
      </div>

      <label className="mt-6 flex items-start gap-3 text-sm leading-snug text-[#4A4438]">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => {
            setConsent(e.target.checked);
            if (e.target.checked) setConsentError(undefined);
          }}
          className="mt-0.5 h-4 w-4 shrink-0 border-2 border-[#1C1B19] accent-[#B23A2E]"
        />
        <span>
          I agree to receive marketing communication about products and courses.
        </span>
      </label>
      {consentError && (
        <p className="mt-1 pl-7 text-sm text-[#B23A2E]">{consentError}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-8 w-full border-2 border-[#1C1B19] bg-[#1C1B19] py-3.5 font-mono text-sm uppercase tracking-wide text-[#FBF8F2] transition-colors hover:bg-[#B23A2E] hover:border-[#B23A2E] disabled:opacity-60"
      >
        {submitting ? "One moment…" : "Upload Bill →"}
      </button>
    </form>
  );
}

function Field({
  label,
  id,
  type,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  autoComplete,
  inputMode,
  maxLength,
  prefix,
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block font-mono text-xs uppercase tracking-wide text-[#8C8577]"
      >
        {label}
      </label>
      <div className="flex items-stretch border-b-2 border-[#1C1B19] focus-within:border-[#B23A2E]">
        {prefix && (
          <span className="flex items-center pr-2 font-mono text-base text-[#8C8577]">
            {prefix}
          </span>
        )}
        <input
          id={id}
          name={id}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          maxLength={maxLength}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className="w-full bg-transparent py-2 text-lg text-[#1C1B19] placeholder:text-[#C4BDAC] focus:outline-none"
        />
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-[#B23A2E]">
          {error}
        </p>
      )}
    </div>
  );
}
