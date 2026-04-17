import { NavLink } from "react-router-dom";
import { UserMenu } from "./UserMenu";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/equipos", label: "Equipos" },
  { to: "/clientes", label: "Clientes" },
  { to: "/inspecciones", label: "Inspecciones" },
  { to: "/certificados", label: "Certificados" },
  { to: "/reportes", label: "Reportes" },
];

export function TopNav() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background">
      <div className="flex h-14 items-center gap-6 px-6 max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="inline-block h-6 w-6 rounded bg-brand" />
          <span className="text-base font-semibold tracking-tight">FHESA</span>
        </div>
        <nav className="flex-1 flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "px-3 py-1.5 text-sm rounded-md transition-colors",
                  isActive
                    ? "bg-secondary text-foreground font-medium"
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
