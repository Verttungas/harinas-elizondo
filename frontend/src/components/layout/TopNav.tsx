import { NavLink } from "react-router-dom";
import { UserMenu } from "./UserMenu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { rolPuedeVerRuta } from "@/lib/rbac";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/equipos", label: "Equipos" },
  { to: "/clientes", label: "Clientes" },
  { to: "/lotes", label: "Lotes" },
  { to: "/inspecciones", label: "Inspecciones" },
  { to: "/certificados", label: "Certificados" },
  { to: "/reportes", label: "Reportes" },
];

export function TopNav() {
  const { usuario } = useAuth();
  const visibleItems = navItems.filter((item) =>
    rolPuedeVerRuta(usuario?.rol, item.to),
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background">
      <div className="flex h-14 items-center gap-6 px-6 max-w-screen-2xl mx-auto">
        <div className="flex items-center">
          <img
            src="/logo.webp"
            alt="Harinas Elizondo"
            className="h-9 w-auto"
          />
        </div>
        <nav className="flex-1 flex items-center gap-1">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "px-3 py-1.5 text-sm rounded-md transition-colors",
                  isActive
                    ? "bg-brand-accent text-brand-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <UserMenu />
      </div>
    </header>
  );
}
