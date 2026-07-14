import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Home from "@/pages/Home";
import Studio from "@/pages/Studio";
import Processing from "@/pages/Processing";
import Results from "@/pages/Results";
import Library from "@/pages/Library";
import Login from "@/pages/Login";
import Profile from "@/pages/Profile";

const NAV_LINKS = [
  { to: "/studio", label: "Studio" },
  { to: "/library", label: "Library" },
];

function NavBar() {
  const [email, setEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const linkClass = (to: string) =>
    `nav-link ${pathname === to ? "nav-link-active" : ""}`;

  return (
    <header
      className="sticky top-0 z-40 border-b border-white/[0.06]"
      style={{ background: "rgba(10, 10, 20, 0.88)", backdropFilter: "blur(20px)" }}
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
          {email ? (
            <Link to="/profile" className={linkClass("/profile")}>
              Profile
            </Link>
          ) : (
            <Link
              to="/login"
              className="rounded-full px-4 py-1.5 text-midnight font-semibold text-sm transition-all hover:brightness-110 hover:shadow-glow-saffron"
              style={{ background: "linear-gradient(135deg, #ef9f27, #f5c842)" }}
            >
              Sign in
            </Link>
          )}
        </nav>

        {/* Mobile trigger */}
        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="sm:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/70 active:scale-95 transition-transform"
        >
          {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        className={`sm:hidden overflow-hidden transition-[max-height] duration-300 ease-in-out border-t border-white/[0.06] ${
          menuOpen ? "max-h-64" : "max-h-0 border-t-0"
        }`}
        style={{ background: "rgba(10, 10, 20, 0.96)" }}
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
          {email ? (
            <Link
              to="/profile"
              className={`rounded-lg px-3 py-2.5 ${
                pathname === "/profile" ? "bg-saffron/10 text-saffron font-medium" : "text-white/65"
              }`}
            >
              Profile
            </Link>
          ) : (
            <Link
              to="/login"
              className="mt-1 rounded-lg px-3 py-2.5 text-center text-midnight font-semibold"
              style={{ background: "linear-gradient(135deg, #ef9f27, #f5c842)" }}
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function RootLayout() {
  return (
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

const libraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/library",
  component: Library,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: Login,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: Profile,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  studioRoute,
  processingRoute,
  resultsRoute,
  libraryRoute,
  loginRoute,
  profileRoute,
]);

export const router = createRouter({ routeTree });
