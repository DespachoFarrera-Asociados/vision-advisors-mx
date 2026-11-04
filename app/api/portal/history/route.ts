import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { documents, fiscalPeriods, memberships, monthlySnapshots, observations } from "@/db/schema";
import { getPortalUser } from "@/lib/portal-auth";

export async function GET(request: Request) {
  const user = await getPortalUser(request);
  if (!user) return NextResponse.json({ message: "Sesión no autorizada." }, { status: 401 });
  const db = getDb();
  const [membership] = await db.select({ organizationId: memberships.organizationId })
    .from(memberships).where(eq(memberships.userId, user.id)).limit(1);
  if (!membership) return NextResponse.json({ periods: [] });

  const periods = await db.select().from(fiscalPeriods).where(and(
    eq(fiscalPeriods.organizationId, membership.organizationId),
    inArray(fiscalPeriods.status, ["published", "locked"]),
  )).orderBy(desc(fiscalPeriods.year), desc(fiscalPeriods.month));

  const generalDocuments = await db.select({ id: documents.id }).from(documents).where(and(
    eq(documents.organizationId, membership.organizationId),
    eq(documents.status, "published"),
    isNull(documents.periodId),
  ));

  const history = await Promise.all(periods.map(async (period) => {
    const [snapshotRows, observationRows, documentRows] = await Promise.all([
      db.select().from(monthlySnapshots).where(eq(monthlySnapshots.periodId, period.id)).limit(1),
      db.select({ title: observations.title, detail: observations.detail }).from(observations)
        .where(eq(observations.periodId, period.id)).orderBy(observations.sortOrder),
      db.select({ id: documents.id }).from(documents)
        .where(and(eq(documents.periodId, period.id), eq(documents.status, "published"))),
    ]);
    return { id: period.id, year: period.year, month: period.month, publishedAt: period.publishedAt,
      snapshot: snapshotRows[0] ?? null, observations: observationRows,
      documentCount: documentRows.length, generalDocumentCount: generalDocuments.length };
  }));
  return NextResponse.json({ periods: history });
}
