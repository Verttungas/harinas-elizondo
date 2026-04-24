import { Outlet } from "react-router-dom";
import { TopNav } from "./TopNav";
import { Toaster } from "@/components/ui/sonner";

export function AppShell() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav />
      <main className="flex-1 p-6 max-w-screen-2xl w-full mx-auto">
        <Outlet />
      </main>
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}
