import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const cookie = "keysar-pilot-session";
function apiOrigin() {
  const value = process.env.PILOT_API_ORIGIN;
  if (value === "https://cosmetics-payroll-pilot.fly.dev") return value;
  if (
    process.env.PILOT_LOCAL_TEST === "1" &&
    !process.env.VERCEL &&
    value &&
    /^http:\/\/127\.0\.0\.1:\d{2,5}$/.test(value)
  )
    return value;
  return null;
}
function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
async function handle(
  req: NextRequest,
  { params }: { params: { action: string } },
) {
  const action = params.action;
  if (!["session", "logout", "cut"].includes(action)) return json({}, 404);
  const methods = action === "cut" ? ["GET", "PUT"] : ["POST"];
  if (!methods.includes(req.method)) return json({}, 405);
  if (req.method !== "GET") {
    const origin = req.headers.get("origin");
    let caller: URL;
    try {
      caller = new URL(origin ?? "");
    } catch {
      return json({}, 403);
    }
    const local =
      process.env.PILOT_LOCAL_TEST === "1" &&
      !process.env.VERCEL &&
      caller.hostname === "127.0.0.1";
    if (
      caller.host !== req.headers.get("host") ||
      (caller.protocol !== "https:" && !local)
    )
      return json({}, 403);
  }
  if (action === "logout") {
    const out = json({});
    out.cookies.delete(cookie);
    return out;
  }
  const origin = apiOrigin();
  if (!origin)
    return json(
      { message: "Pendiente de configurar la API exclusiva del piloto." },
      503,
    );
  const token = req.cookies.get(cookie)?.value;
  if (action === "cut" && !token) return json({}, 401);
  try {
    const up = await fetch(origin + "/" + action, {
      method: req.method,
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
      headers: {
        "Content-Type": "application/json",
        ...(token && action === "cut"
          ? { Authorization: "Bearer " + token }
          : {}),
      },
      ...(req.method === "GET" ? {} : { body: await req.text() }),
    });
    if (!up.ok) {
      const err = await up.json().catch(() => ({}));
      const out = json({ message: err.message }, up.status);
      if (up.status === 401) out.cookies.delete(cookie);
      return out;
    }
    const data = await up.json();
    if (action === "session") {
      if (typeof data.token !== "string") return json({}, 502);
      const out = json({ authenticated: true });
      out.cookies.set(cookie, data.token, {
        httpOnly: true,
        sameSite: "strict",
        secure:
          Boolean(process.env.VERCEL) || new URL(req.url).protocol === "https:",
        path: "/",
        maxAge: 7200,
      });
      return out;
    }
    return json(data);
  } catch {
    return json({ message: "La API del piloto no está disponible." }, 503);
  }
}
export { handle as GET, handle as POST, handle as PUT };
