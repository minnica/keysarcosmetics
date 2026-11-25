import { redirect } from "next/navigation";
import FixtureLogin from "@/components/payroll/pilot-fixture-login";
export const dynamic = "force-dynamic";
export default function LoginPage() {
  if (!process.env.VERCEL && process.env.PILOT_LOCAL_TEST === "1")
    return <FixtureLogin />;
  redirect("/api/piloto/authorize");
}
