export function useApi() {
  const config = useRuntimeConfig();
  const request = $fetch.create({ baseURL: config.public.apiBase });
  return { request };
}

export function formatNumber(value = 0) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function dateDefaults(days = 29) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10)
  };
}

export function initials(name = "?") {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
