import { PageHeader } from "@/components/shared/PageHeader";
import { useAuth } from "@/hooks/useAuth";

export function Dashboard() {
  const { usuario } = useAuth();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={
          usuario ? `Bienvenido, ${usuario.nombre}` : "Bienvenido"
        }
      />
      <p className="text-sm text-muted-foreground">
        Los indicadores operativos estarán disponibles en la siguiente fase.
      </p>
    </div>
  );
}
