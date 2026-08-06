type SiteDateRange = {
  start: string;
  end: string;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateRange(value: unknown): value is SiteDateRange {
  if (!value || typeof value !== "object") return false;

  const range = value as Partial<SiteDateRange>;
  return Boolean(
    range.start &&
    range.end &&
    datePattern.test(range.start) &&
    datePattern.test(range.end) &&
    !Number.isNaN(Date.parse(`${range.start}T00:00:00`)) &&
    !Number.isNaN(Date.parse(`${range.end}T00:00:00`)) &&
    range.start <= range.end
  );
}

export function useSiteDateRange(siteId: string) {
  const storageKey = `akros:site-date-range:${siteId}`;
  let initialRange = dateDefaults();

  if (import.meta.client) {
    try {
      const storedRange = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (isValidDateRange(storedRange)) initialRange = storedRange;
    } catch {
      localStorage.removeItem(storageKey);
    }
  }

  const dates = reactive<SiteDateRange>(initialRange);

  function applyDateRange(start: string, end: string) {
    const nextRange = { start, end };
    if (!isValidDateRange(nextRange)) return false;

    Object.assign(dates, nextRange);
    if (import.meta.client) localStorage.setItem(storageKey, JSON.stringify(nextRange));
    return true;
  }

  return { dates, applyDateRange };
}
