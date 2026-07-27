let refreshPromise: Promise<unknown> | null = null;

export function useApi() {
  const config = useRuntimeConfig();
  const raw = $fetch.create({
    baseURL: config.public.apiBase,
    credentials: "include",
    headers: import.meta.server ? useRequestHeaders(["cookie"]) : undefined
  });
  const request = async <T = unknown>(url: string, options: Record<string, any> = {}) => {
    try {
      return await raw<T>(url, options);
    } catch (error: any) {
      const cannotRefresh = url === "/auth/login" || url === "/auth/login/mfa" || url === "/auth/refresh";
      if (error?.response?.status !== 401 || cannotRefresh) throw error;
      refreshPromise ||= raw("/auth/refresh", { method: "POST" }).finally(() => {
        refreshPromise = null;
      });
      await refreshPromise;
      return raw<T>(url, options);
    }
  };
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
