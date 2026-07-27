import type { AuthUser } from "~/types";

export function useAuth() {
  const user = useState<AuthUser | null>("auth-user", () => null);
  const { request } = useApi();

  const load = async () => {
    user.value = await request<AuthUser>("/auth/me");
    return user.value;
  };

  const logout = async () => {
    try {
      await request("/auth/logout", { method: "POST" });
    } finally {
      user.value = null;
      await navigateTo("/login");
    }
  };

  const can = (permission: string) =>
    Boolean(user.value?.permissions.includes("*") || user.value?.permissions.includes(permission));

  return { user, load, logout, can };
}
