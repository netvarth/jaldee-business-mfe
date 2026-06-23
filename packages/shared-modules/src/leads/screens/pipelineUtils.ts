import { getReadableApiError } from "@jaldee/api-client";

export function getErrorMessage(err: unknown, fallback: string): string {
  return getReadableApiError(err, fallback).message;
}
