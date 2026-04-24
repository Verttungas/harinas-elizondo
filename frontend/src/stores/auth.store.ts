import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Rol, Usuario } from "@/types/domain.types";

interface AuthState {
  token: string | null;
  usuario: Usuario | null;
  setAuth: (token: string, usuario: Usuario) => void;
  clear: () => void;
  isAuthenticated: () => boolean;
  hasRole: (roles: Rol[]) => boolean;
}

// Persistencia en localStorage: decisión consciente para el proyecto académico.
// Riesgo: vulnerable a XSS (un script inyectado puede leer el token). La autorización
// real vive siempre en el backend (requireAuth + requireRole), por lo que estas
// guardas son solo de UI. Para producción, migrar a cookie httpOnly + SameSite=strict
// emitida por el backend y añadir protección CSRF.
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      usuario: null,
      setAuth: (token, usuario) => set({ token, usuario }),
      clear: () => set({ token: null, usuario: null }),
      isAuthenticated: () => {
        const { token, usuario } = get();
        return Boolean(token && usuario);
      },
      hasRole: (roles) => {
        const { usuario } = get();
        return Boolean(usuario && roles.includes(usuario.rol));
      },
    }),
    {
      name: "fhesa-auth",
    },
  ),
);
