import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const portal = "https://keysar-nomina-piloto.vercel.app";
const identity = "https://cosmetics-payroll-pilot.fly.dev";
const cookie = "__Host-keysar-pilot-login";
const opaque = /^[A-Za-z0-9_-]{43}$/;
export const sessionCookie = "keysar-pilot-session";
function redirect(url: URL | string) {
  const res = NextResponse.redirect(url, 303);
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}
export async function portalAuthorization(
  req: NextRequest,
  action: "authorize" | "callback",
) {
  if (req.method !== "GET")
    return new NextResponse(null, { status: 405, headers: { Allow: "GET" } });
  // Un origen de preview redirige a la dirección canónica antes de crear las cookies.
  if (
    req.headers.get("host") !== new URL(portal).host ||
    process.env.PILOT_STANDALONE_PROJECT !== "prj_63u3umjnK9xfXtrawKDuW7USsKWE"
  )
    return redirect(portal + "/login");
  if (action === "authorize") {
    const state = randomBytes(32).toString("base64url"),
      verifier = randomBytes(32).toString("base64url");
    const url = new URL("/authorize", identity);
    url.searchParams.set("state", state);
    url.searchParams.set(
      "challenge",
      createHash("sha256").update(verifier).digest("base64url"),
    );
    const res = redirect(url);
    res.cookies.set(cookie, state + "." + verifier, {
      secure: true,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 480,
    });
    return res;
  }
  const invalid = () => {
    const res = new NextResponse(
      "La autorización venció. Vuelve a entrar desde el piloto de nómina.",
      {
        status: 401,
        headers: {
          "Cache-Control": "private, no-store",
          "Referrer-Policy": "no-referrer",
          "Content-Type": "text/plain; charset=utf-8",
        },
      },
    );
    res.cookies.set(cookie, "", {
      secure: true,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return res;
  };
  const [savedState = "", verifier = ""] = (
    req.cookies.get(cookie)?.value ?? ""
  ).split(".");
  const state = req.nextUrl.searchParams.get("state") ?? "",
    code = req.nextUrl.searchParams.get("code") ?? "";
  if (
    !opaque.test(savedState) ||
    !opaque.test(verifier) ||
    !opaque.test(state) ||
    !opaque.test(code) ||
    !timingSafeEqual(Buffer.from(state), Buffer.from(savedState))
  )
    return invalid();
  let token: unknown;
  try {
    const upstream = await fetch(identity + "/redeem", {
      method: "POST",
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, verifier }),
    });
    if (!upstream.ok) return invalid();
    token = (await upstream.json()).token;
  } catch {
    return invalid();
  }
  if (typeof token !== "string" || !token) return invalid();
  const res = redirect(portal + "/");
  res.cookies.set(sessionCookie, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7200,
  });
  res.cookies.set(cookie, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
