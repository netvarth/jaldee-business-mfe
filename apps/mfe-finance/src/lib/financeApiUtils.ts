export function sanitizeFinancePayload<T extends Record<string, unknown>>(data: T) {
  const sanitized = { ...data };
  Object.keys(sanitized).forEach((key) => {
    const value = sanitized[key];
    if (value === null || value === undefined || value === "") {
      delete sanitized[key];
    }
  });
  return sanitized;
}

export function setFiltersFromPrimeTable(
  event: {
    first?: number;
    rows?: number;
    filters?: Record<string, { value: unknown; matchMode?: string }>;
    sortField?: string;
    sortOrder?: 1 | -1;
  },
  formatDate?: (date: Date) => string
) {
  const apiFilter: Record<string, unknown> = {
    from: event.first ?? 0,
    count: event.rows ?? 10,
  };

  if (event.filters) {
    Object.entries(event.filters).forEach(([key, filter]) => {
      if (filter.value == null) return;

      let suffix = "";
      let value = filter.value;

      switch (filter.matchMode) {
        case "startsWith":
          suffix = "startWith";
          break;
        case "contains":
          suffix = "like";
          break;
        case "endsWith":
          suffix = "endWith";
          break;
        case "equals":
          suffix = "eq";
          break;
        case "notEquals":
          suffix = "neq";
          break;
        case "dateIs":
          suffix = "eq";
          value = formatDate ? formatDate(new Date(value as string)) : value;
          break;
        case "dateIsNot":
          suffix = "neq";
          value = formatDate ? formatDate(new Date(value as string)) : value;
          break;
        default:
          suffix = "";
      }

      if (suffix) {
        apiFilter[`${key}-${suffix}`] = value;
      }
    });
  }

  if (event.sortField && event.sortOrder) {
    apiFilter[`sort_${event.sortField}`] = event.sortOrder === 1 ? "asc" : "dsc";
  }

  return apiFilter;
}

