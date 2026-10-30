import { and, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  fiscalPeriods,
  memberships,
  monthlySnapshots,
  observations,
  organizations,
  taxSummaries,
  users,
} from "@/db/schema";

const AUTH0_USERINFO = "https://visionadvisorslatam.us.auth0.com/userinfo";

type Auth0Profile = {
  sub?: string;
  email?: string;
  name?: string;
};

function unauthorized(message = "La sesión no es válida.") {
  return NextResponse.json({ status: "unauthorized", message }, { status: 401 });
}

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return unauthorized();

  const profileResponse = await fetch(AUTH0_USERINFO, {
    headers: { authorization },
    cache: "no-store",
  });
  if (!profileResponse.ok) return unauthorized("Auth0 rechazó la sesión.");

  const profile = (await profileResponse.json()) as Auth0Profile;
  if (!profile.sub) return unauthorized("La sesión no contiene un identificador.");

  try {
    const db = getDb();
    const [portalUser] = await db
      .select()
      .from(users)
      .where(and(eq(users.identitySubject, profile.sub), eq(users.status, "active")))
      .limit(1);

    if (!portalUser) {
      return NextResponse.json({
        status: "unassigned",
        message: "El acceso está validado, pero el despacho todavía no ha asignado un expediente.",
      });
    }

    const [membership] = await db
      .select({
        organizationId: memberships.organizationId,
        legalName: organizations.legalName,
        tradeName: organizations.tradeName,
      })
      .from(memberships)
      .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
      .where(and(eq(memberships.userId, portalUser.id), eq(organizations.status, "active")))
      .limit(1);

    if (!membership) {
      return NextResponse.json({
        status: "unassigned",
        message: "La cuenta está activa, pero aún no tiene una empresa vinculada.",
      });
    }

    const [period] = await db
      .select()
      .from(fiscalPeriods)
      .where(
        and(
          eq(fiscalPeriods.organizationId, membership.organizationId),
          inArray(fiscalPeriods.status, ["published", "locked"]),
        ),
      )
      .orderBy(desc(fiscalPeriods.year), desc(fiscalPeriods.month))
      .limit(1);

    if (!period) {
      return NextResponse.json({
        status: "preparing",
        organization: { legalName: membership.legalName, tradeName: membership.tradeName },
        message: "El expediente está vinculado; el primer periodo mensual continúa en preparación.",
      });
    }

    const [snapshot, taxes, alerts] = await Promise.all([
      db.select().from(monthlySnapshots).where(eq(monthlySnapshots.periodId, period.id)).limit(1),
      db.select().from(taxSummaries).where(eq(taxSummaries.periodId, period.id)),
      db
        .select()
        .from(observations)
        .where(eq(observations.periodId, period.id))
        .orderBy(observations.sortOrder),
    ]);

    return NextResponse.json({
      status: "ready",
      organization: { legalName: membership.legalName, tradeName: membership.tradeName },
      period: { year: period.year, month: period.month, publishedAt: period.publishedAt },
      snapshot: snapshot[0] ?? null,
      taxes,
      observations: alerts,
    });
  } catch (error) {
    console.error("Portal summary error", error);
    return NextResponse.json(
      { status: "unavailable", message: "La base del portal aún no está disponible." },
      { status: 503 },
    );
  }
}
