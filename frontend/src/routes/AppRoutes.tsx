import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import { Login } from "@/pages/Login";
import { Dashboard } from "@/pages/Dashboard";
import { Equipos } from "@/pages/Equipos";
import { Clientes } from "@/pages/Clientes";
import { Inspecciones } from "@/pages/Inspecciones";
import { Certificados } from "@/pages/Certificados";
import { Reportes } from "@/pages/Reportes";
import { NotFound } from "@/pages/NotFound";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/equipos" element={<Equipos />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/inspecciones" element={<Inspecciones />} />
        <Route path="/certificados" element={<Certificados />} />
        <Route path="/reportes" element={<Reportes />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
