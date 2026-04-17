import { useAuthStore } from "@/stores/auth.store";

export function useAuth() {
  const token = useAuthStore((s) => s.token);
  const usuario = useAuthStore((s) => s.usuario);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clear = useAuthStore((s) => s.clear);

  return {
    token,
    usuario,
    isAuthenticated: Boolean(token && usuario),
    setAuth,
    logout: clear,
  };
}
