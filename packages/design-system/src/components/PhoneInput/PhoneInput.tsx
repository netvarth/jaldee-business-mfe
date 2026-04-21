import { useEffect, useId, useMemo, useRef } from "react";
import intlTelInput from "intl-tel-input";
import type { AllOptions, Iso2, Iti, SelectedCountryData } from "intl-tel-input";
import "intl-tel-input/styles";
import { cn } from "../../utils";
import "./PhoneInput.css";

export interface PhoneInputOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface PhoneInputValue {
  countryCode: string;
  number: string;
  e164Number?: string;
}

export interface PhoneInputProps {
  id?: string;
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  testId?: string;
  className?: string;
  containerClassName?: string;
  fullWidth?: boolean;
  numberPlaceholder?: string;
  initialCountry?: string;
  preferredCountries?: string[];
  nationalMode?: boolean;
  separateDialCode?: boolean;
  otherOptions?: Partial<AllOptions>;
  value: PhoneInputValue;
  onChange: (value: PhoneInputValue) => void;
}

export const DEFAULT_PHONE_COUNTRY_OPTIONS: PhoneInputOption[] = [
  { value: "+91", label: "India (+91)" },
  { value: "+1", label: "United States (+1)" },
  { value: "+44", label: "United Kingdom (+44)" },
];

const DIAL_CODE_TO_ISO2 = new Map(
  intlTelInput.getCountryData().map((country) => [`+${country.dialCode}`, country.iso2])
);
const VALID_ISO2_CODES = new Set(intlTelInput.getCountryData().map((country) => country.iso2));

function toDigits(value: string) {
  return value.replace(/[^\d]/g, "");
}

function buildPhoneValue(country: SelectedCountryData, e164Number: string, fallbackNumber: string): PhoneInputValue {
  const dialCode = country?.dialCode ? `+${country.dialCode}` : "";
  const normalizedE164 = e164Number || "";
  const nationalNumber = dialCode && normalizedE164.startsWith(dialCode)
    ? normalizedE164.slice(dialCode.length)
    : fallbackNumber;

  return {
    countryCode: dialCode,
    number: toDigits(nationalNumber),
    e164Number: normalizedE164,
  };
}

function resolveIso2Country(value: string | undefined, fallback: Iso2): Iso2 {
  if (value && VALID_ISO2_CODES.has(value as Iso2)) {
    return value as Iso2;
  }

  return fallback;
}

function safeGetE164Number(iti: Iti, input: HTMLInputElement, country: SelectedCountryData) {
  try {
    return iti.getNumber() ?? "";
  } catch {
    const dialCode = country?.dialCode ? `+${country.dialCode}` : "";
    const digits = toDigits(input.value);
    return digits ? `${dialCode}${digits}` : "";
  }
}

export function PhoneInput({
  id,
  label,
  error,
  hint,
  required,
  disabled,
  testId,
  className,
  containerClassName,
  fullWidth = true,
  numberPlaceholder = "Enter phone number",
  initialCountry = "in",
  preferredCountries = ["in", "us", "gb"],
  nationalMode = true,
  separateDialCode = true,
  otherOptions,
  value,
  onChange,
}: PhoneInputProps) {
  const reactId = useId();
  const fieldId = useMemo(
    () => id ?? label?.toLowerCase().trim().replace(/\s+/g, "-") ?? `phone-input-${reactId.replace(/:/g, "")}`,
    [id, label, reactId]
  );
  const resolvedTestId = testId ?? fieldId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [errorId, !error && hintId].filter(Boolean).join(" ") || undefined;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const itiRef = useRef<Iti | null>(null);
  const lastEmittedRef = useRef<string>("");

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const selectedCountry = resolveIso2Country(DIAL_CODE_TO_ISO2.get(value.countryCode), resolveIso2Country(initialCountry, "in"));
    const orderedCountries = preferredCountries
      .map((country) => resolveIso2Country(country, selectedCountry))
      .filter((country, index, list) => list.indexOf(country) === index);
    const iti = intlTelInput(input, {
      initialCountry: selectedCountry,
      countryOrder: orderedCountries,
      nationalMode,
      separateDialCode,
      loadUtils: () => import("intl-tel-input/utils"),
      containerClass: "ds-phone-input__iti",
      ...otherOptions,
    });

    itiRef.current = iti;

    const emitValue = () => {
      const selectedCountryData = iti.getSelectedCountryData();
      const nextValue = buildPhoneValue(
        selectedCountryData,
        safeGetE164Number(iti, input, selectedCountryData),
        input.value
      );
      const signature = `${nextValue.countryCode}|${nextValue.number}|${nextValue.e164Number ?? ""}`;
      if (signature === lastEmittedRef.current) return;
      lastEmittedRef.current = signature;
      onChange(nextValue);
    };

    const syncFromExternalValue = () => {
      const externalNumber = value.e164Number || `${value.countryCode}${toDigits(value.number)}`;

      if (externalNumber) {
        iti.setNumber(externalNumber);
      } else {
        iti.setCountry(selectedCountry);
        input.value = "";
      }

      emitValue();
    };

    input.addEventListener("countrychange", emitValue);
    input.addEventListener("input", emitValue);

    syncFromExternalValue();

    return () => {
      input.removeEventListener("countrychange", emitValue);
      input.removeEventListener("input", emitValue);
      iti.destroy();
      itiRef.current = null;
    };
  }, []);

  useEffect(() => {
    const iti = itiRef.current;
    const input = inputRef.current;
    if (!iti || !input) return;

    const targetCountry = resolveIso2Country(DIAL_CODE_TO_ISO2.get(value.countryCode), resolveIso2Country(initialCountry, "in"));
    const targetE164 = value.e164Number || `${value.countryCode}${toDigits(value.number)}`;
    const currentCountry = iti.getSelectedCountryData()?.iso2 ?? "";
    const currentInputValue = toDigits(input.value);
    const targetNumber = toDigits(value.number);

    if (!targetE164) {
      if (currentCountry !== targetCountry) {
        iti.setCountry(targetCountry);
      }
      if (input.value !== "") {
        input.value = "";
      }
      lastEmittedRef.current = `${value.countryCode}|${targetNumber}|`;
      return;
    }

    const currentE164 = safeGetE164Number(iti, input, iti.getSelectedCountryData());
    if (currentE164 !== targetE164 || currentCountry !== targetCountry || currentInputValue !== targetNumber) {
      iti.setNumber(targetE164);
    }
    lastEmittedRef.current = `${value.countryCode}|${targetNumber}|${targetE164}`;
  }, [initialCountry, value.countryCode, value.e164Number, value.number]);

  useEffect(() => {
    itiRef.current?.setDisabled(Boolean(disabled));
  }, [disabled]);

  return (
    <div
      className={cn("flex flex-col gap-1.5", fullWidth && "w-full", containerClassName)}
      data-testid={`${resolvedTestId}-field`}
      data-state={error ? "error" : disabled ? "disabled" : "default"}
    >
      {label ? (
        <label htmlFor={`${fieldId}-number`} className="ds-form-label">
          {label}
          {required ? <span aria-hidden="true"> *</span> : null}
        </label>
      ) : null}

      <div className={cn("ds-phone-input", fullWidth && "w-full", error && "ds-phone-input--error")}>
        <input
          ref={inputRef}
          id={`${fieldId}-number`}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          aria-label={label ?? "Phone number"}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          data-testid={`${resolvedTestId}-number`}
          placeholder={numberPlaceholder}
          className={cn("ds-phone-input__control", className)}
        />
      </div>

      {hint && !error ? (
        <p id={hintId} data-testid={`${resolvedTestId}-hint`} className="text-[length:var(--text-xs)] text-[var(--color-text-secondary)]">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" data-testid={`${resolvedTestId}-error`} className="text-[length:var(--text-xs)] text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
