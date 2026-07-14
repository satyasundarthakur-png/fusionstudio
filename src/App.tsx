import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, Sun, Moon } from "lucide-react";
import PasswordGate from "@/components/PasswordGate";
import Home from "@/pages/Home";
import Studio from "@/pages/Studio";
import Processing from "@/pages/Processing";
import Results from "@/pages/Results";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/studio", label: "Studio" },
];

const THEME_KEY = "swarfusion_theme";

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem(THEME_KEY) as "dark" | "light") || "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  return {
    theme,
    toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
  };
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to day mode" : "Switch to night mode"}
      className="theme-toggle"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const linkClass = (to: string) =>
    `nav-link ${pathname === to ? "nav-link-active" : ""}`;

  return (
    <header
      className="sticky top-0 z-40 border-b border-white/[0.06]"
      style={{ background: "var(--surface-header)", backdropFilter: "blur(20px)" }}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14">
        {/* Logo */}
        <Link to="/" className="font-logo text-xl tracking-wide gradient-text-saffron select-none">
          SwarFusion
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-6 text-sm">
          {NAV_LINKS.map((l) => (
            <Link key={l.to} to={l.to} className={linkClass(l.to)}>
              {l.label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>

        {/* Mobile trigger + theme toggle */}
        <div className="sm:hidden flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/70 active:scale-95 transition-transform"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={`sm:hidden overflow-hidden transition-[max-height] duration-300 ease-in-out border-t border-white/[0.06] ${
          menuOpen ? "max-h-64" : "max-h-0 border-t-0"
        }`}
        style={{ background: "var(--surface-header)" }}
      >
        <nav className="flex flex-col px-4 py-3 gap-1 text-sm">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`rounded-lg px-3 py-2.5 ${
                pathname === l.to ? "bg-saffron/10 text-saffron font-medium" : "text-white/65"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

function RootLayout() {
  return (
    <PasswordGate>
      <div className="min-h-screen flex flex-col bg-midnight">
        <NavBar />
        <main className="flex-1">
          <Outlet />
        </main>
        <footer className="border-t border-white/[0.06] py-6 text-center text-xs text-white/30">
          <span className="gradient-text-saffron font-logo mr-1">SwarFusion</span>
          — Swar milaake, sur banaaye. Made for Indian voices.
        </footer>
      </div>
    </PasswordGate>
  );
}

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Home,
});

const studioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/studio",
  component: Studio,
});

const processingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/processing",
  component: Processing,
});

const resultsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/results",
  component: Results,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  studioRoute,
  processingRoute,
  resultsRoute,
]);

export const router = createRouter({ routeTree });
