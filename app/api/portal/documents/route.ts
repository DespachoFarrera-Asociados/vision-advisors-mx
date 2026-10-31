import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { documents, fiscalPeriods, memberships } from "@/db/schema";
import { getPortalUser } from "@/lib/portal-auth";

export async function GET(request: Request) {
  const user = await getPortalUser(request);
  if (!user) return NextResponse.json({ message: "Sesión no autorizada." }, { status: 401 });
  const db = getDb();
  const [membership] = await db.select({ organizationId: memberships.organizationId }).from(memberships).where(eq(memberships.userId, user.id)).limit(1);
  if (!membership) return NextResponse.json({ documents: [] });
  const rows = await db.select({
    id: documents.id,
    title: documents.title,
    category: documents.category,
    mimeType: documents.mimeType,
    sizeBytes: documents.sizeBytes,
    publishedAt: documents.publishedAt,
    periodYear: fiscalPeriods.year,
    periodMonth: fiscalPeriods.month,
  }).from(documents)
    .leftJoin(fiscalPeriods, eq(fiscalPeriods.id, documents.periodId))
    .where(and(eq(documents.organizationId, membership.organizationId), eq(documents.status, "published")))
    .orderBy(desc(documents.publishedAt));
  return NextResponse.json({ documents: rows });
}
