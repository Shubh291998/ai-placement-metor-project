// components/Navbar.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const AUTHENTICATED_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/", label: "Analyze" },
  { href: "/report", label: "Gap Report" },
  { href: "/interview", label: "Mock Interview" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      setUserEmail(session?.user?.email ?? null);
    }

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setUserEmail(null);
      router.push("/login");
      router.refresh();
    } catch {
      // Gracefully redirect to login
      router.push("/login");
    } finally {
      setLoggingOut(false);
    }
  }

  const isAuthenticated = Boolean(userEmail);

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-10">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-semibold text-slate-900">
          AI Placement Mentor
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <ul className="flex items-center gap-6">
            {isAuthenticated ? (
              <>
                {AUTHENTICATED_LINKS.map((link) => {
                  const active = pathname === link.href;
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={
                          active
                            ? "font-medium text-blue-700"
                            : "text-slate-600 hover:text-slate-900"
                        }
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </>
            ) : (
              <>
                <li>
                  <Link
                    href="/"
                    className={
                      pathname === "/"
                        ? "font-medium text-blue-700"
                        : "text-slate-600 hover:text-slate-900"
                    }
                  >
                    Analyze
                  </Link>
                </li>
                <li>
                  <Link
                    href="/login"
                    className={
                      pathname === "/login"
                        ? "font-medium text-blue-700"
                        : "text-slate-600 hover:text-slate-900"
                    }
                  >
                    Login
                  </Link>
                </li>
                <li>
                  <Link
                    href="/signup"
                    className="rounded-md bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700"
                  >
                    Sign Up
                  </Link>
                </li>
              </>
            )}
          </ul>

          {isAuthenticated && (
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-slate-500 hover:text-red-600 transition-colors"
            >
              {loggingOut ? "Signing out…" : "Logout"}
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
