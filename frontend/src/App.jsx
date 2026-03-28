import React, { useState } from "react";
import { Routes, Route, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FlaskConical,
  Table2,
  FileBarChart,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Shield,
  Menu,
} from "lucide-react";
import { cn } from "./lib/utils";
import { Button } from "./components/ui/Button";
import { ChatAgent } from "./components/ChatAgent";
import DashboardPage from "./pages/DashboardPage";
import AnalyzePage from "./pages/AnalyzePage";
import WorksheetPage from "./pages/WorksheetPage";
import ReportsPage from "./pages/ReportsPage";

const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/analyze", icon: FlaskConical, label: "Analyze" },
  { to: "/worksheet", icon: Table2, label: "Worksheet" },
  { to: "/reports", icon: FileBarChart, label: "Reports" },
];

function Sidebar({ collapsed, setCollapsed }) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col border-r bg-background transition-all duration-300",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-4">
        <div className="flex items-center gap-2 overflow-hidden">
          <Shield className="h-7 w-7 text-primary shrink-0" />
          {!collapsed && (
            <span className="text-base font-bold whitespace-nowrap">
              HAZOP Assistant
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>
    </aside>
  );
}

function Header({ onMobileMenuToggle }) {
  const location = useLocation();

  const getPageContext = () => {
    if (location.pathname === "/") return "dashboard";
    if (location.pathname.startsWith("/analyze")) return "analyze";
    if (location.pathname.startsWith("/worksheet")) return "worksheet";
    if (location.pathname.startsWith("/reports")) return "reports";
    return "dashboard";
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-1 rounded-md hover:bg-muted"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h2 className="text-sm font-medium text-muted-foreground">
          {getPageContext().charAt(0).toUpperCase() + getPageContext().slice(1)}
        </h2>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground hidden sm:block">
          AI-Powered HAZOP Analysis
        </span>
      </div>
    </header>
  );
}

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const getChatContext = () => {
    if (location.pathname === "/") return "dashboard";
    if (location.pathname.startsWith("/analyze")) return "analyze";
    if (location.pathname.startsWith("/worksheet")) return "worksheet";
    if (location.pathname.startsWith("/reports")) return "reports";
    return "dashboard";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - visible on desktop, toggleable on mobile */}
      <div
        className={cn(
          "lg:block",
          mobileMenuOpen ? "block" : "hidden"
        )}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />
      </div>

      {/* Main content */}
      <div
        className={cn(
          "transition-all duration-300",
          sidebarCollapsed ? "lg:ml-16" : "lg:ml-56"
        )}
      >
        <Header onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />

        <main className="p-6">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/analyze" element={<AnalyzePage />} />
            <Route path="/worksheet" element={<WorksheetPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Routes>
        </main>
      </div>

      {/* Floating chat agent — extract study ID from URL or localStorage */}
      <ChatAgent
        context={getChatContext()}
        studyId={
          new URLSearchParams(location.search).get("study")
          || localStorage.getItem("hazop_current_study")
          || undefined
        }
      />
    </div>
  );
}
