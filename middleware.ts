// middleware.ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "mock-anon-key";

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public paths exempt from auth checks
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isAuthCallback = pathname.startsWith("/auth/callback");
  const isPublicAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/webhook") || // Webhook cron is protected by secret header, not session
    pathname === "/favicon.ico";

  if (isPublicAsset || isAuthCallback) {
    return response;
  }

  // If user is already authenticated and visits login or signup, redirect to dashboard
  if (user && isAuthPage) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Protected application routes
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/report") ||
    pathname.startsWith("/interview") ||
    pathname.startsWith("/upload");

  const isProtectedApiRoute =
    pathname.startsWith("/api/gap-analysis") ||
    pathname.startsWith("/api/reports") ||
    pathname.startsWith("/api/interview") ||
    pathname.startsWith("/api/dashboard") ||
    pathname.startsWith("/api/roadmaps");

  if (!user) {
    if (isProtectedApiRoute) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isProtectedRoute) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/report/:path*",
    "/interview/:path*",
    "/upload/:path*",
    "/login",
    "/signup",
    "/auth/callback",
    "/api/:path*",
  ],
};
