export function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const maybeAxios = err as any;
    const serverMessage =
      maybeAxios.response?.data?.message ||
      maybeAxios.response?.data?.error ||
      (typeof maybeAxios.response?.data === 'string' ? maybeAxios.response.data : null);

    if (serverMessage && typeof serverMessage === 'string') {
      return serverMessage;
    }
    if (maybeAxios.message && typeof maybeAxios.message === 'string') {
      return maybeAxios.message;
    }
  }
  return err instanceof Error ? err.message : fallback;
}
