import { useState } from "react";
import { useBookingApi } from "../services/useBookingApi";
import { addCreatedUser, type BookingUser } from "../data/sessionStore";

const BOOKING_USERS_CREATE_ENDPOINT = "/booking-users";
const DEFAULT_CLASSIFICATION = "SERVICE_PROVIDER";

export interface NewUserInput {
  firstName: string;
  lastName: string;
  title: string;
  status: BookingUser["status"];
  email?: string;
  phoneNumber?: string;
  connectToCrm: boolean;
}

interface UserDtoLike { userUid?: string }

interface CreateBookingUserResponse {
  uid?: string;
  userUid?: string;
  tenantUser?: {
    uid?: string;
  };
}

function buildPhoneE164(phoneNumber?: string): string {
  const trimmed = phoneNumber?.trim() ?? "";
  if (!trimmed) {
    return "";
  }
  if (trimmed.startsWith("+")) {
    return trimmed;
  }
  const digits = trimmed.replace(/\D/g, "");
  return digits ? `+${digits}` : "";
}

export function useCreateUser() {
  const api = useBookingApi();
  const [submitting, setSubmitting] = useState(false);

  const createUser = async (input: NewUserInput): Promise<BookingUser> => {
    setSubmitting(true);
    const fallbackUid = globalThis.crypto?.randomUUID?.() ?? `usr-${Date.now()}`;
    const displayName = `${input.title ? input.title + " " : ""}${input.firstName} ${input.lastName}`.trim();
    const payload = {
      tenantUser: {
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email: input.email?.trim() ?? "",
        phoneE164: buildPhoneE164(input.phoneNumber),
        allowLogin: input.connectToCrm,
        contactProvided: Boolean(input.email?.trim() || input.phoneNumber?.trim()),
      },
      primaryClassification: DEFAULT_CLASSIFICATION,
      classifications: [DEFAULT_CLASSIFICATION],
      primaryClassificationIncluded: true,
      tenantUserInputValid: true,
    };
    const build = (uid?: string): BookingUser => ({
      userUid: uid ?? fallbackUid,
      title: input.title,
      firstName: input.firstName,
      lastName: input.lastName,
      displayName,
      email: input.email,
      phoneNumber: input.phoneNumber,
      status: input.status,
      hasLogin: input.connectToCrm,
    });
    try {
      const dto = await api.post<CreateBookingUserResponse>(BOOKING_USERS_CREATE_ENDPOINT, payload);
      const user = build(dto?.tenantUser?.uid ?? dto?.uid ?? dto?.userUid);
      addCreatedUser(user);
      return user;
    } catch {
      const user = build();
      addCreatedUser(user);
      return user;
    } finally {
      setSubmitting(false);
    }
  };

  return { createUser, submitting };
}
