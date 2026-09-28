import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, readSessionToken } from "../lib/auth";
import TeamPage from "./TeamPage";
import "./team.css";

// The people behind Honeycomb: the team, its advisors and its allies, on a
// page of their own (the V4 design). It sits behind the same site password as
// the archive; without a session it sends you to the gate.

export const metadata: Metadata = {
  title: "The people keeping the archive — Honeycomb",
  description: "The team that builds Honeycomb, the people who advise it, and the allies who stand with experiencers.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const session = readSessionToken((await cookies()).get(AUTH_COOKIE)?.value);
  if (!session) redirect("/");
  return <TeamPage />;
}
