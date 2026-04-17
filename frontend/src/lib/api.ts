import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/auth.store";
import type { ApiError } from "@/types/api.types";

const baseURL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api/v1";

export const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const status = error.response?.status;
    const url = error.config?.url ?? "";
    const isLoginRequest = url.includes("/auth/login");

    if (status === 401 && !isLoginRequest) {
      useAuthStore.getState().clear();
      if (
        typeof window !== "undefined" &&
        window.location.pathname !== "/login"
      ) {
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  },
);

export function handleApiError(err: unknown): string {
  if (axios.isAxiosError<ApiError>(err)) {
    const mensaje = err.response?.data?.error?.mensaje;
    if (mensaje) return mensaje;
    if (err.code === "ECONNABORTED") return "La solicitud tardó demasiado";
    if (err.message === "Network Error")
      return "No se pudo conectar con el servidor";
    return err.message || "Error inesperado";
  }
  if (err instanceof Error) return err.message;
  return "Error inesperado";
}
