import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/api/webhook/register",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims: currentSessionClaims } = await auth(); // Await the promise to get the actual object

  // Handle unauthenticated users trying to access protected routes
  if (!userId && !isPublicRoute(req)) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set(
      "redirect_url",
      req.nextUrl.pathname + req.nextUrl.search
    ); // Preserve full original path
    return NextResponse.redirect(signInUrl);
  }

  if (userId) {
    try {
      let role: string | undefined = undefined;

      // Explicitly check sessionClaims and its nested properties
      if (
        currentSessionClaims &&
        typeof currentSessionClaims.publicMetadata === "object" &&
        currentSessionClaims.publicMetadata !== null
      ) {
        role = (currentSessionClaims.publicMetadata as { role?: string })?.role;
      } else {
        // Log if publicMetadata or role is not found as expected
        if (!currentSessionClaims) {
          console.warn(
            `sessionClaims is null or undefined for userId: ${userId}. Role cannot be determined from claims.`
          );
        } else if (!currentSessionClaims.publicMetadata) {
          console.warn(
            `sessionClaims.publicMetadata is null, undefined, or not an object for userId: ${userId}. Role cannot be determined from claims.`
          );
          // You might want to log the actual value of currentSessionClaims.publicMetadata here for debugging
          // console.log("currentSessionClaims.publicMetadata:", currentSessionClaims.publicMetadata);
        }
        // If you need to fetch the user role as a fallback because it's not in claims:
        // console.warn("Falling back to clerkClient.users.getUser to fetch role. Consider adding 'role' to session token claims for performance.");
        // import { clerkClient } from "@clerk/nextjs/server"; // Ensure this is imported at the top
        // const user = await clerkClient.users.getUser(userId);
        // role = user.publicMetadata.role as string | undefined;
      }

      // For debugging, you can log the claims and the derived role:
      // console.log("Session Claims:", currentSessionClaims);
      // console.log("Derived Role:", role);

      // Admin role redirection logic
      if (role === "admin" && req.nextUrl.pathname === "/dashboard") {
        return NextResponse.redirect(new URL("/admin/dashboard", req.url));
      }

      // Prevent non-admin users from accessing admin routes
      if (role !== "admin" && isAdminRoute(req)) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }

      // Redirect authenticated users trying to access public routes like sign-in, sign-up, or home
      if (isPublicRoute(req)) {
        if (
          req.nextUrl.pathname === "/sign-in" ||
          req.nextUrl.pathname === "/sign-up" ||
          req.nextUrl.pathname === "/"
        ) {
          return NextResponse.redirect(
            new URL(
              role === "admin" ? "/admin/dashboard" : "/dashboard",
              req.url
            )
          );
        }
      }
    } catch (error) {
      console.error(
        "Error processing authentication logic for userId:",
        userId,
        error
      );
      if (req.nextUrl.pathname !== "/error") {
        return NextResponse.redirect(new URL("/error", req.url));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
