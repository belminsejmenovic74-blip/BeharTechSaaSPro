import { NextResponse } from "next/server";

import { APP_SESSION_COOKIE } from "@/lib/auth/app-session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const publicOrigin = (process.env.NEXT_PUBLIC_MARKETING_URL || "https://behartechpro.fr").replace(/\/+$/, "");
  const requested = url.searchParams.get("returnTo");
  const returnTo = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/";
  const response = NextResponse.redirect(`${publicOrigin}/auth/logout?returnTo=${encodeURIComponent(returnTo)}`);
  response.cookies.set(APP_SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
