const getConfiguredBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_URL?.trim();
  if (configuredUrl) {
    return configuredUrl;
  }

  const providerBaseUrl = window.__JALDEE_PROVIDER_BASE_URL__?.trim();
  if (providerBaseUrl) {
    try {
      return new URL("provider/golderp", providerBaseUrl).toString();
    } catch {
      return `${providerBaseUrl.replace(/\/$/, "")}/provider/golderp`;
    }
  }

  return "/rest/provider/golderp";
};

const getBaseUrl = () => {
  return getConfiguredBaseUrl().replace(/\/$/, "");
};

const getConfiguredProviderBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_PROVIDER_API_URL?.trim();
  if (configuredUrl) {
    return configuredUrl;
  }

  const providerBaseUrl = window.__JALDEE_PROVIDER_BASE_URL__?.trim();
  if (providerBaseUrl) {
    try {
      return new URL("provider", providerBaseUrl).toString();
    } catch {
      return `${providerBaseUrl.replace(/\/$/, "")}/provider`;
    }
  }

  return "/rest/provider";
};

const getProviderBaseUrl = () => {
  return getConfiguredProviderBaseUrl().replace(/\/$/, "");
};

const appendLocationParam = (url: string, method?: string) => {
  if (!method || method === "GET") {
    return url;
  }

  const location = localStorage.getItem("p-location");
  if (!location) {
    return url;
  }

  try {
    const parsedUrl = new URL(url, window.location.origin);
    if (!parsedUrl.searchParams.has("location")) {
      parsedUrl.searchParams.append("location", location);
    }
    return parsedUrl.toString();
  } catch {
    return url;
  }
};

export const apiFetch = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const method = options.method || "GET";
  const url = appendLocationParam(`${getBaseUrl()}${endpoint}`, method);
  
  const headers = new Headers(options.headers || {});
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  if (!headers.has("Content-Type") && options.method && options.method !== "GET") {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(url, {
    ...options,
    credentials: options.credentials || "include",
    headers,
  });

  if (!response.ok) {
    let errorMessage = `API Error: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.message) errorMessage = errorData.message;
    } catch {
      const errorText = await response.text();
      if (errorText) errorMessage = errorText;
    }
    throw new Error(errorMessage);
  }

  const text = await response.text();
  if (!text) return null as T;
  
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
};

export const providerApiFetch = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const method = options.method || "GET";
  const url = appendLocationParam(`${getProviderBaseUrl()}${endpoint}`, method);

  const headers = new Headers(options.headers || {});
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  if (!headers.has("Content-Type") && options.method && options.method !== "GET") {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    credentials: options.credentials || "include",
    headers,
  });

  if (!response.ok) {
    let errorMessage = `API Error: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.message) errorMessage = errorData.message;
    } catch {
      const errorText = await response.text();
      if (errorText) errorMessage = errorText;
    }
    throw new Error(errorMessage);
  }

  const text = await response.text();
  if (!text) return null as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
};
