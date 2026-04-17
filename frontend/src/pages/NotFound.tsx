import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <p className="text-sm font-medium text-muted-foreground">Error 404</p>
        <h1 className="text-2xl font-semibold text-foreground">
          Página no encontrada
        </h1>
        <p className="text-sm text-muted-foreground">
          La ruta solicitada no existe o fue movida.
        </p>
        <Button asChild>
          <Link to="/dashboard">Volver al dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
