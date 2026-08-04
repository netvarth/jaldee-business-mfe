import { useEffect, useState, type FormEvent } from "react";
import {
  Button,
  DialogFooter,
  FormSection,
  Input,
  PhoneInput,
  Select,
  type PhoneInputValue,
} from "@jaldee/design-system";
import { useBookingApi } from "../../services/useBookingApi";
import { useModal } from "../../contexts/ModalContext";
import { useToast } from "../../contexts/ToastContext";
import type { BookingUser } from "../../data/sessionStore";

const DEFAULT_CLASSIFICATION = "SERVICE_PROVIDER";
const EMPTY_PHONE: PhoneInputValue = { countryCode: "+91", number: "", e164Number: "" };
type BookingUserDetail = Record<string, unknown>;

function isValidPhone(value: PhoneInputValue) {
  const digits = value.number.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

function toPhoneValue(value?: string): PhoneInputValue {
  const raw = value?.trim() ?? "";
  if (!raw) {
    return EMPTY_PHONE;
  }
  if (raw.startsWith("+")) {
    const digits = raw.slice(1);
    if (digits.length > 10) {
      return {
        countryCode: `+${digits.slice(0, digits.length - 10)}`,
        number: digits.slice(-10),
        e164Number: raw,
      };
    }
    return { countryCode: "+91", number: digits, e164Number: raw };
  }
  return { countryCode: "+91", number: raw, e164Number: `+91${raw}` };
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function toPhoneValueFromDetail(detail: BookingUserDetail): PhoneInputValue {
  const phoneNumber =
    typeof detail.phoneNumber === "object" && detail.phoneNumber !== null
      ? (detail.phoneNumber as Record<string, unknown>)
      : null;

  const countryCode = asString(phoneNumber?.countryCode) || asString(detail.primaryCountryCode) || "+91";
  const number = asString(phoneNumber?.number) || asString(detail.primaryNumber);
  const e164Number = number ? `${countryCode}${number}` : "";

  return { countryCode, number, e164Number };
}

function buildUpdatePayload(params: {
  detail: BookingUserDetail;
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  phoneValue: PhoneInputValue;
  allowLogin: boolean;
  status: BookingUser["status"];
}) {
  const { detail, firstName, lastName, title, email, phoneValue, allowLogin, status } = params;

  return {
    ...detail,
    title: title.trim(),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    phoneNumber: {
      countryCode: phoneValue.countryCode || "",
      number: phoneValue.number || "",
    },
    primaryCountryCode: phoneValue.countryCode || "",
    primaryNumber: phoneValue.number || "",
    email: email.trim(),
    status: status.toUpperCase(),
    displayName: `${firstName.trim()} ${lastName.trim()}`.trim(),
    allowLogin,
    primaryClassification:
      asString(detail.primaryClassification) || DEFAULT_CLASSIFICATION,
    classifications:
      Array.isArray(detail.classifications) && detail.classifications.length > 0
        ? detail.classifications
        : [asString(detail.primaryClassification) || DEFAULT_CLASSIFICATION],
    primaryClassificationIncluded: true,
  };
}

export default function UserProfileModal({
  user,
  mode,
  onSaved,
}: {
  user: BookingUser;
  mode: "view" | "edit";
  onSaved: () => void;
}) {
  const api = useBookingApi();
  const { closeModal } = useModal();
  const { showToast } = useToast();
  const [detail, setDetail] = useState<BookingUserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(mode === "edit");
  const [submitting, setSubmitting] = useState(false);
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [title, setTitle] = useState(user.title || "Dr.");
  const [status, setStatus] = useState<BookingUser["status"]>(user.status);
  const [email, setEmail] = useState(user.email || "");
  const [phoneValue, setPhoneValue] = useState<PhoneInputValue>(toPhoneValue(user.phoneNumber));
  const [allowLogin, setAllowLogin] = useState(user.hasLogin);
  const readOnly = mode === "view";

  useEffect(() => {
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setTitle(user.title || "Dr.");
    setStatus(user.status);
    setEmail(user.email || "");
    setPhoneValue(toPhoneValue(user.phoneNumber));
    setAllowLogin(user.hasLogin);
  }, [user]);

  useEffect(() => {
    let active = true;

    async function loadDetail() {
      setLoadingDetail(true);
      try {
        const response = await api.get<BookingUserDetail>(`/booking-users/${user.userUid}`);
        if (!active) return;
        const nextDetail = response.data ?? {};
        setDetail(nextDetail);
        setFirstName(asString(nextDetail.firstName) || user.firstName);
        setLastName(asString(nextDetail.lastName) || user.lastName);
        setTitle(asString(nextDetail.title) || user.title || "Dr.");
        setStatus((asString(nextDetail.status).toUpperCase() === "INACTIVE" ? "Inactive" : "Active"));
        setEmail(asString(nextDetail.email) || user.email || "");
        setPhoneValue(toPhoneValueFromDetail(nextDetail));
        setAllowLogin(Boolean(nextDetail.allowLogin ?? user.hasLogin));
      } catch (error) {
        if (!active) return;
        showToast(error instanceof Error ? error.message : "Failed to load booking user details", "error");
      } finally {
        if (active) {
          setLoadingDetail(false);
        }
      }
    }

    void loadDetail();

    return () => {
      active = false;
    };
  }, [api, showToast, user]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (readOnly) {
      closeModal();
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      showToast("First and last name are required", "error");
      return;
    }
    if (!email.trim() && !phoneValue.number.trim()) {
      showToast("Email or phone is required", "error");
      return;
    }
    if (phoneValue.number.trim() && !isValidPhone(phoneValue)) {
      showToast("Phone must be a valid mobile number", "error");
      return;
    }

    setSubmitting(true);
    try {
      const existingDetail =
        detail ?? (await api.get<BookingUserDetail>(`/booking-users/${user.userUid}`)).data ?? {};

      await api.put(
        `/booking-users/${user.userUid}`,
        buildUpdatePayload({
          detail: existingDetail,
          firstName,
          lastName,
          title,
          email,
          phoneValue,
          allowLogin,
          status,
        }),
      );

      showToast("Booking user updated", "success");
      onSaved();
      closeModal();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to update booking user", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <header className="mb-6">
        <h2 className="text-lg font-bold text-slate-900">{readOnly ? "View User" : "Edit User"}</h2>
        <p className="mt-1 text-sm text-slate-500">Booking staff profile and contact details.</p>
      </header>
      <FormSection title="User details">
        <Input id="usr-edit-first-name" label="First name" required disabled={readOnly || loadingDetail} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        <Input id="usr-edit-last-name" label="Last name" required disabled={readOnly || loadingDetail} value={lastName} onChange={(e) => setLastName(e.target.value)} />
        <Select id="usr-edit-title" label="Title / prefix" disabled={readOnly || loadingDetail} value={title} onChange={(e) => setTitle(e.target.value)} options={["Dr.", "Mr.", "Ms.", "Mrs."].map((value) => ({ value, label: value }))} />
        <Select id="usr-edit-status" label="Status" disabled={readOnly || loadingDetail} value={status} onChange={(e) => setStatus(e.target.value)} options={["Active", "Inactive"].map((value) => ({ value, label: value }))} />
      </FormSection>
      <FormSection title="Contact details">
        <Input id="usr-edit-email" type="email" label="Email" disabled={readOnly || loadingDetail} value={email} onChange={(e) => setEmail(e.target.value)} />
        <PhoneInput id="usr-edit-phone" label="Phone" disabled={readOnly || loadingDetail} value={phoneValue} onChange={setPhoneValue} />
      </FormSection>
      <FormSection title="Access">
        <Select
          id="usr-edit-login"
          label="Allow login"
          disabled={readOnly || loadingDetail}
          value={allowLogin ? "yes" : "no"}
          onChange={(e) => setAllowLogin(e.target.value === "yes")}
          options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ]}
        />
      </FormSection>
      <DialogFooter>
        <Button variant="secondary" onClick={closeModal}>{readOnly ? "Close" : "Cancel"}</Button>
        {!readOnly ? <Button type="submit" loading={submitting} disabled={loadingDetail}>Save Changes</Button> : null}
      </DialogFooter>
    </form>
  );
}
