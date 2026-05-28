import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--background)" }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: 220, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Topbar />
        <main style={{ flex: 1, padding: "1.5rem", overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
