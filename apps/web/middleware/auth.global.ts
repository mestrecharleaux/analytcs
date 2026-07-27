export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === "/login" || to.path === "/login/mfa") return;
  const { user, load } = useAuth();
  if (user.value) return;
  try {
    await load();
  } catch {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
  }
});
