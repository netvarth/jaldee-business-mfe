import { useState } from "react";
import { useBookingApi } from "../services/useBookingApi";
import { addCreatedUser, type BookingUser } from "../data/sessionStore";

export interface NewUserInput {
  firstName: string;
  lastName: string;
  title: string;
  status: string;
  email?: string;
  phoneNumber?: string;
  connectToCrm: boolean;
}

interface UserDtoLike { userUid?: string }

export function useCreateUser() {
  const api = useBookingApi();
  const [submitting, setSubmitting] = useState(false);

  const createUser = async (input: NewUserInput): Promise<BookingUser> => {
    setSubmitting(true);
    const displayName = `${input.title ? input.title + " " : ""}${input.firstName} ${input.lastName}`.trim();
    const payload = {
      firstName: input.firstName,
      lastName: input.lastName,
      displayName,
      title: input.title,
      status: input.status,
      email: input.email ?? "",
      phoneNumber: input.phoneNumber ?? "",
      connectToCrm: input.connectToCrm, // backend gates login provisioning on this
    };
    const build = (uid?: string): BookingUser => ({
      userUid: uid ?? `usr-${Date.now()}`,
      title: input.title,
      firstName: input.firstName,
      lastName: input.lastName,
      displayName,
      email: input.email,
      phoneNumber: input.phoneNumber,
      status: input.status,
      hasLogin: input.connectToCrm, // login only when connected to base CRM
    });
    try {
      const dto = await api.post<UserDtoLike>("/users", payload);
      const user = build(dto?.userUid);
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
