import { useEffect, useState } from "react";
import axios from "axios";

type BackendStatus =
  | { state: "loading" }
  | { state: "ok"; timestamp: string; service: string }
  | { state: "error"; message: string };

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api/v1";

function App() {
  const [status, setStatus] = useState<BackendStatus>({ state: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    axios
      .get<{ status: string; timestamp: string; service: string }>(
        `${API_BASE_URL}/health`,
        { signal: controller.signal, timeout: 5000 },
      )
      .then((response) => {
        setStatus({
          state: "ok",
          timestamp: response.data.timestamp,
          service: response.data.service,
        });
      })
      .catch((error: unknown) => {
        if (axios.isCancel(error)) return;
        const message =
          error instanceof Error ? error.message : "Error desconocido";
        setStatus({ state: "error", message });
      });

    return () => controller.abort();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-xl w-full bg-white shadow-sm border border-slate-200 rounded-lg p-8">
        <h1 className="text-3xl font-semibold text-slate-900">
          FHESA — Sistema en construcción
        </h1>
        <p className="mt-2 text-slate-600">
          Fábrica de Harinas Elizondo — Certificados de Calidad
        </p>

        <div className="mt-6 border-t border-slate-200 pt-6">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide">
            Estado del backend
          </h2>

          {status.state === "loading" && (
            <p className="mt-2 text-slate-700">Consultando…</p>
          )}

          {status.state === "ok" && (
            <div className="mt-2">
              <p className="text-emerald-700 font-medium">
                ✓ Backend disponible ({status.service})
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Respuesta: {status.timestamp}
              </p>
            </div>
          )}

          {status.state === "error" && (
            <div className="mt-2">
              <p className="text-red-700 font-medium">
                ✗ No se pudo conectar con el backend
              </p>
              <p className="text-xs text-slate-500 mt-1">{status.message}</p>
              <p className="text-xs text-slate-500 mt-1">
                Verifica que el servicio esté corriendo en {API_BASE_URL}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
