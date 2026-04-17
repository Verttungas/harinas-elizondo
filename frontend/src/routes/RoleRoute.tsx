import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { Rol } from "@/types/domain.types";

interface RoleRouteProps {
  roles: Rol[];
  children: ReactNode;
}

export function RoleRoute({ roles, children }: RoleRouteProps) {
  const { usuario } = useAuth();

  if (!usuario || !roles.includes(usuario.rol)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
