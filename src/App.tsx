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
    <header className="border-b border-white/10 bg-midnight/95 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="font-logo text-2xl text-saffron tracking-wide">
          SwarFusion
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/studio" className="hover:text-saffron transition-colors">
            Studio
          </Link>
          <Link to="/library" className="hover:text-saffron transition-colors">
            My Fusions
          </Link>
          {email ? (
            <Link to="/profile" className="hover:text-saffron transition-colors">
              Profile
            </Link>
          ) : (
            <Link
              to="/login"
              className="rounded-full bg-saffron text-midnight px-4 py-1.5 font-medium hover:bg-amber-400 transition-colors"
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
      <footer className="border-t border-white/10 py-6 text-center text-xs text-white/40">
        SwarFusion — Swar milaake, sur banaaye. Made for Indian voices.
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
