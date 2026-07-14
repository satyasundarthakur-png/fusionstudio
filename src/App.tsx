import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  Link,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Home from "@/pages/Home";
import Studio from "@/pages/Studio";
import Processing from "@/pages/Processing";
import Results from "@/pages/Results";
import Library from "@/pages/Library";
import Login from "@/pages/Login";
import Profile from "@/pages/Profile";

function NavBar() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

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

        {/* Nav */}
        <nav className="flex items-center gap-6 text-sm">
          <Link to="/studio" className="nav-link">
            Studio
          </Link>
          <Link to="/library" className="nav-link">
            Library
          </Link>
          {email ? (
            <Link to="/profile" className="nav-link">
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
