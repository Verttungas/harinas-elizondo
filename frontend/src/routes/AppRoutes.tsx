import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { RoleRoute } from "./RoleRoute";
import { AppShell } from "@/components/layout/AppShell";
import { Login } from "@/pages/Login";
import { Dashboard } from "@/pages/Dashboard";
import { EquiposListado } from "@/pages/equipos/EquiposListado";
import { EquipoForm } from "@/pages/equipos/EquipoForm";
import { ClientesListado } from "@/pages/clientes/ClientesListado";
import { ClienteForm } from "@/pages/clientes/ClienteForm";
import { LotesListado } from "@/pages/lotes/LotesListado";
import { LoteForm } from "@/pages/lotes/LoteForm";
import { LoteDetalle } from "@/pages/lotes/LoteDetalle";
import { InspeccionesListado } from "@/pages/inspecciones/InspeccionesListado";
import { InspeccionForm } from "@/pages/inspecciones/InspeccionForm";
import { InspeccionDetalle } from "@/pages/inspecciones/InspeccionDetalle";
import { CertificadosListado } from "@/pages/certificados/CertificadosListado";
import { CertificadoDetalle } from "@/pages/certificados/CertificadoDetalle";
import { WizardCertificado } from "@/pages/certificados/wizard/WizardCertificado";
import { Reportes } from "@/pages/reportes/Reportes";
import { NotFound } from "@/pages/NotFound";
import {
  rolesEscrituraCertificados,
  rolesEscrituraClientes,
  rolesEscrituraEquipos,
  rolesEscrituraInspecciones,
  rolesEscrituraLotes,
} from "@/lib/rbac";

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

        <Route path="/equipos" element={<EquiposListado />} />
        <Route
          path="/equipos/nuevo"
          element={
            <RoleRoute roles={rolesEscrituraEquipos}>
              <EquipoForm />
            </RoleRoute>
          }
        />
        <Route
          path="/equipos/:id"
          element={
            <RoleRoute roles={rolesEscrituraEquipos}>
              <EquipoForm />
            </RoleRoute>
          }
        />
        <Route
          path="/equipos/:id/editar"
          element={
            <RoleRoute roles={rolesEscrituraEquipos}>
              <EquipoForm />
            </RoleRoute>
          }
        />

        <Route path="/clientes" element={<ClientesListado />} />
        <Route
          path="/clientes/nuevo"
          element={
            <RoleRoute roles={rolesEscrituraClientes}>
              <ClienteForm />
            </RoleRoute>
          }
        />
        <Route
          path="/clientes/:id"
          element={
            <RoleRoute roles={rolesEscrituraClientes}>
              <ClienteForm />
            </RoleRoute>
          }
        />
        <Route
          path="/clientes/:id/editar"
          element={
            <RoleRoute roles={rolesEscrituraClientes}>
              <ClienteForm />
            </RoleRoute>
          }
        />

        <Route path="/lotes" element={<LotesListado />} />
        <Route
          path="/lotes/nuevo"
          element={
            <RoleRoute roles={rolesEscrituraLotes}>
              <LoteForm />
            </RoleRoute>
          }
        />
        <Route path="/lotes/:id" element={<LoteDetalle />} />

        <Route path="/inspecciones" element={<InspeccionesListado />} />
        <Route
          path="/inspecciones/nueva"
          element={
            <RoleRoute roles={rolesEscrituraInspecciones}>
              <InspeccionForm />
            </RoleRoute>
          }
        />
        <Route path="/inspecciones/:id" element={<InspeccionDetalle />} />
        <Route
          path="/inspecciones/:id/editar"
          element={
            <RoleRoute roles={rolesEscrituraInspecciones}>
              <InspeccionForm />
            </RoleRoute>
          }
        />

        <Route path="/certificados" element={<CertificadosListado />} />
        <Route
          path="/certificados/nuevo"
          element={
            <RoleRoute roles={rolesEscrituraCertificados}>
              <WizardCertificado />
            </RoleRoute>
          }
        />
        <Route path="/certificados/:id" element={<CertificadoDetalle />} />

        <Route path="/reportes" element={<Reportes />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
