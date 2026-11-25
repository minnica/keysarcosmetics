import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import express from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import { assertIdentity } from "./store";

export const pilotPortal = "https://keysar-nomina-piloto.vercel.app";
const loginHost = "https://cosmetics-payroll-pilot.fly.dev";
const opaque = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const digest = (s: string) =>
  createHash("sha256").update(s).digest("base64url");
const nonce = () => randomBytes(32).toString("base64url");
const intentCookie = "__Host-keysar-pilot-intent";
const accountResponse = z.object({
  success: z.literal(true),
  data: z.object({
    usuario: z.object({
      id: z.string(),
      email: z.string(),
      activo: z.literal(true),
      canManagePayrollAccess: z.boolean(),
      payrollScreenPermissions: z.array(z.string()),
    }),
  }),
});
export async function verifyPortalAccount(
  email: string,
  password: string,
  id: string,
  request: typeof fetch = fetch,
) {
  const r = await request("https://cosmetics-api.fly.dev/api/auth/login", {
    method: "POST",
    redirect: "error",

    signal: AbortSignal.timeout(12000),
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify({ email, password }),
  });
  if (r.status === 401 || r.status === 403 || r.status === 400) return false;
  if (!r.ok) throw Error("El servicio de identidad no está disponible.");
  // Proyectar sólo la identidad. El token de la nómina productiva se descarta en este proceso.
  const body = accountResponse.safeParse(await r.json());
  if (!body.success) return false;
  const user = body.data.data.usuario;
  return (
    user.id === id &&
    user.email.toLowerCase() === email.toLowerCase() &&
    (user.canManagePayrollAccess || user.payrollScreenPermissions.length > 0)
  );
}
export function pilotSession(subject: string, secret: string) {
  return jwt.sign({}, secret, {
    algorithm: "HS256",
    subject,
    issuer: "keysar-payroll-pilot",
    audience: "pilot-workspace",
    expiresIn: "2h",
  });
}
interface Options {
  ref: string;
  user: string;
  email: string;
  secret: string;
  verify?: typeof verifyPortalAccount;
}
function form(csrf: string, message = "") {
  return `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Acceso al piloto de nómina · Keysar Cosmetics</title>
<style>html{color-scheme:light}body{font:1rem/1.55 system-ui,sans-serif;background:#f6f2ed;color:#30251f;margin:0;padding:6vh 1rem}main{max-width:24rem;margin:auto;background:white;padding:2rem;border-radius:1rem}h1{font-size:1.65rem;line-height:1.2}label,input,button{display:block}input,button{box-sizing:border-box;font:inherit;width:100%;padding:.7rem;border:1px solid #806e61;border-radius:.45rem;margin:.35rem 0 1rem}button{background:#492f24;color:white;cursor:pointer}p[role=alert]{color:#8a281a}</style>
<main><h1>Piloto de nómina</h1><p>Ingresa con la cuenta que usas en Nómina Keysar. Los cambios se guardan en la copia de pruebas.</p>${message ? `<p role="alert">${message}</p>` : ""}
<form method="post" action="/authorize"><input type="hidden" name="csrf" value="${csrf}"><label for="email">Correo de nómina</label><input id="email" name="email" type="email" autocomplete="username" required maxlength="254"><label for="password">Contraseña de nómina</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="256"><button>Ingresar al piloto</button></form></main></html>`;
}
export function registerPortalLogin(
  app: express.Express,
  db: PrismaClient | undefined,
  options: Options,
) {
  const ready = () =>
    Boolean(db && options.user && options.email && options.secret.length >= 32);
  const wrap =
    (h: RequestHandler): RequestHandler =>
    (req, res, next) => {
      Promise.resolve(h(req, res, next)).catch(next);
    };
  app.use(["/authorize", "/redeem"], (_req, res, next) => {
    res.set({
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; form-action 'self' " +
        pilotPortal +
        "; frame-ancestors 'none'; base-uri 'none'",
      "Cache-Control": "private, no-store",
    });
    if (!ready()) {
      res.sendStatus(503);
      return;
    }
    next();
  });
  app.get("/authorize", (req, res) => {
    const input = z
      .object({ state: opaque, challenge: opaque })
      .safeParse(req.query);
    if (!input.success) {
      res.redirect(303, pilotPortal + "/login");
      return;
    }
    const csrf = nonce();
    const intent = jwt.sign({ ...input.data, csrf }, options.secret, {
      algorithm: "HS256",
      issuer: "keysar-pilot-access",
      audience: "signin",
      expiresIn: "8m",
    });
    res.cookie(intentCookie, intent, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 480000,
    });
    res.type("html").send(form(csrf));
  });
  let windowStart = 0,
    attempts = 0;
  app.post(
    "/authorize",
    express.urlencoded({ extended: false, limit: "3kb" }),
    wrap(async (req, res) => {
      const input = z
        .object({
          email: z.string().email().max(254),
          password: z.string().min(1).max(256),
          csrf: opaque,
        })
        .safeParse(req.body);
      const ticket =
        req
          .get("cookie")
          ?.split(/;\s*/)
          .find((c) => c.startsWith(intentCookie + "="))
          ?.slice(intentCookie.length + 1) ?? "";
      let intent;
      try {
        intent = z
          .object({ state: opaque, challenge: opaque, csrf: opaque })
          .parse(
            jwt.verify(ticket, options.secret, {
              algorithms: ["HS256"],
              issuer: "keysar-pilot-access",
              audience: "signin",
            }),
          );
      } catch {
        res.redirect(303, pilotPortal + "/login");
        return;
      }
      if (
        !input.success ||
        req.get("origin") !== loginHost ||
        !timingSafeEqual(Buffer.from(intent.csrf), Buffer.from(input.data.csrf))
      ) {
        res.sendStatus(403);
        return;
      }
      if (
        input.data.email.trim().toLowerCase() !== options.email.toLowerCase()
      ) {
        res
          .status(401)
          .type("html")
          .send(form(intent.csrf, "Cuenta o contraseña incorrecta."));
        return;
      }
      const now = Date.now();
      if (now - windowStart >= 60000) {
        windowStart = now;
        attempts = 0;
      }
      if (++attempts > 12) {
        res
          .status(429)
          .type("html")
          .send(form(intent.csrf, "Demasiados intentos. Espera un minuto."));
        return;
      }
      let allowed: boolean;
      try {
        allowed = await (options.verify ?? verifyPortalAccount)(
          options.email,
          input.data.password,
          options.user,
        );
      } catch {
        res
          .status(503)
          .type("html")
          .send(
            form(
              intent.csrf,
              "No se pudo consultar el servicio de acceso. Vuelve a intentarlo.",
            ),
          );
        return;
      }
      if (!allowed) {
        res
          .status(401)
          .type("html")
          .send(form(intent.csrf, "Cuenta o contraseña incorrecta."));
        return;
      }
      const code = nonce();
      await db!.$transaction(async (tx) => {
        await assertIdentity(tx, options.ref);
        await tx.$executeRaw`DELETE FROM payroll_pilot.login_codes WHERE expires_at<=now()`;
        await tx.$executeRaw`INSERT INTO payroll_pilot.login_codes(code_hash,challenge,subject,expires_at) VALUES (${digest(code)},${intent.challenge},${options.user},now()+interval '90 seconds')`;
      });
      res.clearCookie(intentCookie, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
      });
      const callback = new URL("/api/piloto/callback", pilotPortal);
      callback.searchParams.set("code", code);
      callback.searchParams.set("state", intent.state);
      res.redirect(303, callback.href);
    }),
  );
  app.post(
    "/redeem",
    wrap(async (req, res) => {
      const input = z
        .object({ code: opaque, verifier: opaque })
        .strict()
        .safeParse(req.body);
      if (!input.success) {
        res.sendStatus(400);
        return;
      }
      const { code, verifier } = input.data;
      const result = await db!.$transaction(async (tx) => {
        await assertIdentity(tx, options.ref);
        return tx.$queryRaw<
          { subject: string }[]
        >`DELETE FROM payroll_pilot.login_codes WHERE code_hash=${digest(code)} AND challenge=${digest(verifier)} AND subject=${options.user} AND expires_at>now() RETURNING subject`;
      });
      if (!result[0]) {
        res.sendStatus(401);
        return;
      }
      res.json({ token: pilotSession(result[0].subject, options.secret) });
    }),
  );
}
